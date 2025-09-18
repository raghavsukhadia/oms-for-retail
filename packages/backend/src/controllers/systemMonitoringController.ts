import { Request, Response } from 'express';
import { z } from 'zod';
import { getMasterDb } from '../lib/database';
import { ApiResponse } from '@omsms/shared';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Validation schemas
const alertSchema = z.object({
  type: z.enum(['info', 'warning', 'error', 'critical']),
  component: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  metadata: z.record(z.any()).optional()
});

const metricQuerySchema = z.object({
  metric: z.enum(['cpu', 'memory', 'disk', 'network', 'database']),
  period: z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h'),
  resolution: z.enum(['1m', '5m', '15m', '1h']).optional().default('5m')
});

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
  };
}

export interface DatabaseMetrics {
  timestamp: Date;
  connections: {
    active: number;
    idle: number;
    total: number;
    maxConnections: number;
  };
  performance: {
    averageQueryTime: number;
    slowQueries: number;
    queriesPerSecond: number;
  };
  storage: {
    databaseSize: number;
    indexSize: number;
    freeSpace: number;
  };
  replication: {
    status: 'healthy' | 'lagging' | 'disconnected';
    lag: number;
  };
}

export class SystemMonitoringController {
  /**
   * Get current system metrics
   */
  static async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await SystemMonitoringController.collectSystemMetrics();

      const response: ApiResponse<SystemMetrics> = {
        success: true,
        data: metrics
      };

