export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_FAILED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details: unknown[];

  constructor(statusCode: number, code: ErrorCode, message: string, details: unknown[] = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details: unknown[] = []) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required or invalid credentials', details: unknown[] = []) {
    super(401, 'AUTHENTICATION_FAILED', message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied: insufficient permissions', details: unknown[] = []) {
    super(403, 'FORBIDDEN', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'The requested resource was not found', details: unknown[] = []) {
    super(404, 'NOT_FOUND', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists or conflicts with current state', details: unknown[] = []) {
    super(409, 'CONFLICT', message, details);
  }
}
