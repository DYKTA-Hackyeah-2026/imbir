import { Router } from 'express';
import config from '../config/config.js';
import { pingDatabase } from '../db/client.js';

const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv, uptime: process.uptime() });
});

healthRouter.get('/ready', async (_req, res) => {
  try {
    await pingDatabase();
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'down' });
  }
});

export default healthRouter;
