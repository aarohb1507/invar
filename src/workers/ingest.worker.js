/**
 * Ingest Worker - Cold Path
 * 
 * Responsibilities:
 * - Read from Redis stream (XREADGROUP)
 * - Write to PostgreSQL (cold storage)
 * - Handle retries (3 attempts)
 * - Move failures to DLQ
 * 
 * Design principles:
 * - Process in batches (10 events at a time)
 * - Graceful shutdown (finish processing before exit)
 * - Exponential backoff on failures
 */

import { redis } from "../redis/redis.client.js";
import { pool } from "../db/postgres.client.js";

const STREAM_NAME = "invar:ingest";
const CONSUMER_GROUP = "invar-workers";
const CONSUMER_NAME = `worker-${process.pid}`;
const DLQ_STREAM = "invar:dlq";

const BATCH_SIZE = 10;
const BLOCK_TIME = 5000; // 5 seconds
const MAX_RETRIES = 3;

let isShuttingDown = false;

/**
 * Initialize consumer group (idempotent)
 */
async function initConsumerGroup() {
  try {
    await redis.xgroup("CREATE", STREAM_NAME, CONSUMER_GROUP, "0", "MKSTREAM");
    console.log(`[worker] consumer group '${CONSUMER_GROUP}' created`);
  } catch (err) {
    if (err.message.includes("BUSYGROUP")) {
      console.log(`[worker] consumer group '${CONSUMER_GROUP}' already exists`);
    } else {
      throw err;
    }
  }
}

/**
 * Main worker loop
 */
async function processStream() {
  console.log(`[worker] ${CONSUMER_NAME} started`);

  while (!isShuttingDown) {
    try {
      // 1. First, check for pending messages (recovery mode)
      // Read messages that this consumer has already read but not ACKed
      const pendingResults = await redis.xreadgroup(
        "GROUP", CONSUMER_GROUP, CONSUMER_NAME,
        "COUNT", BATCH_SIZE,
        "STREAMS", STREAM_NAME, "0" // "0" means "pending messages"
      );

      // Check if there are actually pending messages to process
      const hasPendingMessages = pendingResults &&
        pendingResults.length > 0 &&
        pendingResults[0][1].length > 0;

      if (hasPendingMessages) {
        console.log(`[worker] recovering ${pendingResults[0][1].length} pending messages...`);
        for (const [stream, messages] of pendingResults) {
          for (const [streamId, fields] of messages) {
            await processMessage(streamId, fields);
          }
        }
        // If we found pending work, continue immediately to process more pending items
        continue;
      }

      // 2. If no pending work, read new messages
      const newResults = await redis.xreadgroup(
        "GROUP", CONSUMER_GROUP, CONSUMER_NAME,
        "BLOCK", BLOCK_TIME,
        "COUNT", BATCH_SIZE,
        "STREAMS", STREAM_NAME, ">" // ">" means "new messages"
      );

      if (!newResults || newResults.length === 0) {
        continue; // Idle
      }

      // Process new batch
      for (const [stream, messages] of newResults) {
        for (const [streamId, fields] of messages) {
          await processMessage(streamId, fields);
        }
      }

    } catch (err) {
      console.error("[worker] error reading stream:", err.message);
      await sleep(5000); // Backoff before retry
    }
  }

  console.log("[worker] shutting down gracefully");
}

/**
 * Process single message
 */
async function processMessage(streamId, fields) {
  // Parse fields (Redis returns flat array: [key1, val1, key2, val2])
  const data = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }

  const { payload, timestamp, receivedAt } = data;

  try {
    // Parse payload string as JSON for Postgres JSONB type
    const payloadObj = JSON.parse(payload);

    // Write to PostgreSQL (Idempotent Insert)
    // ON CONFLICT (stream_id) DO NOTHING ensures we don't insert duplicates on retry
    await pool.query(
      `INSERT INTO metrics (stream_id, payload, timestamp, received_at) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (stream_id) DO NOTHING`,
      [streamId, payloadObj, parseInt(timestamp), receivedAt || new Date().toISOString()]
    );

    // Acknowledge (remove from stream)
    await redis.xack(STREAM_NAME, CONSUMER_GROUP, streamId);

    // console.log(`[worker] processed ${streamId}`);

  } catch (err) {
    console.error(`[worker] failed to process ${streamId}:`, err.message || err);
    if (err.stack) {
      console.error(err.stack);
    }

    // Check retry count
    const retryCount = await getRetryCount(streamId);

    if (retryCount >= MAX_RETRIES) {
      // Move to DLQ
      await moveToDLQ(streamId, data, err.message);
      await redis.xack(STREAM_NAME, CONSUMER_GROUP, streamId);
    } else {
      console.warn(`[worker] will retry ${streamId} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      // Wait before next attempt/batch to simulate backoff and backlog
      await sleep(2000);
    }
  }
}

/**
 * Get retry count for a specific message
 * CRITICAL FIX: Query for the specific message, not just any pending message
 */
async function getRetryCount(streamId) {
  try {
    // Get ALL pending messages for this consumer group
    // Then find the specific message we're looking for
    const pending = await redis.xpending(
      STREAM_NAME,
      CONSUMER_GROUP,
      streamId,      // Start from this specific ID
      streamId,      // End at this specific ID
      1              // Limit to 1 result
    );

    if (pending && pending.length > 0) {
      const [id, consumer, idleTime, deliveryCount] = pending[0];
      console.log(`[worker] retry check for ${streamId}: deliveryCount=${deliveryCount}`);
      return deliveryCount;
    }
  } catch (err) {
    console.error(`[worker] error checking retry count for ${streamId}:`, err.message);
  }

  // If not found in pending, it's a first attempt
  return 1; // First delivery
}

/**
 * Move failed message to DLQ
 */
async function moveToDLQ(streamId, data, errorMsg) {
  try {
    await redis.xadd(
      DLQ_STREAM,
      "*",
      "original_id", streamId,
      "payload", data.payload,
      "timestamp", data.timestamp,
      "error", errorMsg,
      "failed_at", Date.now()
    );

    console.error(`[worker] moved to DLQ: ${streamId}`);
  } catch (err) {
    console.error("[worker] failed to write to DLQ:", err.message);
  }
}

/**
 * Graceful shutdown handler
 */
function setupShutdownHandlers() {
  const shutdown = async (signal) => {
    console.log(`[worker] received ${signal}, shutting down...`);
    isShuttingDown = true;

    // Give worker time to finish current batch
    await sleep(6000);

    await redis.quit();
    await pool.end();

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

/**
 * Helper: sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Start the worker
 */
async function start() {
  console.log("[worker] starting up...");
  try {
    await initConsumerGroup();
    setupShutdownHandlers();
    await processStream();
  } catch (err) {
    console.error("[worker] fatal error:", err);
    process.exit(1);
  }
}

// Run if executed directly
start().catch(err => {
  console.error("[worker] startup failed:", err);
  process.exit(1);
});

export { start };
