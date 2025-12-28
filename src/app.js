import express from "express";
import { ingestRouter } from "./ingest/ingest.routes.js";

export const app = express();

app.use(express.json());

app.use("/v1/ingest", ingestRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
