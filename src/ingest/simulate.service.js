/**
 * Simulation Service - Generate mock metrics for demo
 * 
 * Provides three mock metric types:
 * - CPU: Random walk between 20-80%
 * - Memory: Random walk between 30-90%
 * - Disk: Random walk between 10-70%
 */

import { ingestMetric } from './ingest.service.js';

let simulationInterval = null;
let isSimulating = false;

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
 * Start simulation (generates metrics at ~10 events/sec)
 */
export function startSimulation() {
    if (isSimulating) {
        return { success: false, error: 'Simulation already running' };
    }

    console.log('[simulate] starting metric generation...');
    isSimulating = true;

    simulationInterval = setInterval(async () => {
        const payload = generateMetric();
        await ingestMetric(payload);
    }, 100); // 10 events/sec

    return { success: true, message: 'Simulation started' };
}

/**
 * Stop simulation
 */
export function stopSimulation() {
    if (!isSimulating) {
        return { success: false, error: 'No simulation running' };
    }

    console.log('[simulate] stopping metric generation...');
    clearInterval(simulationInterval);
    simulationInterval = null;
    isSimulating = false;

    return { success: true, message: 'Simulation stopped' };
}

/**
 * Get simulation status
 */
export function getSimulationStatus() {
    return { isSimulating };
}

/**
 * Inject error simulation (generates invalid data)
 */
export async function injectError() {
    console.log('[simulate] injecting error...');

    // Send malformed payload to trigger worker retry logic
    const corruptedPayload = {
        metric: 'cpu',
        value: 'INVALID_VALUE', // This will cause parsing issues
        server: 'error-injector',
        timestamp: 'INVALID_TIMESTAMP',
    };

    await ingestMetric(corruptedPayload);

    return {
        success: true,
        message: 'Error injected - check worker logs for retry behavior'
    };
}
