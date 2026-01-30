import express from "express";
import { addClient } from "./realtime.service.js";

const router = express.Router();

// SSE endpoint: GET / (mounted at /v1/metrics/live)
// Public access for demo mode
router.get("/", (req, res) => {
  addClient(res);
});

export default router;