      res.json(response);
    } catch (error) {
      console.error('Get system metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system metrics'
      } as ApiResponse);
    }
  }

  /**
   * Get database performance metrics
   */
  static async getDatabaseMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await SystemMonitoringController.collectDatabaseMetrics();

      const response: ApiResponse<DatabaseMetrics> = {
        success: true,
        data: metrics
      };

      res.json(response);
    } catch (error) {
      console.error('Get database metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get database metrics'
      } as ApiResponse);
    }
  }

  /**
   * Get historical metrics data
   */
  static async getHistoricalMetrics(req: Request, res: Response): Promise<void> {
    try {
      const query = metricQuerySchema.parse(req.query);
      
      // Generate mock historical data based on the query
      const historicalData = await SystemMonitoringController.generateHistoricalData(
        query.metric,
        query.period,
        query.resolution
      );

      const response: ApiResponse<typeof historicalData> = {
        success: true,
        data: historicalData,
        meta: {
          metric: query.metric,
          period: query.period,
          resolution: query.resolution
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get historical metrics error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get historical metrics'
      } as ApiResponse);
    }
  }

  /**
   * Get system alerts and notifications
   */
  static async getSystemAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { severity, component, limit = '50' } = req.query;

      // Mock alerts - in real implementation, these would come from a monitoring system
      const alerts = [
        {
          id: '1',
          timestamp: new Date(),
          severity: 'warning',
          component: 'database',
          message: 'Database connection pool is running low',
          metadata: { connections: 15, maxConnections: 20 },
          resolved: false
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1800000), // 30 min ago
          severity: 'info',
          component: 'api',
          message: 'High API request volume detected',
          metadata: { requestsPerMinute: 1500, threshold: 1000 },
          resolved: true
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          severity: 'error',
          component: 'storage',
          message: 'Disk usage is approaching critical levels',
          metadata: { usagePercent: 85, threshold: 80 },
          resolved: false
        }
      ];

      // Filter alerts based on query parameters
      let filteredAlerts = alerts;
      
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
      }
      
      if (component) {
        filteredAlerts = filteredAlerts.filter(alert => alert.component === component);
      }

      const limitNum = parseInt(limit as string);
      const paginatedAlerts = filteredAlerts.slice(0, limitNum);

      const response: ApiResponse<typeof paginatedAlerts> = {
        success: true,
        data: paginatedAlerts,
        meta: {
          total: filteredAlerts.length,
          unresolved: filteredAlerts.filter(a => !a.resolved).length
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get system alerts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system alerts'
      } as ApiResponse);
    }
  }

  /**
   * Create new system alert
   */
  static async createAlert(req: Request, res: Response): Promise<void> {
    try {
      const body = alertSchema.parse(req.body);

      // In real implementation, this would:
      // 1. Store the alert in a monitoring database
      // 2. Send notifications based on severity
      // 3. Trigger automated responses if configured

      const alert = {
        id: `alert_${Date.now()}`,
        timestamp: new Date(),
        severity: body.type,
        component: body.component,
        message: body.message,
        metadata: body.metadata || {},
        resolved: false
      };

      console.log('New system alert created:', alert);

      const response: ApiResponse<typeof alert> = {
        success: true,
        data: alert,
        message: 'Alert created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create alert error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create alert'
      } as ApiResponse);
    }
  }

  /**
   * Get system performance summary
   */
  static async getPerformanceSummary(req: Request, res: Response): Promise<void> {
    try {
      const [systemMetrics, databaseMetrics] = await Promise.all([
        SystemMonitoringController.collectSystemMetrics(),
        SystemMonitoringController.collectDatabaseMetrics()
      ]);

      // Calculate performance scores
      const cpuScore = Math.max(0, 100 - systemMetrics.cpu.usage);
      const memoryScore = Math.max(0, 100 - systemMetrics.memory.usagePercent);
      const diskScore = Math.max(0, 100 - systemMetrics.disk.usagePercent);
      const dbScore = Math.max(0, 100 - (databaseMetrics.performance.averageQueryTime / 10));

      const overallScore = Math.round((cpuScore + memoryScore + diskScore + dbScore) / 4);

      const summary = {
        overallScore,
        status: overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good' : overallScore >= 40 ? 'fair' : 'poor',
        components: {
          cpu: { score: Math.round(cpuScore), status: cpuScore >= 70 ? 'healthy' : 'warning' },
          memory: { score: Math.round(memoryScore), status: memoryScore >= 70 ? 'healthy' : 'warning' },
          disk: { score: Math.round(diskScore), status: diskScore >= 70 ? 'healthy' : 'warning' },
          database: { score: Math.round(dbScore), status: dbScore >= 70 ? 'healthy' : 'warning' }
        },
        recommendations: SystemMonitoringController.generateRecommendations(systemMetrics, databaseMetrics),
        lastUpdated: new Date()
      };

      const response: ApiResponse<typeof summary> = {
        success: true,
        data: summary
      };

      res.json(response);
    } catch (error) {
      console.error('Get performance summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get performance summary'
      } as ApiResponse);
    }
  }

  /**
   * Get resource usage forecast
   */
  static async getResourceForecast(req: Request, res: Response): Promise<void> {
    try {
      const { resource = 'all', period = '7d' } = req.query;

      // Mock forecast data - in real implementation, this would use ML models
      const forecast = {
        cpu: {
          current: 45.2,
          predicted: [
            { date: new Date(Date.now() + 24 * 60 * 60 * 1000), value: 47.1 },
            { date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), value: 49.3 },
            { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), value: 51.8 },
            { date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), value: 48.9 },
            { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), value: 52.4 },
            { date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), value: 54.7 },
            { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), value: 53.2 }
          ],
          trend: 'increasing',
          confidence: 0.87
        },
        memory: {
          current: 67.8,
          predicted: [
            { date: new Date(Date.now() + 24 * 60 * 60 * 1000), value: 69.2 },
            { date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), value: 70.5 },
            { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), value: 72.1 },
            { date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), value: 71.8 },
            { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), value: 73.4 },
            { date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), value: 75.2 },
            { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), value: 76.9 }
          ],
          trend: 'increasing',
          confidence: 0.92
        },
        disk: {
          current: 34.5,
          predicted: [
            { date: new Date(Date.now() + 24 * 60 * 60 * 1000), value: 35.1 },
            { date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), value: 35.8 },
            { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), value: 36.4 },
            { date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), value: 37.1 },
            { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), value: 37.7 },
            { date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), value: 38.3 },
            { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), value: 39.0 }
          ],
          trend: 'stable',
          confidence: 0.95
        }
      };

      const response: ApiResponse<typeof forecast> = {
        success: true,
        data: forecast,
        meta: {
          resource,
          period,
          generatedAt: new Date()
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get resource forecast error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get resource forecast'
      } as ApiResponse);
    }
  }

  // Helper methods

  private static async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Mock disk usage - in real implementation, use fs.statSync or similar
    const mockDiskTotal = 1000 * 1024 * 1024 * 1024; // 1TB
    const mockDiskUsed = 350 * 1024 * 1024 * 1024; // 350GB
    const mockDiskFree = mockDiskTotal - mockDiskUsed;

    return {
      timestamp: new Date(),
      cpu: {
        usage: Math.random() * 100, // Mock CPU usage
        loadAverage: os.loadavg(),
        cores: cpus.length
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: (usedMem / totalMem) * 100
      },
      disk: {
        total: mockDiskTotal,
        used: mockDiskUsed,
        free: mockDiskFree,
        usagePercent: (mockDiskUsed / mockDiskTotal) * 100
      },
      network: {
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 1000000),
        packetsIn: Math.floor(Math.random() * 10000),
        packetsOut: Math.floor(Math.random() * 10000)
      },
      processes: {
        total: Math.floor(Math.random() * 200) + 100,
        running: Math.floor(Math.random() * 50) + 10,
        sleeping: Math.floor(Math.random() * 150) + 90
      }
    };
  }

  private static async collectDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      const masterDb = await getMasterDb();
      
      // Basic database test
      const start = Date.now();
      await masterDb.tenant.count();
      const queryTime = Date.now() - start;

      return {
        timestamp: new Date(),
        connections: {
          active: Math.floor(Math.random() * 20) + 5,
          idle: Math.floor(Math.random() * 10) + 2,
          total: Math.floor(Math.random() * 30) + 7,
          maxConnections: 100
        },
        performance: {
          averageQueryTime: queryTime,
          slowQueries: Math.floor(Math.random() * 5),
          queriesPerSecond: Math.floor(Math.random() * 1000) + 500
        },
        storage: {
          databaseSize: Math.floor(Math.random() * 10) + 5, // GB
          indexSize: Math.floor(Math.random() * 2) + 1, // GB
          freeSpace: Math.floor(Math.random() * 100) + 50 // GB
        },
        replication: {
          status: 'healthy',
          lag: Math.floor(Math.random() * 100) // ms
        }
      };
    } catch (error) {
      throw new Error('Failed to collect database metrics');
    }
  }

  private static async generateHistoricalData(
    metric: string,
    period: string,
    resolution: string
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    // Calculate number of data points based on period and resolution
    const periodMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[period] || 24 * 60 * 60 * 1000;

    const resolutionMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000
    }[resolution] || 5 * 60 * 1000;

    const dataPoints = Math.floor(periodMs / resolutionMs);
    const endTime = Date.now();
    const startTime = endTime - periodMs;

    const data = [];
    for (let i = 0; i < dataPoints; i++) {
      const timestamp = new Date(startTime + (i * resolutionMs));
      
      // Generate realistic mock data based on metric type
      let value;
      switch (metric) {
        case 'cpu':
          value = 30 + Math.sin(i / 10) * 20 + Math.random() * 10;
          break;
        case 'memory':
          value = 60 + Math.sin(i / 20) * 15 + Math.random() * 5;
          break;
        case 'disk':
          value = 35 + i * 0.01 + Math.random() * 2; // Gradual increase
          break;
        case 'network':
          value = 1000 + Math.sin(i / 5) * 500 + Math.random() * 200;
          break;
        case 'database':
          value = 50 + Math.sin(i / 8) * 30 + Math.random() * 15;
          break;
        default:
          value = Math.random() * 100;
      }

      data.push({
        timestamp,
        value: Math.max(0, Math.min(100, value)) // Clamp between 0-100
      });
    }

    return data;
  }

  private static generateRecommendations(
    systemMetrics: SystemMetrics,
    databaseMetrics: DatabaseMetrics
  ): string[] {
    const recommendations = [];

    if (systemMetrics.cpu.usage > 80) {
      recommendations.push('Consider scaling up CPU resources or optimizing high-CPU processes');
    }

    if (systemMetrics.memory.usagePercent > 85) {
      recommendations.push('Memory usage is high. Consider increasing memory allocation or optimizing memory-intensive applications');
    }

    if (systemMetrics.disk.usagePercent > 80) {
      recommendations.push('Disk space is running low. Consider cleanup or adding more storage capacity');
    }

    if (databaseMetrics.performance.averageQueryTime > 100) {
      recommendations.push('Database queries are slow. Consider optimizing queries or adding database indexes');
    }

    if (databaseMetrics.connections.active / databaseMetrics.connections.maxConnections > 0.8) {
      recommendations.push('Database connection pool is running high. Consider increasing max connections or optimizing connection usage');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is performing well. Continue monitoring for optimal performance');
    }

    return recommendations;
  }
}