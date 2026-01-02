import express from "express";
import { ingestRouter } from "./ingest/ingest.routes.js";
import { queryRouter } from "./query/query.routes.js";

export const app = express();

app.use(express.json());

app.use("/v1/ingest", ingestRouter);
app.use("/v1/metrics", queryRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
