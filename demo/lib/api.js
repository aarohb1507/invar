// API Client - Handles all requests to Invar backend with cookie auth

export const API = {
  baseUrl: 'http://localhost:3000/v1',

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

  // Authenticate and set cookie
  async authenticate() {
    const response = await fetch(`${this.baseUrl}/auth/session`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'wq189pVNe9S5UueiA6Vy6nc//0giEH33YdoAf0OxeUk=',
      },
      credentials: 'include', // Accept cookies
    });

    if (!response.ok) {
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
