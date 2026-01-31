/**
 * Main App - Orchestrates dashboard components
 * Redesigned for recruiter-impressive demo
 * Demo Mode: No authentication required
 */

import { API } from './lib/api.js';
import { SummaryCards } from './components/summary-cards.js';
import { Charts } from './components/charts.js';
import { Controls } from './components/controls.js';
import { HistoryTable } from './components/history-table.js';
import { EventFeed } from './components/event-feed.js';

let eventSource = null;

async function init() {
  console.log('[app] initializing dashboard in demo mode...');

  // Skip authentication for demo mode
  // In production, you would call: await API.authenticate();

  // Initialize components
  SummaryCards.init();
  Charts.init();
  Controls.init();
  HistoryTable.init();
  EventFeed.init();

  // Subscribe to real-time events
  subscribeToRealtime();

  console.log('[app] dashboard ready');
}

/**
 * Subscribe to real-time SSE events with auto-reconnection
 */
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000; // 30 seconds max

function subscribeToRealtime() {
  console.log('[app] subscribing to realtime events...');
  reconnectAttempts = 0;

  eventSource = API.subscribeToLive(
    (event) => {
      // Reset reconnect attempts on successful message
      reconnectAttempts = 0;
      // Route event to components
      Charts.onRealtimeEvent(event);
      EventFeed.onRealtimeEvent(event);
    },
    (err) => {
      console.error('[app] realtime error:', err);
      EventFeed.addErrorEvent('Real-time connection lost - reconnecting...');

      // Auto-reconnect with exponential backoff
      reconnectAttempts++;
      const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
      console.log(`[app] will retry SSE connection in ${delay}ms (attempt ${reconnectAttempts})`);

      setTimeout(() => {
        console.log('[app] attempting SSE reconnection...');
        subscribeToRealtime();
      }, delay);
    }
  );
}

// Start the app
init().catch(console.error);
