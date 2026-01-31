// API Client - Handles all requests to Invar backend with cookie auth

export const API = {
  baseUrl: '/v1',

  // Get historical metrics from Postgres
  async queryMetrics({ startTime, endTime, metric, limit = 100, offset = 0 }) {
    const params = new URLSearchParams({
      startTime,
      endTime,
      metric,
      limit,
      offset,
    });

    const response = await fetch(`${this.baseUrl}/metrics?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send cookies
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.status}`);
    }

    return response.json();
  },

  // Get aggregated metrics (avg/max/min/sum per hour)
  async aggregateMetrics({ startTime, endTime, metric, aggregation = 'avg', bucketSize = 3600 }) {
    const params = new URLSearchParams({
      startTime,
      endTime,
      metric,
      aggregation,
      bucketSize,
    });

    const response = await fetch(`${this.baseUrl}/metrics/aggregate?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Aggregate failed: ${response.status}`);
    }

    return response.json();
  },

  // Get available metrics (for dropdown filters)
  async getAvailableMetrics({ startTime, endTime }) {
    const params = new URLSearchParams({ startTime, endTime });

    const response = await fetch(`${this.baseUrl}/metrics/available?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Get available metrics failed: ${response.status}`);
    }

    return response.json();
  },

  // Get dashboard stats (NEW)
  async getDashboardStats() {
    const response = await fetch(`${this.baseUrl}/metrics/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Get stats failed: ${response.status}`);
    }

    return response.json();
  },

  // Start simulation (NEW)
  async startSimulation() {
    const response = await fetch(`${this.baseUrl}/ingest/simulate/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Start simulation failed: ${response.status}`);
    }

    return response.json();
  },

  // Stop simulation (NEW)
  async stopSimulation() {
    const response = await fetch(`${this.baseUrl}/ingest/simulate/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Stop simulation failed: ${response.status}`);
    }

    return response.json();
  },

  // Get simulation status (NEW)
  async getSimulationStatus() {
    const response = await fetch(`${this.baseUrl}/ingest/simulate/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Get simulation status failed: ${response.status}`);
    }

    return response.json();
  },

  // Inject error (Enable error injection)
  async injectError() {
    const response = await fetch(`${this.baseUrl}/ingest/simulate/error/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Inject error failed: ${response.status}`);
    }

    return response.json();
  },

  // Disable error injection
  async disableErrorInjection() {
    const response = await fetch(`${this.baseUrl}/ingest/simulate/error/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Disable error injection failed: ${response.status}`);
    }

    return response.json();
  },

  // Authenticate and set cookie
  async authenticate() {
    // Get API key from prompt or localStorage
    let apiKey = localStorage.getItem('invar_api_key');

    if (!apiKey) {
      apiKey = prompt('Enter your Invar API key:');
      if (!apiKey) {
        throw new Error('API key required');
      }
      localStorage.setItem('invar_api_key', apiKey);
    }

    const response = await fetch(`${this.baseUrl}/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      credentials: 'include', // Accept cookies
    });

    if (!response.ok) {
      localStorage.removeItem('invar_api_key');
      throw new Error(`Authentication failed: ${response.status}`);
    }

    return response.json();
  },

  // SSE EventSource for real-time events
  subscribeToLive(onMessage, onError) {
    const eventSource = new EventSource(`${this.baseUrl}/metrics/live`, {
      withCredentials: true, // Send cookies with EventSource
    });

    eventSource.addEventListener('open', () => {
      console.log('[api] SSE connected to /v1/metrics/live');
    });

    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('[api] parse error:', err);
      }
    });

    eventSource.addEventListener('error', (event) => {
      console.error('[api] SSE error:', event);
      onError?.(event);
      eventSource.close();
    });

    return eventSource;
  },
};
