/**
 * Ingest Service - Hot Path
 * 
 * Responsibilities:
 * - Write metrics to Redis stream (XADD) for durability
 * - Publish to Redis pub/sub channel (PUBLISH) for real-time updates
 * - Fire-and-forget: always fast, never blocks the request
 * 
 * Design principles:
 * - No database calls (Redis only)
 * - No blocking operations on hot path
 * - Log errors but don't fail requests (availability over strict consistency)
 * - Simple validation only (complex validation happens in workers)
 */

import { redis, isRedisConnected } from "../redis/redis.client.js";

// Redis stream name (durable log for workers/replay)
const STREAM_NAME = "invar:ingest";

// Redis pub/sub channel name (real-time updates for dashboards)
const CHANNEL_NAME = "invar:live";

/**
 * Ingest a metric event to Redis (hot path - must be fast!)
 * 
 * @param {Object} payload - The metric event payload
 * @returns {Promise<{success: boolean, streamId?: string, error?: string}>}
 */

export async function ingestMetric(payload) {
  // Quick validation
  if (!payload || typeof payload !== "object") {
    return { success: false, error: "invalid payload" };
  }

  const timestamp = Date.now();
  
  // Prepare the event
  const event = {
    payload: JSON.stringify(payload),
    timestamp,
    receivedAt: new Date().toISOString(),
  };

  // Fire-and-forget: don't wait for Redis, don't block the request
  // We catch errors to prevent unhandled rejections, but we return immediately
  processIngestAsync(event).catch((err) => {
    console.error("[ingest] async processing failed:", err.message);
    // TODO: increment metric counter for monitoring
  });

  // Return immediately (202 Accepted)
  return { success: true };
}

/**
 * Async processing (doesn't block the HTTP response)
 */
async function processIngestAsync(event) {
  if (!isRedisConnected()) {
    console.warn("[ingest] Redis not connected, event dropped:", event.timestamp);
    // TODO: buffer to memory/disk or send to fallback queue
    return;
  }

  try {
    // 1. XADD to stream (durable, for workers)
    const streamId = await redis.xadd(
      STREAM_NAME,
      "*", // auto-generate ID
      "payload", event.payload,
      "timestamp", event.timestamp,
      "receivedAt", event.receivedAt
    );

    // 2. PUBLISH to channel (real-time, for Socket.io)
    // Lightweight message: just notify that new data is available
    await redis.publish(
      CHANNEL_NAME,
      JSON.stringify({
        streamId,
        timestamp: event.timestamp,
      })
    );

    // Success logging (can be removed in production for speed)
    console.log(`[ingest] processed event ${streamId}`);
  } catch (err) {
    console.error("[ingest] Redis write failed:", err.message);
    // TODO: increment error counter, consider fallback queue
    throw err;
  }
}

/**
 * Get ingestion stats (for health/metrics endpoints)
 */
export async function getIngestStats() {
  try {
    const streamLength = await redis.xlen(STREAM_NAME);
    return {
      streamName: STREAM_NAME,
      streamLength,
      channelName: CHANNEL_NAME,
      redisConnected: isRedisConnected(),
    };
  } catch (err) {
    return {
      error: err.message,
      redisConnected: false,
    };
  }
}