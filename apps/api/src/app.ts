import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { getEnv } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.routes.js';
import { eventRouter } from './routes/event.routes.js';
import { teamRouter } from './routes/team.routes.js';
import { registrationRouter } from './routes/registration.routes.js';
import { paymentRouter } from './routes/payment.routes.js';
import passRouter from './routes/pass.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

export function createApp(): Express {
  const env = getEnv();
  const app = express();

  // Security headers via Helmet
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Cookie parser for reading HttpOnly JWT cookies
  app.use(cookieParser());

  // Body parser with strict size limit (100kb)
  app.use(express.json({ limit: '100kb' }));

  // Root redirect/status
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'FestConnect API',
      version: '0.1.0',
      description: 'A Centralized Technical Fest & Event Registration System API',
      health: '/api/health',
      ready: '/api/ready',
      apiPrefix: env.API_PREFIX,
    });
  });

  // Health and readiness routes
  app.use('/api', healthRouter);

  // Business API v1 Routes
  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/events`, eventRouter);
  app.use(`${env.API_PREFIX}/teams`, teamRouter);
  app.use(`${env.API_PREFIX}/registrations`, registrationRouter);
  app.use(`${env.API_PREFIX}/payments`, paymentRouter);
  app.use(`${env.API_PREFIX}/passes`, passRouter);

  // 404 Not Found handler using standard TRD error shape
  app.use(notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
