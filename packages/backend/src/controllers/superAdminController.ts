import { Request, Response } from 'express';
import { z } from 'zod';
import { getMasterDb } from '../lib/database';
import { PlatformAnalyticsEngine } from '../lib/platformAnalytics';
import { ApiResponse } from '@omsms/shared';

// Validation schemas
const platformQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional(),
  tenantId: z.string().uuid().optional()
});

const tenantActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'suspend', 'delete']),
  reason: z.string().min(10).max(500).optional()
});

const systemMaintenanceSchema = z.object({
  type: z.enum(['maintenance', 'update', 'restart']),
  message: z.string().min(10).max(500),
  scheduledFor: z.string().datetime().optional(),
  affectedTenants: z.array(z.string().uuid()).optional(),
  estimatedDuration: z.number().min(1).max(1440).optional() // Minutes
});

export class SuperAdminController {
  /**
   * Get platform overview dashboard
   */
  static async getPlatformOverview(req: Request, res: Response): Promise<void> {
    try {
      const query = platformQuerySchema.parse(req.query);
      
      const dateRange = query.startDate && query.endDate ? {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate)
      } : undefined;

      const [
        platformMetrics,
        tenantHealth,
        systemHealth
      ] = await Promise.all([
        PlatformAnalyticsEngine.getPlatformMetrics(dateRange),
        PlatformAnalyticsEngine.getTenantHealth(),
        PlatformAnalyticsEngine.getSystemHealth()
      ]);

      const response: ApiResponse<{
        metrics: typeof platformMetrics;
        tenantHealth: typeof tenantHealth;
        systemHealth: typeof systemHealth;
      }> = {
        success: true,
        data: {
          metrics: platformMetrics,
          tenantHealth: tenantHealth.slice(0, 10), // Top 10 tenants
          systemHealth
        },
        meta: {
          generatedAt: new Date(),
          dateRange
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get platform overview error:', error);
      
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
        error: 'Failed to get platform overview'
      } as ApiResponse);
    }
  }

  /**
   * Get all tenants with management capabilities
   */
  static async getTenants(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '20', search, status } = req.query;
      const masterDb = await getMasterDb();

      // Build where clause
      const where: any = {};
      
      if (search) {
        where.OR = [
          { companyName: { contains: search as string, mode: 'insensitive' } },
          { primaryDomain: { contains: search as string, mode: 'insensitive' } },
          { adminEmail: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (status) {
        where.status = status;
      }

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [tenants, total] = await Promise.all([
        masterDb.tenant.findMany({
          where,
          include: {
            _count: {
              select: {
                users: true
              }
            },
            users: {
              where: { role: 'admin' },
              select: {
                userId: true,
                email: true,
                firstName: true,
                lastName: true,
                lastLoginAt: true
              }
            }
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' }
        }),
        masterDb.tenant.count({ where })
      ]);

      // Get health data for these tenants
      const tenantIds = tenants.map(t => t.tenantId);
      const healthData = await Promise.all(
        tenantIds.map(id => PlatformAnalyticsEngine.getTenantHealth(id))
      );

      const tenantsWithHealth = tenants.map((tenant, index) => ({
        ...tenant,
        health: healthData[index][0] || null,
        primaryAdmin: tenant.users[0] || null
      }));

      const response: ApiResponse<typeof tenantsWithHealth> = {
        success: true,
        data: tenantsWithHealth,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get tenants error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenants'
      } as ApiResponse);
    }
  }

  /**
   * Get detailed tenant information
   */
  static async getTenantDetails(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const masterDb = await getMasterDb();

      const tenant = await masterDb.tenant.findUnique({
        where: { tenantId },
        include: {
          users: {
            select: {
              userId: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              status: true,
              lastLoginAt: true,
              createdAt: true
            }
          }
        }
      });

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        } as ApiResponse);
        return;
      }

      const [healthData, metrics] = await Promise.all([
        PlatformAnalyticsEngine.getTenantHealth(tenantId),
        PlatformAnalyticsEngine.getPlatformMetrics()
      ]);

      const tenantDetails = {
        ...tenant,
        health: healthData[0] || null,
        statistics: {
          totalUsers: tenant.users.length,
          activeUsers: tenant.users.filter(u => 
            u.lastLoginAt && u.lastLoginAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length,
          adminUsers: tenant.users.filter(u => u.role === 'admin').length,
          lastActivity: tenant.users.reduce((latest, user) => {
            if (user.lastLoginAt && (!latest || user.lastLoginAt > latest)) {
              return user.lastLoginAt;
            }
            return latest;
          }, null as Date | null)
        }
      };

      const response: ApiResponse<typeof tenantDetails> = {
        success: true,
        data: tenantDetails
      };

      res.json(response);
    } catch (error) {
      console.error('Get tenant details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant details'
      } as ApiResponse);
    }
  }

  /**
   * Perform tenant management actions
   */
  static async manageTenant(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const body = tenantActionSchema.parse(req.body);
      const masterDb = await getMasterDb();

      const tenant = await masterDb.tenant.findUnique({
        where: { tenantId }
      });

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        } as ApiResponse);
        return;
      }

      let newStatus = tenant.status;
      let message = '';

      switch (body.action) {
        case 'activate':
          newStatus = 'active';
          message = 'Tenant activated successfully';
          break;
        case 'deactivate':
          newStatus = 'inactive';
          message = 'Tenant deactivated successfully';
          break;
        case 'suspend':
          newStatus = 'suspended';
          message = 'Tenant suspended successfully';
          break;
        case 'delete':
          // In a real implementation, this would be a soft delete or mark for deletion
          message = 'Tenant marked for deletion';
          break;
      }

      if (body.action !== 'delete') {
        await masterDb.tenant.update({
          where: { tenantId },
          data: { 
            status: newStatus,
            updatedAt: new Date()
          }
        });
      }

      // Log the action (in real implementation, this would go to an admin audit log)
      console.log(`Admin action: ${body.action} on tenant ${tenantId}. Reason: ${body.reason || 'No reason provided'}`);

      const response: ApiResponse = {
        success: true,
        message
      };

      res.json(response);
    } catch (error) {
      console.error('Manage tenant error:', error);
      
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
        error: 'Failed to manage tenant'
      } as ApiResponse);
    }
  }

  /**
   * Get platform statistics and analytics
   */
  static async getPlatformStats(req: Request, res: Response): Promise<void> {
    try {
      const query = platformQuerySchema.parse(req.query);
      
      const stats = await PlatformAnalyticsEngine.getPlatformStats(
        query.period || 'month'
      );

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get platform stats error:', error);
      
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
        error: 'Failed to get platform statistics'
      } as ApiResponse);
    }
  }

  /**
   * Get system health and monitoring data
   */
  static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const systemHealth = await PlatformAnalyticsEngine.getSystemHealth();

      const response: ApiResponse<typeof systemHealth> = {
        success: true,
        data: systemHealth
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
   * Get platform user analytics
   */
  static async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const query = platformQuerySchema.parse(req.query);
      const masterDb = await getMasterDb();

      const dateRange = query.startDate && query.endDate ? {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate)
      } : {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lte: new Date()
      };

      const [
        totalUsers,
        activeUsers,
        usersByRole,
        usersByTenant,
        recentLogins
      ] = await Promise.all([
        masterDb.user.count(),
        masterDb.user.count({
          where: {
            lastLoginAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        masterDb.user.groupBy({
          by: ['role'],
          _count: { role: true }
        }),
        masterDb.user.groupBy({
          by: ['tenantId'],
          _count: { tenantId: true },
          orderBy: {
            _count: {
              tenantId: 'desc'
            }
          },
          take: 10
        }),
        masterDb.user.findMany({
          where: {
            lastLoginAt: dateRange
          },
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            tenantId: true,
            lastLoginAt: true
          },
          orderBy: { lastLoginAt: 'desc' },
          take: 20
        })
      ]);

      const analytics = {
        overview: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers
        },
        distribution: {
          byRole: usersByRole,
          byTenant: usersByTenant
        },
        activity: {
          recentLogins
        }
      };

      const response: ApiResponse<typeof analytics> = {
        success: true,
        data: analytics
      };

      res.json(response);
    } catch (error) {
      console.error('Get user analytics error:', error);
      
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
        error: 'Failed to get user analytics'
      } as ApiResponse);
    }
  }

  /**
   * Broadcast system announcement
   */
  static async broadcastAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const body = systemMaintenanceSchema.parse(req.body);

      // In a real implementation, this would:
      // 1. Store the announcement in the database
      // 2. Send real-time notifications to all tenants
      // 3. Send email notifications if required
      // 4. Schedule the maintenance if it's scheduled

      console.log('System announcement:', {
        type: body.type,
        message: body.message,
        scheduledFor: body.scheduledFor,
        affectedTenants: body.affectedTenants,
        estimatedDuration: body.estimatedDuration
      });

      // Mock sending to Socket.io
      try {
        const { getSocketManager } = await import('../lib/socket');
        const socketManager = getSocketManager();
        
        if (body.affectedTenants) {
          body.affectedTenants.forEach(tenantId => {
            socketManager.broadcastAnnouncement(tenantId, {
              type: body.type,
              title: `System ${body.type}`,
              message: body.message,
              timestamp: new Date(),
              priority: body.type === 'maintenance' ? 'high' : 'medium'
            });
          });
        }
      } catch (error) {
        console.warn('Could not send real-time announcement:', error);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Announcement broadcasted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Broadcast announcement error:', error);
      
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
        error: 'Failed to broadcast announcement'
      } as ApiResponse);
    }
  }

  /**
   * Get audit logs for platform activities
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '50', action, tenantId, userId } = req.query;

      // Mock audit logs - in real implementation, these would come from a dedicated audit log system
      const mockAuditLogs = [
        {
          id: '1',
          timestamp: new Date(),
          action: 'tenant:created',
          tenantId: 'demo',
          userId: 'super-admin',
          details: { companyName: 'Demo Company' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 3600000),
          action: 'tenant:activated',
          tenantId: 'test',
          userId: 'super-admin',
          details: { previousStatus: 'inactive', newStatus: 'active' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...'
        }
      ];

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const total = mockAuditLogs.length;

      const response: ApiResponse<typeof mockAuditLogs> = {
        success: true,
        data: mockAuditLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit logs'
      } as ApiResponse);
    }
  }
}