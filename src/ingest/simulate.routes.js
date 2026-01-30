/**
 * Simulation Routes - Control mock data generation
 * Public access for demo purposes
 */

import express from 'express';
import {
    startSimulation,
    stopSimulation,
    getSimulationStatus,
    injectError
} from './simulate.service.js';

const simulateRouter = express.Router();

// POST /v1/ingest/simulate/start
simulateRouter.post('/start', (req, res) => {
    const result = startSimulation();
    if (!result.success) {
        return res.status(400).json(result);
    }
    return res.json(result);
});

// POST /v1/ingest/simulate/stop
simulateRouter.post('/stop', (req, res) => {
    const result = stopSimulation();
    if (!result.success) {
        return res.status(400).json(result);
    }
    return res.json(result);
});

// GET /v1/ingest/simulate/status
simulateRouter.get('/status', (req, res) => {
    const status = getSimulationStatus();
    return res.json(status);
});

// POST /v1/ingest/simulate/error
simulateRouter.post('/error', async (req, res) => {
    const result = await injectError();
    return res.json(result);
});

export { simulateRouter };
