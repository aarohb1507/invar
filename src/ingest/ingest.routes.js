import express from "express";
import { requireApiKey } from "../auth/apiKey.middleware.js";
import { ingestMetric } from "./ingest.service.js";

const ingestRouter = express.Router();

ingestRouter.use(express.json({ limit: "256kb" }));
ingestRouter.use(requireApiKey);

// POST /v1/ingest - hot path, returns immediately
ingestRouter.post("/", async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: "invalid JSON payload" });
  }

  const result = await ingestMetric(payload);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(202).json({ accepted: true });
});

export { ingestRouter };