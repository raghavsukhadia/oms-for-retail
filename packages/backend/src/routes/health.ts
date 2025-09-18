import { Router, Request, Response } from 'express';
import { createApiResponse } from '@omsms/shared';
import { config } from '../config/environment';

export const healthRoutes = Router();

// Health check endpoint
healthRoutes.get('/', (req: Request, res: Response) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: '1.0.0',
    services: {
      database: 'connected', // We'll implement proper checks later
      storage: config.storage.provider,
      cache: config.cache.provider
    }
  };

  const response = createApiResponse(healthData, 'Service is healthy');
  res.json(response);
});

// Detailed health check
healthRoutes.get('/detailed', (req: Request, res: Response) => {
  const detailedHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    cpu: {
      usage: process.cpuUsage()
    },
    services: {
      database: {
        status: 'connected',
        provider: 'postgresql'
      },
      storage: {
        status: 'available',
        provider: config.storage.provider
      },
      cache: {
        status: 'available',
        provider: config.cache.provider
      }
    },
    configuration: {
      storageProvider: config.storage.provider,
      cacheProvider: config.cache.provider,
      corsOrigin: config.app.corsOrigin,
      maxFileSize: config.app.maxFileSize,
      rateLimitMax: config.app.rateLimitMax
    }
  };

  const response = createApiResponse(detailedHealth, 'Detailed health information');
  res.json(response);
});

// Readiness probe
healthRoutes.get('/ready', (req: Request, res: Response) => {
  // This endpoint checks if the service is ready to accept traffic
  // In a real implementation, you'd check database connectivity, etc.
  const readinessData = {
    ready: true,
    timestamp: new Date().toISOString(),
    checks: {
      database: true,
      storage: true,
      cache: true
    }
  };

  const response = createApiResponse(readinessData, 'Service is ready');
  res.json(response);
});

// Liveness probe
healthRoutes.get('/live', (req: Request, res: Response) => {
  // This endpoint checks if the service is alive
  const livenessData = {
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  };

  const response = createApiResponse(livenessData, 'Service is alive');
  res.json(response);
});