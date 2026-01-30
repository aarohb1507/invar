/**
 * Event Feed Component
 * Real-time event feed with colored status indicators
 */

class EventFeedComponent {
    constructor() {
        this.elements = {
            feed: document.getElementById('eventFeed'),
            clearBtn: document.getElementById('clearFeedBtn'),
        };

        this.events = [];
        this.maxEvents = 25;
    }

    init() {
        this.elements.clearBtn?.addEventListener('click', () => {
            this.clear();
        });
    }

    /**
     * Handle incoming real-time event from SSE
     */
    onRealtimeEvent(event) {
        const metric = event.payload?.metric || event.metric;
        const value = event.payload?.value || event.value;
        const server = event.payload?.server || event.server;
        const timestamp = event.payload?.timestamp || event.timestamp;

        if (!metric || value === undefined) return;

        // Determine status based on value
        let status = 'info';
        if (value > 80) {
            status = 'warning';
        } else if (value > 95) {
            status = 'error';
        }

        this.addEvent({
            type: metric,
            value: value + '%',
            server: server || 'unknown',
            timestamp,
            status,
        });
    }

    /**
     * Add event to feed
     */
    addEvent({ type, value, server, timestamp, status }) {
        const now = Date.now();

        this.events.unshift({
            type,
            value,
            server,
            timestamp: timestamp ? timestamp * 1000 : now,
            status: status || 'info',
            addedAt: now,
        });

        // Trim to max events
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(0, this.maxEvents);
        }

        this.render();
    }

    /**
     * Add info event (system message)
     */
    addInfoEvent(message) {
        this.addEvent({
            type: 'INFO',
            value: message,
            server: 'system',
            status: 'info',
        });
    }

    /**
     * Add warning event
     */
    addWarningEvent(message) {
        this.addEvent({
            type: 'WARNING',
            value: message,
            server: 'system',
            status: 'warning',
        });
    }

    /**
     * Add error event
     */
    addErrorEvent(message) {
        this.addEvent({
            type: 'ERROR',
            value: message,
            server: 'system',
            status: 'error',
        });
    }

    /**
     * Render event feed
     */
    render() {
        if (!this.elements.feed) return;

        if (this.events.length === 0) {
            this.elements.feed.innerHTML = '<div class="feed__empty">Waiting for events...</div>';
            return;
        }

        this.elements.feed.innerHTML = this.events.map(event => {
            const timeAgo = this.getTimeAgo(event.timestamp);

            return `
        <div class="feed__event">
          <div class="feed__dot feed__dot--${event.status}"></div>
          <div class="feed__metric">${event.type}</div>
          <div class="feed__value">${event.value}</div>
          <div class="feed__server">${event.server}</div>
          <div class="feed__time">${timeAgo}</div>
        </div>
      `;
        }).join('');
    }

    /**
     * Calculate relative time ("2s ago")
     */
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 1000);

        if (diff < 10) return 'just now';
        if (diff < 60) return diff + 's ago';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        return Math.floor(diff / 3600) + 'h ago';
    }

    /**
     * Clear all events
     */
    clear() {
        this.events = [];
        this.render();
    }

    /**
     * Start auto-refresh for relative timestamps
     */
    startAutoRefresh() {
        setInterval(() => {
            if (this.events.length > 0) {
                this.render();
            }
        }, 10000); // Refresh every 10 seconds
    }
}

export const EventFeed = new EventFeedComponent();

// Start auto-refresh on load
EventFeed.startAutoRefresh();
