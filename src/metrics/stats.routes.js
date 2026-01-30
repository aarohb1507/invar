/**
 * Stats Routes - Dashboard statistics API
 * Public access for demo purposes
 */

import express from 'express';
import { getDashboardStats } from './stats.service.js';

const statsRouter = express.Router();

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
