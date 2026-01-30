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
 * Subscribe to real-time SSE events
 */
function subscribeToRealtime() {
  console.log('[app] subscribing to realtime events...');

  eventSource = API.subscribeToLive(
    (event) => {
      // Route event to components
      Charts.onRealtimeEvent(event);
      EventFeed.onRealtimeEvent(event);
    },
    (err) => {
      console.error('[app] realtime error:', err);
      EventFeed.addErrorEvent('Real-time connection lost');
    }
  );
}

// Start the app
init().catch(console.error);
