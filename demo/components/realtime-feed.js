// Realtime Feed Component - Display live events

export const RealtimeFeedComponent = {
  element: document.getElementById('realtimeFeed'),
  maxEvents: 50,
  events: [],

  init() {
    this.element.innerHTML = `
      <div class="status">
        <div class="status-dot"></div>
        <div class="status-text">Connecting to real-time stream...</div>
        <div class="status-count">0 events</div>
      </div>
    `;
  },

  setConnected(connected) {
    const dot = this.element.querySelector('.status-dot');
    if (dot) {
      if (connected) {
        dot.classList.add('connected');
        this.element.querySelector('.status-text').textContent = 'Connected to real-time stream';
      } else {
        dot.classList.remove('connected');
        this.element.querySelector('.status-text').textContent = 'Disconnected from stream';
      }
    }
  },

  addEvent(metric) {
    this.events.unshift(metric);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
    this.render();
  },

  render() {
    const statusBar = `
      <div class="status">
        <div class="status-dot connected"></div>
        <div class="status-text">Connected to real-time stream</div>
        <div class="status-count">${this.events.length} recent events</div>
      </div>
    `;

    const eventsHtml = this.events
      .map(
        (event) => `
        <div class="metric-event">
          <div class="metric-name">${event.metric || 'N/A'}</div>
          <div class="metric-value">${parseFloat(event.value).toFixed(2)}</div>
          <div class="metric-server">${event.server || 'N/A'}</div>
          <div class="metric-time">${new Date(event.timestamp * 1000).toLocaleTimeString()}</div>
        </div>
      `
      )
      .join('');

    this.element.innerHTML = statusBar + eventsHtml;
  },

  clear() {
    this.events = [];
    this.init();
  },
};
