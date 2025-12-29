import express from "express";
import { requireApiKey } from "../auth/apiKey.middleware.js";
import { ingestMetric } from "./ingest.service.js";

const ingestRouter = express.Router();

// lightweight JSON parsing for the hot path
ingestRouter.use(express.json({ limit: "256kb" }));

// Apply API key auth to all routes in this router
ingestRouter.use(requireApiKey);

/**
 * POST /v1/ingest
 * 
 * Hot path: accepts metric events and returns immediately.
 * Redis write happens asynchronously (fire-and-forget).
 * 
 * Expected payload: any valid JSON object
 * Returns: 202 Accepted (event queued for processing)
 */
ingestRouter.post("/", async (req, res) => {
  const payload = req.body;
  
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: "invalid JSON payload" });
  }

  // Ingest to Redis (fire-and-forget, returns immediately)
  const result = await ingestMetric(payload);
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Always return 202 Accepted (event is queued)
  return res.status(202).json({ accepted: true });
});

export { ingestRouter };