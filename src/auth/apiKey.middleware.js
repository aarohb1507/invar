
import crypto from "crypto";

const API_KEY = process.env.INVAR_API_KEY;

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

export function requireApiKey(req, res, next) {
  // Extract key from X-Api-Key or Authorization: Bearer <key>
  const keyFromHeader = req.headers["x-api-key"];
  const authHeader = req.headers["authorization"];
  const keyFromAuth = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const providedKey = keyFromHeader || keyFromAuth;

  if (!providedKey) {
    return res.status(401).json({ error: "missing API key" });
  }

  if (!secureCompare(providedKey, API_KEY)) {
    return res.status(401).json({ error: "invalid API key" });
  }

  // Key valid, continue to handler
  next();
}