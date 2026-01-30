/**
 * Summary Cards Component
 * Displays top 4 animated metric cards
 */

import { API } from '../lib/api.js';

class SummaryCardsComponent {
    constructor() {
        this.elements = {
            ingestionRate: document.getElementById('ingestionRate'),
            pendingMessages: document.getElementById('pendingMessages'),
            workerStatus: document.getElementById('workerStatus'),
            coldStorageWrites: document.getElementById('coldStorageWrites'),
        };

        this.currentValues = {
            ingestionRate: 0,
            pendingMessages: 0,
            workerStatus: 'OK',
            coldStorageWrites: 0,
        };

        this.refreshInterval = null;
    }

    init() {
        // Start polling for stats every 2 seconds
        this.refresh();
        this.refreshInterval = setInterval(() => this.refresh(), 2000);
    }

    async refresh() {
        try {
            const response = await API.getDashboardStats();
            const stats = response.data;

            // Animate ingestion rate
            this.animateValue(
                this.elements.ingestionRate,
                this.currentValues.ingestionRate,
                stats.ingestionRate
            );
            this.currentValues.ingestionRate = stats.ingestionRate;

            // Animate pending messages
            this.animateValue(
                this.elements.pendingMessages,
                this.currentValues.pendingMessages,
                stats.pendingMessages
            );
            this.currentValues.pendingMessages = stats.pendingMessages;

            // Update worker status (no animation)
            this.updateWorkerStatus(stats.workerStatus);
            this.currentValues.workerStatus = stats.workerStatus;

            // Animate cold storage writes
            this.animateValue(
                this.elements.coldStorageWrites,
                this.currentValues.coldStorageWrites,
                stats.coldStorageWrites
            );
            this.currentValues.coldStorageWrites = stats.coldStorageWrites;

        } catch (err) {
            console.error('[summary] error fetching stats:', err.message);
        }
    }

    /**
     * Animate number change using requestAnimationFrame
     */
    animateValue(element, start, end, duration = 500) {
        if (start === end || !element) return;

        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const value = Math.floor(start + (end - start) * easeOut);

            element.textContent = value;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = end; // Ensure final value is exact
            }
        };

        requestAnimationFrame(update);
    }

    /**
     * Update worker status with color coding
     */
    updateWorkerStatus(status) {
        if (!this.elements.workerStatus) return;

        this.elements.workerStatus.textContent = status;
        this.elements.workerStatus.setAttribute('data-status', status);
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

export const SummaryCards = new SummaryCardsComponent();
