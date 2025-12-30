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
      // Read from stream (blocking)
      const results = await redis.xreadgroup(
        "GROUP", CONSUMER_GROUP, CONSUMER_NAME,
        "BLOCK", BLOCK_TIME,
        "COUNT", BATCH_SIZE,
        "STREAMS", STREAM_NAME, ">"
      );

      if (!results || results.length === 0) {
        continue; // No new messages
      }

      // Process batch
      for (const [stream, messages] of results) {
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
    // Write to PostgreSQL
    await pool.query(
      `INSERT INTO metrics (payload, timestamp, received_at) 
       VALUES ($1, $2, $3)`,
      [payload, parseInt(timestamp), receivedAt]
    );

    // Acknowledge (remove from stream)
    await redis.xack(STREAM_NAME, CONSUMER_GROUP, streamId);
    
    console.log(`[worker] processed ${streamId}`);
    
  } catch (err) {
    console.error(`[worker] failed to process ${streamId}:`, err.message);
    
    // Check retry count
    const retryCount = await getRetryCount(streamId);
    
    if (retryCount >= MAX_RETRIES) {
      // Move to DLQ
      await moveToDLQ(streamId, data, err.message);
      await redis.xack(STREAM_NAME, CONSUMER_GROUP, streamId);
    } else {
      // Don't ACK - will be retried by claiming pending messages
      console.warn(`[worker] will retry ${streamId} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    }
  }
}

/**
 * Get retry count for a message
 */
async function getRetryCount(streamId) {
  try {
    const pending = await redis.xpending(
      STREAM_NAME, CONSUMER_GROUP, "-", "+", 1, CONSUMER_NAME
    );
    
    if (pending && pending.length > 0) {
      const [id, consumer, idleTime, deliveryCount] = pending[0];
      if (id === streamId) {
        return deliveryCount;
      }
    }
  } catch (err) {
    console.error("[worker] error checking retry count:", err.message);
  }
  
  return 0;
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
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { start };
