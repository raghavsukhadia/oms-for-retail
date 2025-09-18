import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { PerformanceOptimizer } from './performance';

export interface MonitoringConfig {
  enabled: boolean;
  metricsEndpoint: string;
  healthCheckEndpoint: string;
  alerts: {
    responseTimeThreshold: number;
    errorRateThreshold: number;
    memoryThreshold: number;
    cpuThreshold: number;
  };
  retention: {
    metrics: number; // days
    logs: number; // days
    traces: number; // days
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    storage: ServiceHealth;
    external: ServiceHealth[];
  };
  metrics: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
  };
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[];
}

export class MonitoringService {
  private static config: MonitoringConfig = {
    enabled: process.env.ENABLE_MONITORING === 'true',
    metricsEndpoint: '/metrics',
    healthCheckEndpoint: '/health',
    alerts: {
      responseTimeThreshold: 1000, // 1 second
      errorRateThreshold: 5, // 5%
      memoryThreshold: 512 * 1024 * 1024, // 512MB
      cpuThreshold: 80 // 80%
    },
    retention: {
      metrics: 30,
      logs: 7,
      traces: 3
    }
  };

  private static metrics: Map<string, any> = new Map();
  private static alerts: AlertRule[] = [];
  private static healthChecks: Map<string, () => Promise<ServiceHealth>> = new Map();

