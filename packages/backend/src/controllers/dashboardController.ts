import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import { AnalyticsEngine, AnalyticsFilter } from '../lib/analytics';
import { emitDashboardUpdate, emitLiveMetrics } from '../lib/realTimeEvents';
import { ApiResponse } from '@omsms/shared';

// Validation schemas
const dashboardQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  locationIds: z.string().optional().transform(val => val ? val.split(',') : undefined),
  salespersonIds: z.string().optional().transform(val => val ? val.split(',') : undefined),
  vehicleStatuses: z.string().optional().transform(val => val ? val.split(',') : undefined),
  workflowStages: z.string().optional().transform(val => val ? val.split(',') : undefined),
  refreshInterval: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(5).max(300)).optional()
});

const kpiQuerySchema = z.object({
  metrics: z.string().optional().transform(val => val ? val.split(',') : ['all']),
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).optional().default('month')
});

export class DashboardController {
  /**
   * Get comprehensive dashboard data
   */
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const query = dashboardQuerySchema.parse(req.query);
      
      // Build analytics filter
      const filter: AnalyticsFilter = {};
      
      if (query.startDate && query.endDate) {
        filter.dateRange = {
          startDate: new Date(query.startDate),
          endDate: new Date(query.endDate)
        };
      }
      
      if (query.locationIds) filter.locationIds = query.locationIds;
      if (query.salespersonIds) filter.salespersonIds = query.salespersonIds;
      if (query.vehicleStatuses) filter.vehicleStatuses = query.vehicleStatuses;
      if (query.workflowStages) filter.workflowStages = query.workflowStages;

      const dashboardData = await AnalyticsEngine.generateDashboardData(req.tenantId, filter);

