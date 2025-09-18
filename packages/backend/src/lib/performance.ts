import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { logger } from './logger';
import NodeCache from 'node-cache';

export interface PerformanceConfig {
  cache: {
    stdTTL: number; // Standard time to live in seconds
    checkperiod: number; // Period for automatic delete check
    maxKeys: number; // Maximum number of keys
  };
  compression: {
    threshold: number; // Minimum response size to compress
    level: number; // Compression level (1-9)
  };
  database: {
    connectionPool: {
      min: number;
      max: number;
      acquireTimeoutMillis: number;
      idleTimeoutMillis: number;
    };
    queryTimeout: number;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  ksize: number;
  vsize: number;
}

export interface PerformanceMetrics {
  timestamp: Date;
  responseTime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  eventLoopLag: number;
  activeConnections: number;
  cacheStats: CacheStats;
}

export class PerformanceOptimizer {
  private static cache: NodeCache;
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS_HISTORY = 1000;

  private static readonly DEFAULT_CONFIG: PerformanceConfig = {
    cache: {
      stdTTL: 600, // 10 minutes
      checkperiod: 120, // 2 minutes
      maxKeys: 10000
    },
    compression: {
      threshold: 1024, // 1KB
      level: 6
    },
    database: {
      connectionPool: {
        min: 2,
        max: 20,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 600000
      },
      queryTimeout: 30000
    }
  };

  /**
   * Initialize performance optimization
   */
  static initialize(config?: Partial<PerformanceConfig>): void {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: finalConfig.cache.stdTTL,
      checkperiod: finalConfig.cache.checkperiod,
      maxKeys: finalConfig.cache.maxKeys,
      useClones: false // Better performance, but be careful with object mutations
    });

    // Start performance monitoring
    this.startPerformanceMonitoring();

