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
        this.elements = {
            startSimBtn: document.getElementById('startSimBtn'),
            injectErrorBtn: document.getElementById('injectErrorBtn'),
            queryHistoryBtn: document.getElementById('queryHistoryBtn'),
        };
    }

    init() {
        this.setupEventListeners();
        this.checkSimulationStatus();
    }

    setupEventListeners() {
        // Start/Stop Simulation
        this.elements.startSimBtn?.addEventListener('click', () => {
            this.toggleSimulation();
        });

        // Inject Error
        this.elements.injectErrorBtn?.addEventListener('click', () => {
            this.handleInjectError();
        });

        // Query History
        this.elements.queryHistoryBtn?.addEventListener('click', () => {
            this.handleQueryHistory();
        });
    }

    /**
     * Check if simulation is already running (on page load)
     */
    async checkSimulationStatus() {
        try {
            const response = await API.getSimulationStatus();
            this.isSimulating = response.isSimulating;
            this.updateSimulationButton();
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
            iconEl.textContent = '⏹️';
        } else {
            textEl.textContent = 'Start Simulation';
            iconEl.textContent = '▶️';
        }
    }

    /**
     * Inject error into worker
     */
    async handleInjectError() {
        try {
            this.elements.injectErrorBtn.disabled = true;

            await API.injectError();
            EventFeed.addWarningEvent('Error injected - worker will retry processing');

            // Show user feedback
            this.showToast('⚠️ Error injected! Watch the backlog chart grow.', 'warning');

        } catch (err) {
            console.error('[controls] error injecting error:', err.message);
            alert('Failed to inject error: ' + err.message);
        } finally {
            this.elements.injectErrorBtn.disabled = false;
        }
    }

    /**
     * Query history from Postgres and show table
     */
    async handleQueryHistory() {
        try {
            this.elements.queryHistoryBtn.disabled = true;

            const endTime = Math.floor(Date.now() / 1000);
            const startTime = endTime - 3600; // Last hour

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

                    if (response.data && response.data.rows) {
                        allResults.push(...response.data.rows);
                    }
                } catch (err) {
                    console.warn(`[controls] failed to query ${metric}:`, err.message);
                }
            }

            // Sort by timestamp descending
            allResults.sort((a, b) => b.timestamp - a.timestamp);

            // Take top 100
            const top100 = allResults.slice(0, 100);

            // Show in history table
            HistoryTable.show(top100);

            EventFeed.addInfoEvent(`Queried ${top100.length} metrics from Postgres`);

        } catch (err) {
            console.error('[controls] error querying history:', err.message);
            alert('Failed to query history: ' + err.message);
        } finally {
            this.elements.queryHistoryBtn.disabled = false;
        }
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
      background: ${type === 'warning' ? '#f59e0b' : '#10b981'};
      color: white;
      padding: 16px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

export const Controls = new ControlsComponent();