      const response: ApiResponse<typeof dashboardData> = {
        success: true,
        data: dashboardData,
        meta: {
          generatedAt: new Date(),
          filter,
          refreshInterval: query.refreshInterval
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get dashboard data error:', error);
      
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
        error: 'Failed to get dashboard data'
      } as ApiResponse);
    }
  }

  /**
   * Get real-time KPI metrics
   */
  static async getKPIMetrics(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const query = kpiQuerySchema.parse(req.query);
      const tenantDb = await getTenantDb(req.tenantId);

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (query.period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const [
        totalVehicles,
        activeVehicles,
        completedToday,
        avgProcessingTime,
        revenue,
        onlineUsers,
        systemStatus
      ] = await Promise.all([
        tenantDb.vehicle.count(),
        tenantDb.vehicle.count({
          where: { status: { in: ['pending', 'in_progress', 'quality_check'] } }
        }),
        tenantDb.vehicle.count({
          where: {
            status: 'delivered',
            actualDeliveryDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        DashboardController.calculateAverageProcessingTime(tenantDb, startDate, endDate),
        DashboardController.calculateRevenue(tenantDb, startDate, endDate),
        DashboardController.getOnlineUsersCount(req.tenantId),
        DashboardController.getSystemStatus(tenantDb)
      ]);

      const kpiData = {
        totalVehicles,
        activeVehicles,
        completedToday,
        avgProcessingTime,
        revenue,
        onlineUsers,
        systemStatus,
        lastUpdated: new Date()
      };

      // Emit real-time metrics
      emitLiveMetrics(req.tenantId, {
        category: 'kpi',
        metric: 'overview',
        value: totalVehicles,
        timestamp: new Date()
      });

      const response: ApiResponse<typeof kpiData> = {
        success: true,
        data: kpiData
      };

      res.json(response);
    } catch (error) {
      console.error('Get KPI metrics error:', error);
      
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
        error: 'Failed to get KPI metrics'
      } as ApiResponse);
    }
  }

  /**
   * Get activity feed for dashboard
   */
  static async getActivityFeed(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { limit = '20', offset = '0' } = req.query;
      const tenantDb = await getTenantDb(req.tenantId);

      const activities = await tenantDb.auditLog.findMany({
        include: {
          user: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        where: {
          action: {
            in: [
              'vehicle:created',
              'vehicle:updated',
              'vehicle:status_changed',
              'workflow:stage_completed',
              'media:uploaded',
              'user:login'
            ]
          }
        }
      });

      const formattedActivities = activities.map(activity => ({
        id: activity.logId,
        type: activity.action,
        message: DashboardController.formatActivityMessage(activity),
        user: activity.user,
        entityType: activity.entityType,
        entityId: activity.entityId,
        timestamp: activity.createdAt,
        metadata: activity.details
      }));

      const response: ApiResponse<typeof formattedActivities> = {
        success: true,
        data: formattedActivities,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: activities.length
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get activity feed error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get activity feed'
      } as ApiResponse);
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);

      const health = {
        database: {
          status: 'healthy',
          responseTime: await DashboardController.checkDatabaseResponseTime(tenantDb),
          lastCheck: new Date()
        },
        storage: {
          status: 'healthy',
          usagePercent: 45.6, // Mock data
          freeSpace: '2.3 TB'
        },
        realtime: {
          status: 'healthy',
          connections: await DashboardController.getOnlineUsersCount(req.tenantId),
          uptime: process.uptime()
        },
        api: {
          status: 'healthy',
          averageResponseTime: 156, // Mock data
          requestsPerMinute: 342
        }
      };

      const response: ApiResponse<typeof health> = {
        success: true,
        data: health
      };

      res.json(response);
    } catch (error) {
      console.error('Get system health error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system health'
      } as ApiResponse);
    }
  }

  /**
   * Trigger dashboard refresh for all connected users
   */
  static async refreshDashboard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      // Trigger real-time dashboard update
      emitDashboardUpdate(req.tenantId, {
        type: 'system_status',
        data: { refreshRequested: true },
        timestamp: new Date()
      });

      const response: ApiResponse = {
        success: true,
        message: 'Dashboard refresh triggered for all users'
      };

      res.json(response);
    } catch (error) {
      console.error('Refresh dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh dashboard'
      } as ApiResponse);
    }
  }

  // Helper methods
  private static async calculateAverageProcessingTime(
    tenantDb: any,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const completedWorkflows = await tenantDb.workflowInstance.findMany({
      where: {
        status: 'completed',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        startedAt: true,
        completedAt: true
      }
    });

    if (completedWorkflows.length === 0) return 0;

    const totalTime = completedWorkflows.reduce((sum, workflow) => {
      if (workflow.completedAt && workflow.startedAt) {
        return sum + (workflow.completedAt.getTime() - workflow.startedAt.getTime());
      }
      return sum;
    }, 0);

    return totalTime / completedWorkflows.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  private static async calculateRevenue(
    tenantDb: any,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const installations = await tenantDb.installation.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    });

    return Number(installations._sum.amount) || 0;
  }

  private static async getOnlineUsersCount(tenantId: string): Promise<number> {
    try {
      const { getSocketManager } = await import('../lib/socket');
      const socketManager = getSocketManager();
      return socketManager.getOnlineUsers(tenantId).length;
    } catch {
      return 0; // Return 0 if socket manager not available
    }
  }

  private static async getSystemStatus(tenantDb: any): Promise<string> {
    try {
      // Simple health check - try to execute a basic query
      await tenantDb.user.count();
      return 'healthy';
    } catch {
      return 'degraded';
    }
  }

  private static async checkDatabaseResponseTime(tenantDb: any): Promise<number> {
    const startTime = Date.now();
    try {
      await tenantDb.user.count();
      return Date.now() - startTime;
    } catch {
      return -1;
    }
  }

  private static formatActivityMessage(activity: any): string {
    const userName = activity.user 
      ? `${activity.user.firstName || ''} ${activity.user.lastName || ''}`.trim()
      : 'System';

    switch (activity.action) {
      case 'vehicle:created':
        return `${userName} created a new vehicle`;
      case 'vehicle:updated':
        return `${userName} updated vehicle details`;
      case 'vehicle:status_changed':
        return `${userName} changed vehicle status`;
      case 'workflow:stage_completed':
        return `${userName} completed a workflow stage`;
      case 'media:uploaded':
        return `${userName} uploaded media files`;
      case 'user:login':
        return `${userName} logged in`;
      default:
        return `${userName} performed an action`;
    }
  }
}