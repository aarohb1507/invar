/**
 * Redis Client for Invar
 * 
 * Used for hot-path ingestion (non-blocking):
 * - XADD to stream 'invar:ingest' (durable, for workers/replay)
 * - PUBLISH to channel 'invar:live' (low-latency, for Socket.io bridge)
 * 
 * Connection strategy:
 * - lazyConnect: don't block server startup if Redis is temporarily down
 * - Auto-reconnect with exponential backoff
 * - Log errors but don't crash the process
 */

import Redis from "ioredis";
import { env } from "../config/env.js";

// Create Redis client with production-minded settings
const redisUrl = env.redisUrl || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  lazyConnect: true, // Don't block server startup
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    // Exponential backoff: 50ms, 100ms, 200ms, 400ms, max 2s
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Log connection events
redis.on("connect", () => {
  console.log("[redis] connected to", redisUrl);
});

redis.on("ready", () => {
  console.log("[redis] ready to accept commands");
});

redis.on("error", (err) => {
  console.error("[redis] error:", err.message);
  // Don't crash the process - let retry strategy handle it
});

redis.on("close", () => {
  console.warn("[redis] connection closed");
});

redis.on("reconnecting", (delay) => {
  console.log(`[redis] reconnecting in ${delay}ms`);
});

// Helper: check if Redis is currently connected
export function isRedisConnected() {
  return redis.status === "ready";
}

// Helper: connect Redis (call this in server.js startup)
export async function connectRedis() {
  try {
    await redis.connect();
    console.log("[redis] initial connection successful");
    return true;
  } catch (err) {
    console.error("[redis] initial connection failed:", err.message);
    console.warn("[redis] will retry in background - server will continue");
    return false;
  }
}
