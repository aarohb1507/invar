/**
 * Main App - Orchestrates dashboard components
 * Redesigned for recruiter-impressive demo
 */

import { API } from './lib/api.js';
import { SummaryCards } from './components/summary-cards.js';
import { Charts } from './components/charts.js';
import { Controls } from './components/controls.js';
import { HistoryTable } from './components/history-table.js';
import { EventFeed } from './components/event-feed.js';

let eventSource = null;

async function init() {
  console.log('[app] initializing dashboard...');

  // Authenticate first
  try {
    await API.authenticate();
    console.log('[app] authenticated');
  } catch (err) {
    console.error('[app] auth failed:', err);
    alert('Authentication failed. Please refresh and enter a valid API key.');
    return;
  }

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
