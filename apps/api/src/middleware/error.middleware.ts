import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { getEnv } from '../config/env.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found on this server.',
      details: [],
    },
  });
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = (process.env.NODE_ENV || getEnv().NODE_ENV) === 'production';

  // 1. Handle Known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // 2. Handle Body Parser / JSON Syntax Error
  if ('type' in err && (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON payload in request body.',
        details: [],
      },
    });
    return;
  }

  // 3. Unexpected Server Errors
  console.error('[Unhandled Server Error]:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction ? 'An unexpected server error occurred.' : err.message,
      details: isProduction ? [] : [err.stack || ''],
    },
  });
}
