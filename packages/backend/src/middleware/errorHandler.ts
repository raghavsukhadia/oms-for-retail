import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { createApiError } from '@omsms/shared';
import { isDevelopment } from '../config/environment';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ApiError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  error: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  // Log the error
  logger.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // If headers have already been sent, delegate to the default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Handle different error types
  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
  } else if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error: ' + error.message;
  } else if (error.message.includes('Unique constraint failed')) {
    statusCode = 409;
    message = 'Resource already exists';
  } else if (error.message.includes('Record to update not found')) {
    statusCode = 404;
    message = 'Resource not found';
  } else if (error.message.includes('Foreign key constraint failed')) {
    statusCode = 400;
    message = 'Invalid reference to related resource';
  }

  // In development, include stack trace
  if (isDevelopment && statusCode === 500) {
    details = {
      stack: error.stack,
      message: error.message
    };
  }

  const response = createApiError(message, message);
  if (details) {
    (response as any).details = details;
  }

  res.status(statusCode).json(response);
}