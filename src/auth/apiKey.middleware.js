
import crypto from "crypto";
import { env } from "../config/env.js";

const API_KEY = env.apiKey || process.env.INVAR_API_KEY;

// Constant-time string comparison to prevent timing attacks
function secureCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function getApiKeyFromRequest(req) {
  // Header forms
  const keyFromHeader = req.headers["x-api-key"];
  const authHeader = req.headers["authorization"];
  const keyFromAuth = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  // Cookie form: parse simple cookie header for `invar_api_key`
  const cookieHeader = req.headers["cookie"];
  let keyFromCookie = null;
  if (cookieHeader) {
    const pairs = cookieHeader.split(";").map((c) => c.trim());
    for (const p of pairs) {
      const [k, ...rest] = p.split("=");
      if (k === "invar_api_key") {
        keyFromCookie = decodeURIComponent(rest.join("="));
        break;
      }
    }
  }

  return keyFromHeader || keyFromAuth || keyFromCookie;
}

export function requireApiKey(req, res, next) {
  const providedKey = getApiKeyFromRequest(req);

  if (!providedKey) {
    return res.status(401).json({ error: "missing API key" });
  }

  if (!secureCompare(providedKey, API_KEY)) {
    return res.status(401).json({ error: "invalid API key" });
  }

  // Key valid, continue to handler
  next();
}

export function extractApiKey(req) {
  return getApiKeyFromRequest(req);
}