import express from "express";
import { requireApiKey } from "../auth/apiKey.middleware.js";
import { addClient } from "./realtime.service.js";

const router = express.Router();

// SSE endpoint: GET / (mounted at /v1/metrics/live)
router.get("/", requireApiKey, (req, res) => {
  addClient(res);
});

export default router;
