import express from "express";

const ingestRouter = express.Router();

// lightweight JSON parsing for the hot path
ingestRouter.use(express.json({ limit: "256kb" }));

ingestRouter.post("/", (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: "invalid JSON payload" });
  }

  // TODO: asynchronously XADD to Redis stream (non-blocking). Do NOT block here.
  // For now acknowledge quickly.
  return res.status(202).json({ accepted: true });
});

export { ingestRouter };