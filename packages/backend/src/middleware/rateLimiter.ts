import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '../config/environment';
import { createApiError } from '@omsms/shared';

// Create rate limiters for different endpoints
const defaultLimiter = new RateLimiterMemory({
  keyPrefix: 'default',
  points: config.app.rateLimitMax, // Number of requests
  duration: Math.floor(config.app.rateLimitWindowMs / 1000), // Per duration in seconds
});

const authLimiter = new RateLimiterMemory({
  keyPrefix: 'auth',
  points: 100, // 100 login attempts (increased for development)
  duration: 60, // per 60 seconds
  blockDuration: 60, // Block for 1 minute if limit exceeded (reduced)
});

const uploadLimiter = new RateLimiterMemory({
  keyPrefix: 'upload',
  points: 10, // 10 uploads
  duration: 60, // per 60 seconds
});

const publicLimiter = new RateLimiterMemory({
  keyPrefix: 'public',
  points: 200, // 200 requests (more lenient for public endpoints)
  duration: 60, // per 60 seconds
  blockDuration: 30, // Block for 30 seconds if limit exceeded
});

function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string) || 
         (req.headers['x-real-ip'] as string) || 
         req.connection.remoteAddress || 
         req.ip || 
         'unknown';
}

function createRateLimitMiddleware(limiter: RateLimiterMemory) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientIP = getClientIP(req);
      await limiter.consume(clientIP);
      next();
    } catch (rejRes: any) {
      const remainingMs = rejRes.msBeforeNext || 1000;
      const remainingSeconds = Math.round(remainingMs / 1000);
      
      res.set({
        'Retry-After': String(remainingSeconds),
        'X-RateLimit-Limit': String(limiter.points),
        'X-RateLimit-Remaining': String(rejRes.remainingHits || 0),
        'X-RateLimit-Reset': String(new Date(Date.now() + remainingMs))
      });

      const response = createApiError(
        'Too many requests',
        `Rate limit exceeded. Try again in ${remainingSeconds} seconds.`
      );
      
      res.status(429).json(response);
    }
  };
}

// Export different rate limiters
export const rateLimiter = createRateLimitMiddleware(defaultLimiter);
export const authRateLimiter = createRateLimitMiddleware(authLimiter);
export const uploadRateLimiter = createRateLimitMiddleware(uploadLimiter);
export const publicRateLimiter = createRateLimitMiddleware(publicLimiter);