import express from "express";
import { env } from "../config/env.js";

export const sessionRouter = express.Router();

// Create a short-lived browser session cookie from an API key.
// Clients can POST with `x-api-key` header or JSON `{ "apiKey": "..." }`.
sessionRouter.post("/session", (req, res) => {
  const providedKey = req.headers["x-api-key"] || (req.body && req.body.apiKey);
  if (!providedKey) {
    return res.status(400).json({ error: "missing api key" });
  }

  if (providedKey !== env.apiKey) {
    return res.status(401).json({ error: "invalid api key" });
  }

  const isProd = process.env.NODE_ENV === "production";
  // HttpOnly so JS can't read it; Secure in production; SameSite lax to allow EventSource
  res.cookie("invar_api_key", providedKey, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });

  res.json({ ok: true });
});

export default sessionRouter;
