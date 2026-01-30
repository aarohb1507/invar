/**
 * Charts Component
 * Dual chart layout: Real-time (hot path) + Backlog (cold path)
 */

import { API } from '../lib/api.js';

class ChartsComponent {
    constructor() {
        this.realtimeChart = null;
        this.backlogChart = null;
        this.selectedMetric = 'cpu';

        // Real-time chart data (ring buffer of 60 points = 1 minute)
        this.realtimeData = {
            cpu: [],
            memory: [],
            disk: [],
        };

        // Backlog chart data
        this.backlogData = [];
        this.maxDataPoints = 60;
    }

    init() {
        this.initRealtimeChart();
        this.initBacklogChart();
        this.setupTabs();
        this.startBacklogPolling();
    }

    /**
     * Initialize real-time streaming chart (hot path)
     */
    initRealtimeChart() {
        const ctx = document.getElementById('realtimeChart');
        if (!ctx) return;

        this.realtimeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPU Usage',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 300,
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                        },
                        ticks: {
                            color: '#94a3b8',
                            maxTicksLimit: 10,
                        },
                    },
                    y: {
                        display: true,
                        min: 0,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                        },
                        ticks: {
                            color: '#94a3b8',
                            callback: (value) => value + '%',
                        },
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(96, 165, 250, 0.3)',
                        borderWidth: 1,
                    },
                },
            },
        });
    }

    /**
     * Initialize backlog chart (cold path)
     */
    initBacklogChart() {
        const ctx = document.getElementById('backlogChart');
        if (!ctx) return;

        this.backlogChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Pending Messages',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0, // Disable animation for smoother updates
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                        },
                        ticks: {
                            color: '#94a3b8',
                            maxTicksLimit: 10,
                        },
                    },
                    y: {
                        display: true,
                        min: 0,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                        },
                        ticks: {
                            color: '#94a3b8',
                        },
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(96, 165, 250, 0.3)',
                        borderWidth: 1,
                    },
                },
            },
        });
    }

    /**
     * Setup metric tabs (CPU, Memory, Disk)
     */
    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const metric = tab.dataset.metric;
                this.switchMetric(metric);

                // Update active state
                tabs.forEach(t => t.classList.remove('tab--active'));
                tab.classList.add('tab--active');
            });
        });
    }

    /**
     * Switch between CPU/Memory/Disk
     */
    switchMetric(metric) {
        this.selectedMetric = metric;
        this.updateRealtimeChart();
    }

    /**
     * Handle incoming real-time event from SSE
     */
    onRealtimeEvent(event) {
        const metric = event.payload?.metric || event.metric;
        const value = event.payload?.value || event.value;
        const timestamp = event.payload?.timestamp || event.timestamp;

        if (!metric || value === undefined) return;

        // Add to appropriate ring buffer
        if (this.realtimeData[metric]) {
            this.realtimeData[metric].push({
                time: new Date(timestamp * 1000).toLocaleTimeString(),
                value: parseFloat(value),
            });

            // Trim to max data points
            if (this.realtimeData[metric].length > this.maxDataPoints) {
                this.realtimeData[metric].shift();
            }

            // Update chart if this is the selected metric
            if (metric === this.selectedMetric) {
                this.updateRealtimeChart();
            }
        }
    }

    /**
     * Update real-time chart with current data
     */
    updateRealtimeChart() {
        if (!this.realtimeChart) return;

        const data = this.realtimeData[this.selectedMetric] || [];

        this.realtimeChart.data.labels = data.map(d => d.time);
        this.realtimeChart.data.datasets[0].data = data.map(d => d.value);
        this.realtimeChart.data.datasets[0].label =
            this.selectedMetric.charAt(0).toUpperCase() + this.selectedMetric.slice(1) + ' Usage';

        this.realtimeChart.update('none'); // Update without animation
    }

    /**
     * Poll for backlog stats and update chart
     */
    startBacklogPolling() {
        this.updateBacklogChart();
        setInterval(() => this.updateBacklogChart(), 2000);
    }

    async updateBacklogChart() {
        try {
            const response = await API.getDashboardStats();
            const pending = response.data.pendingMessages;

            // Add to backlog data
            this.backlogData.push({
                time: new Date().toLocaleTimeString(),
                value: pending,
            });

            // Trim to max data points
            if (this.backlogData.length > this.maxDataPoints) {
                this.backlogData.shift();
            }

            // Update chart
            if (this.backlogChart) {
                this.backlogChart.data.labels = this.backlogData.map(d => d.time);
                this.backlogChart.data.datasets[0].data = this.backlogData.map(d => d.value);

                // Change color based on backlog size
                const color = pending > 50 ? '#ef4444' : '#3b82f6';
                this.backlogChart.data.datasets[0].borderColor = color;
                this.backlogChart.data.datasets[0].backgroundColor =
                    pending > 50 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';

                this.backlogChart.update('none');
            }
        } catch (err) {
            console.error('[charts] error updating backlog:', err.message);
        }
    }
}

export const Charts = new ChartsComponent();
