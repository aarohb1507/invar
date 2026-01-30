/**
 * Stats Routes - Dashboard statistics API
 */

import express from 'express';
import { requireSession } from '../auth/session.middleware.js';
import { getDashboardStats } from './stats.service.js';

const statsRouter = express.Router();

statsRouter.use(requireSession);

// GET /v1/metrics/stats
statsRouter.get('/', async (req, res) => {
    try {
        const stats = await getDashboardStats();
        return res.json({ success: true, data: stats });
    } catch (err) {
        console.error('[stats] error:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch stats'
        });
    }
});

export { statsRouter };
