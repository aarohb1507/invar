import express from "express";
import cookieParser from "cookie-parser";
import { ingestRouter } from "./ingest/ingest.routes.js";
import { simulateRouter } from "./ingest/simulate.routes.js";
import { queryRouter } from "./query/query.routes.js";
import { statsRouter } from "./metrics/stats.routes.js";
import realtimeRouter from "./realtime/realtime.routes.js";
import sessionRouter from "./auth/session.routes.js";

export const app = express();

app.use(express.json());
app.use(cookieParser());

// Serve demo folder
app.use(express.static('demo'));

app.use("/v1/ingest", ingestRouter);
app.use("/v1/ingest/simulate", simulateRouter);
app.use("/v1/metrics", queryRouter);
app.use("/v1/metrics/stats", statsRouter);
app.use("/v1/metrics/live", realtimeRouter);
app.use("/v1/auth", sessionRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

