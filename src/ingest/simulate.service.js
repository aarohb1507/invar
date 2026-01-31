/**
 * Simulation Service - Generate mock metrics for demo
 * 
 * Provides three mock metric types:
 * - CPU: Random walk between 20-80%
 * - Memory: Random walk between 30-90%
 * - Disk: Random walk between 10-70%
 */

import { ingestMetric } from './ingest.service.js';
import { State } from '../lib/state.js';

let simulationInterval = null;

// State for random walk
const metricState = {
    cpu: 50,
    memory: 60,
    disk: 40,
};

const servers = ['server-01', 'server-02', 'server-03'];

/**
 * Generate realistic metric value using random walk
 */
function randomWalk(current, min, max, volatility = 5) {
    const change = (Math.random() - 0.5) * volatility;
    const newValue = current + change;
    return Math.max(min, Math.min(max, newValue));
}

/**
 * Generate a single mock metric event
 */
function generateMetric() {
    const metricTypes = ['cpu', 'memory', 'disk'];
    const metric = metricTypes[Math.floor(Math.random() * metricTypes.length)];
    const server = servers[Math.floor(Math.random() * servers.length)];

    // Update state with random walk
    if (metric === 'cpu') {
        metricState.cpu = randomWalk(metricState.cpu, 20, 80);
    } else if (metric === 'memory') {
        metricState.memory = randomWalk(metricState.memory, 30, 90);
    } else if (metric === 'disk') {
        metricState.disk = randomWalk(metricState.disk, 10, 70);
    }

    return {
        metric,
        value: Math.round(metricState[metric] * 10) / 10,
        server,
        timestamp: Math.floor(Date.now() / 1000),
    };
}

/**
 * Start simulation (generates metrics at configurable rate)
 */
export function startSimulation() {
    if (State.isSimulating()) {
        return { success: false, error: 'Simulation already running' };
    }

    // Get simulation rate from env (default 500ms = 2 events/sec)
    const rateMs = parseInt(process.env.SIMULATION_RATE_MS) || 500;
    const eventsPerSec = (1000 / rateMs).toFixed(1);

    console.log(`[simulate] starting metric generation at ${eventsPerSec} events/sec...`);
    State.setSimulating(true);

    simulationInterval = setInterval(async () => {
        const payload = generateMetricWithPossibleError();
        await ingestMetric(payload);
        State.incrementEventCount();
    }, rateMs);

    return {
        success: true,
        message: `Simulation started at ${eventsPerSec} events/sec`
    };
}

/**
 * Stop simulation
 */
export function stopSimulation() {
    if (!State.isSimulating()) {
        return { success: false, error: 'No simulation running' };
    }

    console.log('[simulate] stopping metric generation...');
    clearInterval(simulationInterval);
    simulationInterval = null;
    State.setSimulating(false);

    return { success: true, message: 'Simulation stopped' };
}

/**
 * Get simulation status
 */
export function getSimulationStatus() {
    return {
        isSimulating: State.isSimulating(),
        errorInjectionMode: State.isErrorInjectionEnabled(),
        stats: State.getStats(),
    };
}

/**
 * Enable error injection mode
 * This will cause 50% of events to be malformed, creating backlog
 */
export function enableErrorInjection() {
    console.log('[simulate] enabling error injection mode...');
    State.enableErrorInjection();

    return {
        success: true,
        message: 'Error injection enabled - 50% of events will fail'
    };
}

/**
 * Disable error injection mode
 */
export function disableErrorInjection() {
    console.log('[simulate] disabling error injection mode...');
    State.disableErrorInjection();

    return {
        success: true,
        message: 'Error injection disabled'
    };
}

/**
 * Modified generateMetric to inject errors when enabled
 * This is called from the simulation interval
 * @private
 */
function generateMetricWithPossibleError() {
    // If error injection is enabled, 50% chance of corrupt data
    if (State.isErrorInjectionEnabled() && Math.random() < 0.5) {
        State.incrementErrorCount();
        return {
            metric: 'cpu',
            value: 'CORRUPT_' + Math.random(), // Invalid value
            server: 'error-injector',
            timestamp: 'INVALID', // Invalid timestamp
        };
    }

    return generateMetric();
}
