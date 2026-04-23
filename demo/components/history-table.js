/**
 * History Table Component
 * Collapsible table showing query results from Postgres
 */

class HistoryTableComponent {
    constructor() {
        this.elements = {
            panel: document.getElementById('historyPanel'),
            tableBody: document.getElementById('historyTableBody'),
            closeBtn: document.getElementById('closeHistoryBtn'),
        };
    }

    init() {
        this.elements.closeBtn?.addEventListener('click', () => {
            this.hide();
        });
    }

    /**
     * Show history panel with data
     */
    show(rows, options = {}) {
        if (!this.elements.panel || !this.elements.tableBody) return;
        const emptyText = options.emptyText || 'No data found';

        // Clear existing rows
        this.elements.tableBody.innerHTML = '';

        if (!rows || rows.length === 0) {
            this.elements.tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="table__empty">${emptyText}</td>
        </tr>
      `;
        } else {
            // Populate table
            rows.forEach(row => {
                const tr = document.createElement('tr');

                // Format timestamp
                const timestamp = new Date(row.timestamp * 1000).toLocaleString();

                // Extract data from payload
                const metric = row.payload?.metric || 'unknown';
                const value = row.payload?.value || 0;
                const server = row.payload?.server || 'unknown';
                const streamId = row.stream_id || 'N/A';

                tr.innerHTML = `
          <td>${timestamp}</td>
          <td><strong>${metric.toUpperCase()}</strong></td>
          <td>${value}%</td>
          <td>${server}</td>
                <td><code style="font-size: 11px; color: #9ca3af;">${streamId.substring(0, 20)}...</code></td>
        `;

                this.elements.tableBody.appendChild(tr);
            });
        }

        // Show panel
        this.elements.panel.style.display = 'block';
        window.dispatchEvent(new CustomEvent('history:visibility-change', { detail: { isVisible: true } }));
    }

    /**
     * Hide history panel
     */
    hide() {
        if (this.elements.panel) {
            this.elements.panel.style.display = 'none';
            window.dispatchEvent(new CustomEvent('history:visibility-change', { detail: { isVisible: false } }));
        }
    }

    /**
     * Check whether panel is currently visible
     */
    isVisible() {
        if (!this.elements.panel) return false;
        return this.elements.panel.style.display !== 'none';
    }
}

export const HistoryTable = new HistoryTableComponent();
