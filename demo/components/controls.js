/**
 * Controls Component
 * Handles simulation buttons (Start, Inject Error, Query History)
 */

import { API } from '../lib/api.js';
import { HistoryTable } from './history-table.js';
import { EventFeed } from './event-feed.js';

class ControlsComponent {
    constructor() {
        this.isSimulating = false;
        this.isErrorInjectionEnabled = false;
        this.cachedHistoryRows = [];
        this.hasHistoryCache = false;
        this.elements = {
            startSimBtn: document.getElementById('startSimBtn'),
            injectErrorBtn: document.getElementById('injectErrorBtn'),
            queryHistoryBtn: document.getElementById('queryHistoryBtn'),
            refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
        };
    }

    init() {
        this.setupEventListeners();
        this.checkSimulationStatus();
        this.updateQueryHistoryButton(false);
    }

    setupEventListeners() {
        // Start/Stop Simulation
        this.elements.startSimBtn?.addEventListener('click', () => {
            this.toggleSimulation();
        });

        // Toggle Error Injection
        this.elements.injectErrorBtn?.addEventListener('click', () => {
            this.toggleErrorInjection();
        });

        // Query History
        this.elements.queryHistoryBtn?.addEventListener('click', () => {
            this.toggleHistoryPanel();
        });

        // Refresh History Data
        this.elements.refreshHistoryBtn?.addEventListener('click', () => {
            this.refreshHistoryData();
        });

        // Keep button state in sync when panel is closed by the X button
        window.addEventListener('history:visibility-change', (event) => {
            this.updateQueryHistoryButton(event.detail?.isVisible || false);
        });
    }

    /**
     * Check if simulation is already running (on page load)
     */
    async checkSimulationStatus() {
        try {
            const response = await API.getSimulationStatus();
            this.isSimulating = response.isSimulating;
            this.isErrorInjectionEnabled = response.errorInjectionMode || false;
            this.updateSimulationButton();
            this.updateErrorInjectionButton();
        } catch (err) {
            console.error('[controls] error checking simulation status:', err.message);
        }
    }

    /**
     * Toggle simulation on/off
     */
    async toggleSimulation() {
        try {
            this.elements.startSimBtn.disabled = true;

            if (this.isSimulating) {
                // Stop simulation
                await API.stopSimulation();
                this.isSimulating = false;
                EventFeed.addInfoEvent('Simulation stopped');
            } else {
                // Start simulation
                await API.startSimulation();
                this.isSimulating = true;
                EventFeed.addInfoEvent('Simulation started - generating metrics at 10 events/sec');
            }

            this.updateSimulationButton();
        } catch (err) {
            console.error('[controls] error toggling simulation:', err.message);
            alert('Failed to toggle simulation: ' + err.message);
        } finally {
            this.elements.startSimBtn.disabled = false;
        }
    }

    /**
     * Update button text based on simulation state
     */
    updateSimulationButton() {
        if (!this.elements.startSimBtn) return;

        const textEl = this.elements.startSimBtn.querySelector('.btn__text');
        const iconEl = this.elements.startSimBtn.querySelector('.btn__icon');

        if (this.isSimulating) {
            textEl.textContent = 'Stop Simulation';
            iconEl.textContent = 'STOP';
        } else {
            textEl.textContent = 'Start Simulation';
            iconEl.textContent = 'RUN';
        }
    }

    /**
     * Toggle error injection on/off
     */
    async toggleErrorInjection() {
        try {
            this.elements.injectErrorBtn.disabled = true;

            if (this.isErrorInjectionEnabled) {
                // Disable error injection
                await API.disableErrorInjection();
                this.isErrorInjectionEnabled = false;
                EventFeed.addInfoEvent('Error injection disabled - metrics back to normal');
                this.showToast('✅ Error injection disabled', 'info');
            } else {
                // Enable error injection
                await API.injectError();
                this.isErrorInjectionEnabled = true;
                EventFeed.addWarningEvent('Error injection enabled - 50% of metrics will fail');
                this.showToast('⚠️ Error injection enabled! Watch the backlog grow.', 'warning');
            }

            this.updateErrorInjectionButton();
        } catch (err) {
            console.error('[controls] error toggling error injection:', err.message);
            alert('Failed to toggle error injection: ' + err.message);
        } finally {
            this.elements.injectErrorBtn.disabled = false;
        }
    }

