/**
 * Session Middleware - Check for valid session cookie
 * Used by browser-based endpoints (dashboard API calls)
 */

import { env } from '../config/env.js';

export function requireSession(req, res, next) {
    const apiKey = req.cookies?.invar_api_key;

    if (!apiKey) {
        return res.status(401).json({ error: 'no session cookie' });
    }

    if (apiKey !== env.apiKey) {
        return res.status(401).json({ error: 'invalid session' });
    }

    next();
}
