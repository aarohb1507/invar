// Ingest Service - Hot Path
// Writes to Redis stream and pub/sub, returns immediately (fire-and-forget)

import { redis, isRedisConnected } from "../redis/redis.client.js";

const STREAM_NAME = "invar:ingest";
const CHANNEL_NAME = "invar:live";

// Ingest metric to Redis (hot path)
// @param {Object} payload - metric event
// @returns {Promise<{success, error?}>}
export async function ingestMetric(payload) {
  if (!payload || typeof payload !== "object") {
    return { success: false, error: "invalid payload" };
  }

  const timestamp = Date.now();
  const event = {
    payload: JSON.stringify(payload),
    timestamp,
    receivedAt: new Date().toISOString(),
  };

  processIngestAsync(event).catch((err) => {
    console.error("[ingest] async processing failed:", err.message);
  });

  return { success: true };
}

// Async processing (non-blocking)
async function processIngestAsync(event) {
  if (!isRedisConnected()) {
    console.warn("[ingest] Redis not connected, event dropped:", event.timestamp);
    return;
  }

  try {
    const streamId = await redis.xadd(
      STREAM_NAME,
      "*",
      "payload", event.payload,
      "timestamp", event.timestamp,
      "receivedAt", event.receivedAt
    );

    await redis.publish(
      CHANNEL_NAME,
      JSON.stringify({
        streamId,
        timestamp: event.timestamp,
      })
    );

    console.log(`[ingest] processed ${streamId}`);
  } catch (err) {
    console.error("[ingest] Redis write failed:", err.message);
    throw err;
  }
}

// Get ingestion stats
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