  /**
   * Initialize monitoring service
   */
  static initialize(config?: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enabled) {
      this.setupDefaultHealthChecks();
      this.setupDefaultAlerts();
      this.startMetricsCollection();
      logger.info('Monitoring service initialized');
    }
  }

  /**
   * Health check middleware
   */
  static healthCheckMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.path !== this.config.healthCheckEndpoint) {
        return next();
      }

      try {
        const healthResult = await this.performHealthCheck();
        const statusCode = healthResult.status === 'healthy' ? 200 : 
                          healthResult.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(healthResult);
        return; // ✅ Prevent continued execution after response
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date(),
          error: 'Health check failed'
        });
        return; // ✅ Prevent continued execution after error response
      }
    };
  }

  /**
   * Metrics collection middleware
   */
  static metricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      // Track request
      this.incrementMetric('http_requests_total', {
        method: req.method,
        path: req.route?.path || req.path,
        status_code: 'pending'
      });

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();

        // Update request metrics
        this.incrementMetric('http_requests_total', {
          method: req.method,
          path: req.route?.path || req.path,
          status_code: res.statusCode.toString()
        });

        this.recordMetric('http_request_duration_ms', duration, {
          method: req.method,
          path: req.route?.path || req.path
        });

        this.recordMetric('memory_usage_bytes', endMemory.heapUsed);

        // Check for alerts
        this.checkAlerts(duration, endMemory.heapUsed, res.statusCode);
      });

      next();
    };
  }

  /**
   * Error tracking middleware
   */
  static errorTrackingMiddleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next(error);
      }

      // Record error metrics
      this.incrementMetric('http_errors_total', {
        method: req.method,
        path: req.route?.path || req.path,
        error_type: error.name
      });

      // Log error with context
      logger.error('Request error:', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
        userId: (req as any).user?.userId,
        tenantId: (req as any).tenantId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      next(error);
    };
  }

  /**
   * Perform comprehensive health check
   */
  static async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const services = {
      database: await this.checkService('database'),
      redis: await this.checkService('redis'),
      storage: await this.checkService('storage'),
      external: await this.checkExternalServices()
    };

    const allServices = [
      services.database,
      services.redis,
      services.storage,
      ...services.external
    ];

    const healthyServices = allServices.filter(s => s.status === 'healthy').length;
    const totalServices = allServices.length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (healthyServices === 0) {
      overallStatus = 'unhealthy';
    } else if (healthyServices < totalServices) {
      overallStatus = 'degraded';
    }

    const responseTime = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.VERSION || '1.0.0',
      services,
      metrics: {
        responseTime,
        memoryUsage: memoryUsage.heapUsed,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000,
        errorRate: this.calculateErrorRate()
      }
    };
  }

  /**
   * Register custom health check
   */
  static registerHealthCheck(name: string, checkFn: () => Promise<ServiceHealth>): void {
    this.healthChecks.set(name, checkFn);
  }

  /**
   * Record custom metric
   */
  static recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key) || { values: [], count: 0, sum: 0 };
    
    existing.values.push({ value, timestamp: Date.now() });
    existing.count++;
    existing.sum += value;
    
    // Keep only last 1000 values
    if (existing.values.length > 1000) {
      existing.values = existing.values.slice(-1000);
    }
    
    this.metrics.set(key, existing);
  }

  /**
   * Increment counter metric
   */
  static incrementMetric(name: string, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key) || { count: 0 };
    existing.count++;
    existing.lastUpdated = Date.now();
    this.metrics.set(key, existing);
  }

  /**
   * Get metrics in Prometheus format
   */
  static getPrometheusMetrics(): string {
    if (!this.config.enabled) return '';

    let output = '';
    
    for (const [key, metric] of this.metrics.entries()) {
      if (metric.values) {
        // Histogram/gauge metric
        const latest = metric.values[metric.values.length - 1];
        if (latest) {
          output += `${key} ${latest.value} ${latest.timestamp}\n`;
        }
      } else {
        // Counter metric
        output += `${key} ${metric.count} ${metric.lastUpdated}\n`;
      }
    }
    
    return output;
  }

  /**
   * Add alert rule
   */
  static addAlertRule(rule: AlertRule): void {
    this.alerts.push(rule);
  }

  /**
   * Get system metrics summary
   */
  static getMetricsSummary(): any {
    const summary: any = {};
    
    for (const [key, metric] of this.metrics.entries()) {
      if (metric.values && metric.values.length > 0) {
        const values = metric.values.map((v: any) => v.value);
        summary[key] = {
          count: metric.count,
          sum: metric.sum,
          avg: metric.sum / metric.count,
          min: Math.min(...values),
          max: Math.max(...values),
          latest: values[values.length - 1]
        };
      } else {
        summary[key] = {
          count: metric.count,
          lastUpdated: metric.lastUpdated
        };
      }
    }
    
    return summary;
  }

  // Private helper methods

  private static setupDefaultHealthChecks(): void {
    // Database health check
    this.registerHealthCheck('database', async () => {
      const start = Date.now();
      try {
        const { getMasterDb } = await import('./database');
        const db = await getMasterDb();
        await db.$queryRaw`SELECT 1`;
        
        return {
          name: 'database',
          status: 'healthy',
          responseTime: Date.now() - start,
          lastCheck: new Date()
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Redis health check
    this.registerHealthCheck('redis', async () => {
      const start = Date.now();
      try {
        // Mock Redis check - in real implementation, check actual Redis connection
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return {
          name: 'redis',
          status: 'healthy',
          responseTime: Date.now() - start,
          lastCheck: new Date()
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Storage health check
    this.registerHealthCheck('storage', async () => {
      const start = Date.now();
      try {
        // Mock storage check
        await new Promise(resolve => setTimeout(resolve, 5));
        
        return {
          name: 'storage',
          status: 'healthy',
          responseTime: Date.now() - start,
          lastCheck: new Date()
        };
      } catch (error) {
        return {
          name: 'storage',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  private static setupDefaultAlerts(): void {
    this.addAlertRule({
      name: 'high_response_time',
      condition: 'avg_response_time > threshold',
      threshold: this.config.alerts.responseTimeThreshold,
      severity: 'medium',
      enabled: true,
      channels: ['email', 'slack']
    });

    this.addAlertRule({
      name: 'high_error_rate',
      condition: 'error_rate > threshold',
      threshold: this.config.alerts.errorRateThreshold,
      severity: 'high',
      enabled: true,
      channels: ['email', 'slack', 'pagerduty']
    });

    this.addAlertRule({
      name: 'high_memory_usage',
      condition: 'memory_usage > threshold',
      threshold: this.config.alerts.memoryThreshold,
      severity: 'medium',
      enabled: true,
      channels: ['email']
    });
  }

  private static async checkService(serviceName: string): Promise<ServiceHealth> {
    const checkFn = this.healthChecks.get(serviceName);
    if (checkFn) {
      return await checkFn();
    }
    
    return {
      name: serviceName,
      status: 'unhealthy',
      lastCheck: new Date(),
      error: 'No health check registered'
    };
  }

  private static async checkExternalServices(): Promise<ServiceHealth[]> {
    // Mock external service checks
    return [
      {
        name: 'email_service',
        status: 'healthy',
        lastCheck: new Date()
      }
    ];
  }

  private static getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `${name}{${labelString}}`;
  }

  private static calculateErrorRate(): number {
    const totalRequests = this.metrics.get('http_requests_total');
    const errorRequests = Array.from(this.metrics.keys())
      .filter(key => key.includes('http_requests_total') && key.includes('status_code="5'))
      .reduce((sum, key) => sum + (this.metrics.get(key)?.count || 0), 0);
    
    const total = totalRequests?.count || 0;
    return total > 0 ? (errorRequests / total) * 100 : 0;
  }

  private static checkAlerts(responseTime: number, memoryUsage: number, statusCode: number): void {
    // Check response time alert
    if (responseTime > this.config.alerts.responseTimeThreshold) {
      this.triggerAlert('high_response_time', { responseTime });
    }

    // Check memory usage alert
    if (memoryUsage > this.config.alerts.memoryThreshold) {
      this.triggerAlert('high_memory_usage', { memoryUsage });
    }

    // Check error rate alert
    const errorRate = this.calculateErrorRate();
    if (errorRate > this.config.alerts.errorRateThreshold) {
      this.triggerAlert('high_error_rate', { errorRate });
    }
  }

  private static triggerAlert(alertName: string, data: any): void {
    const alert = this.alerts.find(a => a.name === alertName);
    if (!alert || !alert.enabled) return;

    logger.warn(`Alert triggered: ${alertName}`, {
      alert: alert.name,
      severity: alert.severity,
      threshold: alert.threshold,
      data
    });

    // In production, send alerts to configured channels
    // This could integrate with:
    // - Email services
    // - Slack/Teams
    // - PagerDuty
    // - SMS services
  }

  private static startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.recordMetric('system_memory_usage_bytes', memoryUsage.heapUsed);
      this.recordMetric('system_memory_total_bytes', memoryUsage.heapTotal);
      this.recordMetric('system_cpu_usage_percent', (cpuUsage.user + cpuUsage.system) / 1000);
      this.recordMetric('system_uptime_seconds', process.uptime());
      
      // Get performance metrics if available
      const perfMetrics = PerformanceOptimizer.getMetrics();
      if (perfMetrics.length > 0) {
        const latest = perfMetrics[perfMetrics.length - 1];
        this.recordMetric('performance_response_time_ms', latest.responseTime);
        this.recordMetric('performance_event_loop_lag_ms', latest.eventLoopLag);
      }
    }, 30000);
  }
}