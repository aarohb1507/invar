/**
 * PostgreSQL Client for Invar
 * 
 * Connection pool for cold storage (workers write here)
 * - Reuses connections (pool pattern)
 * - Auto-reconnect on failures
 * - Graceful shutdown support
 */

import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

// Connection pool (reuses connections)
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20, // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on("connect", () => {
  console.log("[postgres] new connection established");
});

pool.on("error", (err) => {
  console.error("[postgres] unexpected error:", err.message);
});

/**
 * Helper: check if Postgres is connected
 */
export async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("[postgres] connected successfully at", result.rows[0].now);
    return true;
  } catch (err) {
    console.error("[postgres] connection failed:", err.message);
    return false;
  }
}

/**
 * Graceful shutdown
 */
export async function closePool() {
  await pool.end();
  console.log("[postgres] pool closed");
}