    /**
     * Update error injection button text based on state
     */
    updateErrorInjectionButton() {
        if (!this.elements.injectErrorBtn) return;

        const textEl = this.elements.injectErrorBtn.querySelector('.btn__text');
        const iconEl = this.elements.injectErrorBtn.querySelector('.btn__icon');

        if (this.isErrorInjectionEnabled) {
            textEl.textContent = 'Disable Errors';
            iconEl.textContent = 'SAFE';
            this.elements.injectErrorBtn.classList.add('btn--active');
        } else {
            textEl.textContent = 'Enable Errors';
            iconEl.textContent = 'ERR';
            this.elements.injectErrorBtn.classList.remove('btn--active');
        }
    }

    /**
     * Toggle history panel open/close using cached rows
     */
    toggleHistoryPanel() {
        if (HistoryTable.isVisible()) {
            HistoryTable.hide();
            this.updateQueryHistoryButton(false);
            return;
        }

        if (!this.hasHistoryCache) {
            HistoryTable.show([], {
                emptyText: 'No cached query yet. Click "Refresh History" to load latest rows.',
            });
            EventFeed.addInfoEvent('Opened query panel with cached view (no refresh yet)');
            this.updateQueryHistoryButton(true);
            return;
        }

        HistoryTable.show(this.cachedHistoryRows);
        EventFeed.addInfoEvent(`Opened cached query panel (${this.cachedHistoryRows.length} rows)`);
        this.updateQueryHistoryButton(true);
    }

    /**
     * Fetch latest history from Postgres and refresh cache + panel
     */
    async refreshHistoryData() {
        try {
            this.elements.refreshHistoryBtn.disabled = true;

            const endTime = Date.now();
            const startTime = endTime - 3600 * 1000; // Last hour (ms)

            // Query all metrics (not filtered by type)
            const metrics = ['cpu', 'memory', 'disk'];
            const allResults = [];

            for (const metric of metrics) {
                try {
                    const response = await API.queryMetrics({
                        startTime,
                        endTime,
                        metric,
                        limit: 50,
                    });

                    const rows = response?.data?.rows || [];
                    if (rows.length > 0) {
                        allResults.push(...rows);
                    }
                } catch (err) {
                    console.warn(`[controls] failed to query ${metric}:`, err.message);
                }
            }

            // Sort by timestamp descending
            allResults.sort((a, b) => b.timestamp - a.timestamp);

            // Take top 100
            const top100 = allResults.slice(0, 100);

            // Store in browser memory cache
            this.cachedHistoryRows = top100;
            this.hasHistoryCache = true;

            // Refresh visible panel with latest result
            HistoryTable.show(this.cachedHistoryRows);
            this.updateQueryHistoryButton(true);
            EventFeed.addInfoEvent(`Refreshed query history (${top100.length} rows from Postgres)`);

        } catch (err) {
            console.error('[controls] error querying history:', err.message);
            alert('Failed to query history: ' + err.message);
        } finally {
            this.elements.refreshHistoryBtn.disabled = false;
        }
    }

    /**
     * Update query history button text based on panel state
     */
    updateQueryHistoryButton(isOpen = false) {
        if (!this.elements.queryHistoryBtn) return;

        const textEl = this.elements.queryHistoryBtn.querySelector('.btn__text');
        const iconEl = this.elements.queryHistoryBtn.querySelector('.btn__icon');
        const tooltipEl = this.elements.queryHistoryBtn.querySelector('.btn__tooltip');

        if (isOpen) {
            textEl.textContent = 'Close History';
            iconEl.textContent = 'HIDE';
            tooltipEl.textContent = 'Hide query panel (cached rows stay in memory)';
            this.elements.queryHistoryBtn.classList.add('btn--active');
            return;
        }

        textEl.textContent = 'Query History';
        iconEl.textContent = 'SQL';
        tooltipEl.textContent = this.hasHistoryCache
            ? 'Open query panel with cached rows'
            : 'Open query panel (refresh to fetch latest rows)';
        this.elements.queryHistoryBtn.classList.remove('btn--active');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${type === 'warning' ? '#f59e0b' : '#111827'};
      color: ${type === 'warning' ? '#111827' : '#e5e7eb'};
      border: 1px solid ${type === 'warning' ? '#f59e0b' : '#1f2937'};
      padding: 14px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      z-index: 1000;
    `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

export const Controls = new ControlsComponent();
