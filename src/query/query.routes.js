// Query Routes - API endpoints for metrics queries

import express from "express";
import {
  getMetrics,
  getAggregateMetrics,
  getAvailableMetricsHandler,
} from "./query.controller.js";

export const queryRouter = express.Router();

queryRouter.get("/", getMetrics);
queryRouter.get("/aggregate", getAggregateMetrics);
queryRouter.get("/available", getAvailableMetricsHandler);

export default queryRouter;
