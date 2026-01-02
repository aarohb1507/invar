// Query Controller - handles HTTP requests and calls service functions

import {
  queryMetrics,
  aggregateMetrics,
  getAvailableMetrics,
} from "./query.service.js";

// GET /v1/metrics - raw metrics with pagination
export async function getMetrics(req, res) {
  try {
    const { startTime, endTime, metric, limit, offset } = req.query;

    if (!startTime || !endTime || !metric) {
      return res.status(400).json({
        error: "Missing required parameters: startTime, endTime, metric",
      });
    }

    // Convert to numbers
    const start = parseInt(startTime);
    const end = parseInt(endTime);
    const lim = limit ? parseInt(limit) : 100;
    const off = offset ? parseInt(offset) : 0;

    if (isNaN(start) || isNaN(end) || isNaN(lim) || isNaN(off)) {
      return res.status(400).json({
        error: "startTime, endTime, limit, offset must be valid numbers",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        error: "startTime must be before endTime",
      });
    }

    // Call service
    const result = await queryMetrics({
      startTime: start,
      endTime: end,
      metric,
      limit: lim,
      offset: off,
    });

    return res.json({
      success: true,
      data: {
        metrics: result.rows,
        pagination: {
          count: result.count,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      },
    });
  } catch (err) {
    console.error("[query-controller] error in getMetrics:", err.message);
    return res.status(500).json({
      error: "Failed to query metrics",
      details: err.message,
    });
  }
}

// GET /v1/metrics/aggregate - aggregated metrics (avg per hour)
export async function getAggregateMetrics(req, res) {
  try {
    const { startTime, endTime, metric, aggregation, bucketSize } = req.query;

    if (!startTime || !endTime || !metric) {
      return res.status(400).json({
        error: "Missing required parameters: startTime, endTime, metric",
      });
    }

    // Convert to numbers
    const start = parseInt(startTime);
    const end = parseInt(endTime);
    const bucket = bucketSize ? parseInt(bucketSize) : 3600;
    const agg = aggregation || "avg";

    if (isNaN(start) || isNaN(end) || isNaN(bucket)) {
      return res.status(400).json({
        error: "startTime, endTime, bucketSize must be valid numbers",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        error: "startTime must be before endTime",
      });
    }

    if (bucket <= 0) {
      return res.status(400).json({
        error: "bucketSize must be greater than 0",
      });
    }

    // Call service
    const result = await aggregateMetrics({
      startTime: start,
      endTime: end,
      metric,
      aggregation: agg,
      bucketSize: bucket,
    });

    return res.json({
      success: true,
      data: {
        aggregates: result,
        info: {
          metric,
          aggregation: agg,
          bucketSize: bucket,
          bucketCount: result.length,
        },
      },
    });
  } catch (err) {
    console.error("[query-controller] error in getAggregateMetrics:", err.message);
    return res.status(500).json({
      error: "Failed to aggregate metrics",
      details: err.message,
    });
  }
}

// GET /v1/metrics/available - list available metrics
export async function getAvailableMetricsHandler(req, res) {
  try {
    const { startTime, endTime } = req.query;

    let start, end;

    if (startTime && endTime) {
      start = parseInt(startTime);
      end = parseInt(endTime);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({
          error: "startTime and endTime must be valid numbers",
        });
      }

      if (start >= end) {
        return res.status(400).json({
          error: "startTime must be before endTime",
        });
      }
    }

    // Call service
    const result = await getAvailableMetrics({
      startTime: start,
      endTime: end,
    });

    return res.json({
      success: true,
      data: {
        metrics: result,
        count: result.length,
      },
    });
  } catch (err) {
    console.error("[query-controller] error in getAvailableMetrics:", err.message);
    return res.status(500).json({
      error: "Failed to get available metrics",
      details: err.message,
    });
  }
}
