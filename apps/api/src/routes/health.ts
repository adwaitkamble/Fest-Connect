import { Router, Request, Response } from 'express';
import { checkDbConnection } from '../db/connection.js';

export const healthRouter = Router();

// Liveness check - verifies process is running
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    liveness: 'ok',
    readiness: 'unconfigured',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'festconnect-api',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    subsystems: {
      api: 'healthy',
      database: 'not_configured_in_phase_01',
      cache: 'not_configured_in_phase_01',
    },
  });
});

// Dedicated readiness check - verifies database connectivity
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const dbStatus = await checkDbConnection();
  const isReady = dbStatus.connected;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'festconnect-api',
    dependencies: {
      database: {
        connected: dbStatus.connected,
        ...(dbStatus.error ? { error: dbStatus.error } : {}),
      },
    },
  });
});
