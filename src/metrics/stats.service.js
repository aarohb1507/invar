/**
 * Stats Service - Real-time dashboard statistics
 * 
 * Provides metrics for the summary cards:
 * - Ingestion rate (events/sec)
 * - Real-time lag (pending messages in Redis)
 * - Worker status
 * - Cold storage writes (rows/min)
 */

import { redis } from '../redis/redis.client.js';
import { pool } from '../db/postgres.client.js';

const STREAM_NAME = 'invar:ingest';
const CONSUMER_GROUP = 'invar-workers';

// Track ingestion rate
let lastStreamLength = 0;
let lastStreamCheck = Date.now();
let calculatedIngestionRate = 0;

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
    const stats = {
        ingestionRate: await getIngestionRate(),
        pendingMessages: await getPendingMessages(),
        workerStatus: await getWorkerStatus(),
        coldStorageWrites: await getColdStorageWrites(),
    };

    return stats;
}

/**
 * Calculate ingestion rate (events/sec)
 */
async function getIngestionRate() {
    try {
        const currentLength = await redis.xlen(STREAM_NAME);
        const now = Date.now();
        const timeDelta = (now - lastStreamCheck) / 1000; // seconds

        if (timeDelta > 0) {
            const lengthDelta = currentLength - lastStreamLength;
            calculatedIngestionRate = Math.max(0, Math.round(lengthDelta / timeDelta));

            lastStreamLength = currentLength;
            lastStreamCheck = now;
        }

        return calculatedIngestionRate;
    } catch (err) {
        console.error('[stats] error calculating ingestion rate:', err.message);
        return 0;
    }
}

/**
 * Get pending messages count (backlog)
 */
async function getPendingMessages() {
    try {
        const pending = await redis.xpending(STREAM_NAME, CONSUMER_GROUP);

        // pending is an array: [count, minId, maxId, consumers]
        if (Array.isArray(pending) && pending.length > 0) {
            return pending[0] || 0;
        }

        return 0;
    } catch (err) {
        console.error('[stats] error getting pending messages:', err.message);
        return 0;
    }
}

/**
 * Check worker health status
 */
async function getWorkerStatus() {
    try {
        const pending = await getPendingMessages();

        // Simple heuristic:
        // - OK: backlog < 10
        // - RETRYING: 10 <= backlog < 100
        // - ERROR: backlog >= 100

        if (pending < 10) {
            return 'OK';
        } else if (pending < 100) {
            return 'RETRYING';
        } else {
            return 'ERROR';
        }
    } catch (err) {
        console.error('[stats] error checking worker status:', err.message);
        return 'UNKNOWN';
    }
}

/**
 * Get cold storage write rate (rows/min)
 */
async function getColdStorageWrites() {
    try {
        // Count rows inserted in last minute
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

        const result = await pool.query(
            `SELECT COUNT(*) as count 
       FROM metrics 
       WHERE ingested_at >= $1`,
            [oneMinuteAgo]
        );

        return parseInt(result.rows[0].count) || 0;
    } catch (err) {
        console.error('[stats] error calculating cold storage writes:', err.message);
        return 0;
    }
}