    logger.info('Performance optimization initialized');
  }

  /**
   * Get cache instance
   */
  static getCache(): NodeCache {
    if (!this.cache) {
      this.initialize();
    }
    return this.cache;
  }

  /**
   * Response compression middleware
   */
  static compressionMiddleware(config?: Partial<PerformanceConfig['compression']>) {
    const compressionConfig = { ...this.DEFAULT_CONFIG.compression, ...config };
    
    return compression({
      threshold: compressionConfig.threshold,
      level: compressionConfig.level,
      filter: (req: Request, res: Response) => {
        // Don't compress responses with 'cache-control: no-transform' directive
        if (res.getHeader('Cache-Control')?.toString().includes('no-transform')) {
          return false;
        }
        
        // Compress if the response is compressible
        return compression.filter(req, res);
      }
    });
  }

  /**
   * Response caching middleware
   */
  static cacheMiddleware(ttl?: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip caching for authenticated requests (unless specifically allowed)
      if (req.headers.authorization && !req.query.cache) {
        return next();
      }

      const cacheKey = this.generateCacheKey(req);
      const cachedResponse = this.cache.get(cacheKey);

      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(body: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          PerformanceOptimizer.cache.set(cacheKey, body, ttl);
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Request timing middleware
   */
  static timingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage();

      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const endMemory = process.memoryUsage();

        // Add timing headers
        res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
        res.setHeader('X-Memory-Usage', `${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

        // Log slow requests
        if (duration > 1000) { // Log requests taking more than 1 second
          logger.warn('Slow request detected:', {
            method: req.method,
            path: req.path,
            duration: `${duration.toFixed(2)}ms`,
            memoryDelta: `${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`,
            statusCode: res.statusCode
          });
        }

        // Store metrics
        this.recordMetrics(duration, startMemory, endMemory);
      });

      next();
    };
  }

  /**
   * Database query optimization middleware
   */
  static databaseOptimization() {
    return {
      // Query timeout wrapper
      withTimeout: <T>(promise: Promise<T>, timeout: number = 30000): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Database query timeout')), timeout)
          )
        ]);
      },

      // Query result caching
      cachedQuery: async <T>(
        key: string,
        queryFn: () => Promise<T>,
        ttl: number = 300
      ): Promise<T> => {
        const cached = this.cache.get<T>(key);
        if (cached !== undefined) {
          return cached;
        }

        const result = await queryFn();
        this.cache.set(key, result, ttl);
        return result;
      },

      // Batch query execution
      batchExecute: async <T>(
        queries: (() => Promise<T>)[],
        batchSize: number = 10
      ): Promise<T[]> => {
        const results: T[] = [];
        
        for (let i = 0; i < queries.length; i += batchSize) {
          const batch = queries.slice(i, i + batchSize);
          const batchResults = await Promise.all(batch.map(query => query()));
          results.push(...batchResults);
        }
        
        return results;
      }
    };
  }

  /**
   * Memory optimization utilities
   */
  static memoryOptimization() {
    return {
      // Garbage collection trigger for memory cleanup
      triggerGC: () => {
        if (global.gc) {
          global.gc();
          logger.info('Manual garbage collection triggered');
        }
      },

      // Memory usage monitoring
      checkMemoryUsage: () => {
        const usage = process.memoryUsage();
        const threshold = 512 * 1024 * 1024; // 512MB threshold

        if (usage.heapUsed > threshold) {
          logger.warn('High memory usage detected:', {
            heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            rss: `${(usage.rss / 1024 / 1024).toFixed(2)}MB`
          });

          // Trigger garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }

        return usage;
      },

      // Clear cache when memory is high
      clearCacheOnHighMemory: () => {
        const usage = process.memoryUsage();
        const threshold = 256 * 1024 * 1024; // 256MB threshold

        if (usage.heapUsed > threshold) {
          const keysBefore = this.cache.keys().length;
          this.cache.flushAll();
          logger.info(`Cache cleared due to high memory usage. Removed ${keysBefore} keys`);
        }
      }
    };
  }

  /**
   * API response optimization
   */
  static responseOptimization() {
    return {
      // Paginate large datasets
      paginate: <T>(
        data: T[],
        page: number = 1,
        limit: number = 20
      ): { data: T[]; pagination: any } => {
        const offset = (page - 1) * limit;
        const paginatedData = data.slice(offset, offset + limit);
        
        return {
          data: paginatedData,
          pagination: {
            page,
            limit,
            total: data.length,
            totalPages: Math.ceil(data.length / limit),
            hasNext: offset + limit < data.length,
            hasPrev: page > 1
          }
        };
      },

      // Compress large JSON responses
      compressResponse: (data: any): any => {
        if (typeof data === 'object' && data !== null) {
          // Remove null/undefined values to reduce payload size
          return JSON.parse(JSON.stringify(data, (key, value) => {
            return value === null || value === undefined ? undefined : value;
          }));
        }
        return data;
      },

      // Field selection for reducing payload size
      selectFields: <T extends Record<string, any>>(
        objects: T[],
        fields: (keyof T)[]
      ): Partial<T>[] => {
        return objects.map(obj => {
          const selected: Partial<T> = {};
          fields.forEach(field => {
            if (obj[field] !== undefined) {
              selected[field] = obj[field];
            }
          });
          return selected;
        });
      }
    };
  }

  /**
   * Connection pooling optimization
   */
  static connectionPooling() {
    return {
      // Monitor connection pool health
      monitorPool: (pool: any) => {
        setInterval(() => {
          const stats = {
            size: pool.totalCount || 0,
            available: pool.idleCount || 0,
            pending: pool.pendingCount || 0,
            timestamp: new Date()
          };

          logger.debug('Connection pool stats:', stats);

          // Alert if pool is under stress
          if (stats.pending > 5 || stats.available === 0) {
            logger.warn('Connection pool under stress:', stats);
          }
        }, 30000); // Check every 30 seconds
      },

      // Optimize pool configuration based on load
      optimizePoolSize: (currentLoad: number, maxConnections: number) => {
        const optimalSize = Math.ceil(currentLoad * 1.2); // 20% buffer
        return Math.min(optimalSize, maxConnections);
      }
    };
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): PerformanceMetrics[] {
    return this.metrics.slice(-100); // Return last 100 metrics
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  static clearCache(pattern?: string): number {
    if (!pattern) {
      const keyCount = this.cache.keys().length;
      this.cache.flushAll();
      return keyCount;
    }

    const keys = this.cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    this.cache.del(matchingKeys);
    return matchingKeys.length;
  }

  /**
   * Warm up cache with frequently accessed data
   */
  static async warmUpCache(warmUpFunctions: Array<{ key: string; fn: () => Promise<any>; ttl?: number }>): Promise<void> {
    logger.info('Starting cache warm-up...');
    
    const promises = warmUpFunctions.map(async ({ key, fn, ttl }) => {
      try {
        const result = await fn();
        this.cache.set(key, result, ttl);
        logger.debug(`Cache warmed up for key: ${key}`);
      } catch (error) {
        logger.error(`Cache warm-up failed for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    logger.info('Cache warm-up completed');
  }

  // Private helper methods

  private static generateCacheKey(req: Request): string {
    const baseKey = `${req.method}:${req.path}`;
    const queryString = Object.keys(req.query)
      .sort()
      .map(key => `${key}=${req.query[key]}`)
      .join('&');
    
    return queryString ? `${baseKey}?${queryString}` : baseKey;
  }

  private static recordMetrics(
    responseTime: number,
    startMemory: NodeJS.MemoryUsage,
    endMemory: NodeJS.MemoryUsage
  ): void {
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      responseTime,
      memoryUsage: endMemory,
      cpuUsage: process.cpuUsage(),
      eventLoopLag: this.measureEventLoopLag(),
      activeConnections: 0, // Would be populated from actual connection pool
      cacheStats: this.cache.getStats()
    };

    this.metrics.push(metrics);

    // Keep only the last MAX_METRICS_HISTORY metrics
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  private static measureEventLoopLag(): number {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      return lag;
    });
    return 0; // Simplified for this implementation
  }

  private static startPerformanceMonitoring(): void {
    // Monitor memory usage every 5 minutes
    setInterval(() => {
      const memOpt = this.memoryOptimization();
      memOpt.checkMemoryUsage();
      memOpt.clearCacheOnHighMemory();
    }, 5 * 60 * 1000);

    // Log performance summary every hour
    setInterval(() => {
      const recentMetrics = this.metrics.slice(-60); // Last 60 metrics
      if (recentMetrics.length > 0) {
        const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
        const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / recentMetrics.length;
        
        logger.info('Performance Summary:', {
          averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
          averageMemoryUsage: `${(avgMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
          cacheHitRate: `${(this.cache.getStats().hits / (this.cache.getStats().hits + this.cache.getStats().misses) * 100).toFixed(2)}%`,
          cacheKeys: this.cache.keys().length
        });
      }
    }, 60 * 60 * 1000);
  }
}