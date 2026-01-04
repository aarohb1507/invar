// Main App - Orchestrates dashboard components

import { API } from './lib/api.js';
import { StatsComponent } from './components/stats.js';
import { RealtimeFeedComponent } from './components/realtime-feed.js';
import { ChartComponent } from './components/chart.js';

let eventSource = null;

async function init() {
  console.log('[app] initializing dashboard...');

  // Authenticate first
  try {
    await API.authenticate();
    console.log('[app] authenticated');
  } catch (err) {
    console.error('[app] auth failed:', err);
    showError('Authentication failed. Make sure the server is running.');
    return;
  }

  // Initialize components
  RealtimeFeedComponent.init();
  ChartComponent.init(document.getElementById('metricsChart'));

  // Load initial data
  await loadHistoricalData();

  // Subscribe to real-time events
  subscribeToRealtime();

  // Setup event listeners
  setupControls();
}

async function loadHistoricalData() {
  try {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 3600; // Last hour

    // Load aggregated data for chart
    const aggregateResponse = await API.aggregateMetrics({
      startTime,
      endTime,
      metric: 'cpu',
      aggregation: 'avg',
      bucketSize: 300, // 5-minute buckets
    });

    ChartComponent.render(aggregateResponse.data || []);

    // Load raw metrics for stats
    const metricsResponse = await API.queryMetrics({
      startTime,
      endTime,
      metric: 'cpu',
      limit: 100,
    });

    StatsComponent.render(metricsResponse.data);
  } catch (err) {
    console.error('[app] failed to load historical data:', err);
    showError('Failed to load historical data');
  }
}

function subscribeToRealtime() {
  console.log('[app] subscribing to realtime events...');

  eventSource = API.subscribeToLive(
    (event) => {
      // Extract payload fields
      const metric = event.payload?.metric || event.metric;
      const value = event.payload?.value || event.value;
      const server = event.payload?.server || event.server;
      const timestamp = event.payload?.timestamp || event.timestamp;

      RealtimeFeedComponent.addEvent({
        metric,
        value,
        server,
        timestamp,
      });

      RealtimeFeedComponent.setConnected(true);
      hideError();
    },
    (err) => {
      console.error('[app] realtime error:', err);
      RealtimeFeedComponent.setConnected(false);
      showError('Real-time connection lost');
    }
  );
}

function setupControls() {
  const refreshBtn = document.getElementById('refreshBtn');
  const metricSelect = document.getElementById('metricSelect');
  const clearBtn = document.getElementById('clearBtn');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadHistoricalData);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      RealtimeFeedComponent.clear();
    });
  }

  // Load available metrics
  loadAvailableMetrics();
}

async function loadAvailableMetrics() {
  try {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 86400; // Last 24 hours

    const response = await API.getAvailableMetrics({ startTime, endTime });
    const metricSelect = document.getElementById('metricSelect');

    if (response.data && response.data.metrics && metricSelect) {
      const metrics = response.data.metrics;
      metricSelect.innerHTML = metrics
        .map((m) => `<option value="${m}">${m}</option>`)
        .join('');
    }
  } catch (err) {
    console.error('[app] failed to load available metrics:', err);
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

function hideError() {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

// Start the app
init().catch(console.error);
