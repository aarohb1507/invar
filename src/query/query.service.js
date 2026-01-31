// Query Service - Read Layer
// Queries PostgreSQL for historical metrics with filters, pagination, aggregations

import { pool } from "../db/postgres.client.js";

// Query metrics with time range and pagination
// @param {Object} options - {startTime, endTime, metric, limit, offset}
// @returns {Promise<{rows, count, hasMore}>}
export async function queryMetrics({
  startTime,
  endTime,
  metric,
  limit = 100,
  offset = 0,
}) {
  // Validate required params - use explicit checks to allow 0 as valid timestamp
  if (startTime === undefined || startTime === null ||
    endTime === undefined || endTime === null ||
    !metric) {
    throw new Error("Missing required params");
  }
  if (startTime > endTime) throw new Error("startTime must be before endTime");
  if (limit > 1000) throw new Error("limit cannot exceed 1000");

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM metrics 
       WHERE timestamp BETWEEN $1 AND $2 
       AND payload->>'metric' = $3`,
      [startTime, endTime, metric]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT 
        id,
        payload,
        timestamp,
        received_at,
        ingested_at
       FROM metrics
       WHERE timestamp BETWEEN $1 AND $2
       AND payload->>'metric' = $3
       ORDER BY timestamp DESC
       LIMIT $4 OFFSET $5`,
      [startTime, endTime, metric, limit, offset]
    );

    return {
      rows: result.rows,
      count: totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount,
    };
  } catch (err) {
    console.error("[query] error querying metrics:", err.message);
    throw err;
  }
}

// Aggregate metrics by time bucket (avg/max/min/sum per hour)
// @param {Object} options - {startTime, endTime, metric, aggregation, bucketSize}
// @returns {Promise<Array>} Aggregated results
export async function aggregateMetrics({
  startTime,
  endTime,
  metric,
  aggregation = "avg",
  bucketSize = 3600,
}) {
  // Validate required params - use explicit checks to allow 0 as valid timestamp
  if (startTime === undefined || startTime === null ||
    endTime === undefined || endTime === null ||
    !metric) {
    throw new Error("Missing required params");
  }
  if (!["avg", "max", "min", "sum"].includes(aggregation)) throw new Error("Invalid aggregation");

  const validAgg = aggregation.toLowerCase();

  try {
    const result = await pool.query(
      `SELECT 
        FLOOR(timestamp / $1) * $1 as bucket_start,
        ${validAgg}((payload->>'value')::float) as value,
        COUNT(*) as count
       FROM metrics
       WHERE timestamp BETWEEN $2 AND $3
       AND payload->>'metric' = $4
       GROUP BY FLOOR(timestamp / $1)
       ORDER BY bucket_start ASC`,
      [bucketSize, startTime, endTime, metric]
    );

    return result.rows.map((row) => ({
      timestamp: row.bucket_start,
      value: parseFloat(row.value),
      count: parseInt(row.count),
      aggregation: validAgg,
    }));
  } catch (err) {
    console.error("[query] error aggregating metrics:", err.message);
    throw err;
  }
}

// Get available metrics (for dashboard dropdown)
export async function getAvailableMetrics({
  startTime,
  endTime,
} = {}) {
  const start = startTime || Math.floor(Date.now() / 1000) - 86400;
  const end = endTime || Math.floor(Date.now() / 1000);

  try {
    const result = await pool.query(
      `SELECT DISTINCT payload->>'metric' as metric
       FROM metrics
       WHERE timestamp BETWEEN $1 AND $2
       ORDER BY metric`,
      [start, end]
    );

    return result.rows.map((row) => row.metric);
  } catch (err) {
    console.error("[query] error getting available metrics:", err.message);
    throw err;
  }
}
