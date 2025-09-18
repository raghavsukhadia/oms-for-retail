import { getMasterDb } from './database';
import { logger } from './logger';

export interface PlatformMetrics {
  overview: {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    activeUsers: number;
    totalVehicles: number;
    monthlyRevenue: number;
    storageUsed: number;
    apiRequests: number;
  };
  growth: {
    newTenants: number;
    newUsers: number;
    churnRate: number;
    growthRate: number;
  };
  performance: {
    averageResponseTime: number;
    uptime: number;
    errorRate: number;
    throughput: number;
  };
  usage: {
    topTenants: Array<{
      tenantId: string;
      companyName: string;
      userCount: number;
      vehicleCount: number;
      storageUsed: number;
      lastActivity: Date;
    }>;
    featureUsage: Record<string, number>;
    apiEndpointUsage: Record<string, number>;
  };
}

export interface TenantHealth {
  tenantId: string;
  companyName: string;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    userCount: number;
    activeUsers: number;
    vehicleCount: number;
    storageUsed: number;
    lastActivity: Date;
    averageResponseTime: number;
    errorRate: number;
  };
  issues: string[];
  recommendations: string[];
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    database: {
      status: 'healthy' | 'warning' | 'critical';
      responseTime: number;
      connections: number;
      diskUsage: number;
    };
    storage: {
      status: 'healthy' | 'warning' | 'critical';
      usagePercent: number;
      totalSpace: number;
      freeSpace: number;
    };
    api: {
      status: 'healthy' | 'warning' | 'critical';
      responseTime: number;
      requestsPerMinute: number;
      errorRate: number;
    };
    realtime: {
      status: 'healthy' | 'warning' | 'critical';
      connections: number;
      messageRate: number;
      uptime: number;
    };
  };
  alerts: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: string;
    message: string;
    timestamp: Date;
  }>;
}

export class PlatformAnalyticsEngine {
  /**
   * Get comprehensive platform metrics
   */
  static async getPlatformMetrics(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<PlatformMetrics> {
    try {
      const masterDb = await getMasterDb();
      
      const endDate = dateRange?.endDate || new Date();
      const startDate = dateRange?.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        overview,
        growth,
        performance,
        usage
      ] = await Promise.all([
        this.getOverviewMetrics(masterDb, startDate, endDate),
        this.getGrowthMetrics(masterDb, startDate, endDate),
        this.getPerformanceMetrics(masterDb, startDate, endDate),
        this.getUsageMetrics(masterDb, startDate, endDate)
      ]);

      return {
        overview,
        growth,
        performance,
        usage
      };
    } catch (error) {
      logger.error('Error getting platform metrics:', error);
      throw new Error('Failed to get platform metrics');
    }
  }

  /**
   * Get overview metrics
   */
  private static async getOverviewMetrics(
    masterDb: any,
    startDate: Date,
    endDate: Date
  ): Promise<PlatformMetrics['overview']> {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      activeUsers,
      tenantStats
    ] = await Promise.all([
      masterDb.tenant.count(),
      masterDb.tenant.count({
        where: {
          status: 'active',
          users: {
            some: {
              lastLoginAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
              }
            }
          }
        }
      }),
      masterDb.user.count(),
      masterDb.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      masterDb.tenant.findMany({
        include: {
          _count: {
            select: {
              users: true
            }
          }
        }
      })
    ]);

    // Mock metrics for fields that would require tenant database access
    const totalVehicles = tenantStats.length * 150; // Estimated
    const monthlyRevenue = totalTenants * 299; // Mock monthly revenue per tenant
    const storageUsed = totalTenants * 2.5; // GB per tenant
    const apiRequests = totalTenants * 10000; // Requests per tenant

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      activeUsers,
      totalVehicles,
      monthlyRevenue,
      storageUsed,
      apiRequests
    };
  }

  /**
   * Get growth metrics
   */
  private static async getGrowthMetrics(
    masterDb: any,
    startDate: Date,
    endDate: Date
  ): Promise<PlatformMetrics['growth']> {
    const [
      newTenants,
      newUsers,
      previousPeriodTenants,
      previousPeriodUsers
    ] = await Promise.all([
      masterDb.tenant.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      masterDb.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      masterDb.tenant.count({
        where: {
          createdAt: {
            lt: startDate
          }
        }
      }),
      masterDb.user.count({
        where: {
          createdAt: {
            lt: startDate
          }
        }
      })
    ]);

    const churnRate = previousPeriodTenants > 0 ? (0 / previousPeriodTenants) * 100 : 0; // Mock - no churn tracking yet
    const growthRate = previousPeriodTenants > 0 ? (newTenants / previousPeriodTenants) * 100 : 0;

    return {
      newTenants,
      newUsers,
      churnRate,
      growthRate
    };
  }

  /**
   * Get performance metrics
   */
  private static async getPerformanceMetrics(
    masterDb: any,
    startDate: Date,
    endDate: Date
  ): Promise<PlatformMetrics['performance']> {
    // Mock performance metrics - in real implementation, these would come from monitoring systems
    return {
      averageResponseTime: 145 + Math.random() * 50, // 145-195ms
      uptime: 99.8 + Math.random() * 0.19, // 99.8-99.99%
      errorRate: Math.random() * 0.5, // 0-0.5%
      throughput: 1200 + Math.random() * 300 // 1200-1500 requests/min
    };
  }

  /**
   * Get usage metrics
   */
  private static async getUsageMetrics(
    masterDb: any,
    startDate: Date,
    endDate: Date
  ): Promise<PlatformMetrics['usage']> {
    const tenants = await masterDb.tenant.findMany({
      include: {
        users: {
          select: {
            userId: true,
            lastLoginAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    const topTenants = tenants.map(tenant => ({
      tenantId: tenant.tenantId,
      companyName: tenant.companyName,
      userCount: tenant.users.length,
      vehicleCount: Math.floor(Math.random() * 200) + 50, // Mock data
      storageUsed: Math.floor(Math.random() * 5) + 1, // GB
      lastActivity: tenant.users.reduce((latest, user) => {
        if (user.lastLoginAt && (!latest || user.lastLoginAt > latest)) {
          return user.lastLoginAt;
        }
        return latest;
      }, null as Date | null) || tenant.createdAt
    }));

    // Mock feature usage data
    const featureUsage = {
      'vehicle_management': Math.floor(Math.random() * 1000) + 500,
      'workflow_engine': Math.floor(Math.random() * 800) + 300,
      'media_management': Math.floor(Math.random() * 600) + 200,
      'reporting': Math.floor(Math.random() * 400) + 100,
      'notifications': Math.floor(Math.random() * 1200) + 800
    };

    const apiEndpointUsage = {
      '/api/vehicles': Math.floor(Math.random() * 5000) + 2000,
      '/api/users': Math.floor(Math.random() * 3000) + 1000,
      '/api/workflows': Math.floor(Math.random() * 2000) + 800,
      '/api/media': Math.floor(Math.random() * 1500) + 600,
      '/api/dashboard': Math.floor(Math.random() * 4000) + 1500
    };

    return {
      topTenants,
      featureUsage,
      apiEndpointUsage
    };
  }

  /**
   * Get tenant health status
   */
  static async getTenantHealth(tenantId?: string): Promise<TenantHealth[]> {
    try {
      const masterDb = await getMasterDb();
      
      const whereClause = tenantId ? { tenantId } : {};
      const tenants = await masterDb.tenant.findMany({
        where: whereClause,
        include: {
          users: {
            select: {
              userId: true,
              lastLoginAt: true,
              status: true
            }
          }
        }
      });

      const tenantHealthData = await Promise.all(
        tenants.map(async (tenant) => {
          const activeUsers = tenant.users.filter(user => 
            user.status === 'active' && 
            user.lastLoginAt && 
            user.lastLoginAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length;

          const lastActivity = tenant.users.reduce((latest, user) => {
            if (user.lastLoginAt && (!latest || user.lastLoginAt > latest)) {
              return user.lastLoginAt;
            }
            return latest;
          }, null as Date | null) || tenant.createdAt;

          // Mock metrics that would require tenant database access
          const vehicleCount = Math.floor(Math.random() * 200) + 50;
          const storageUsed = Math.floor(Math.random() * 5) + 1;
          const averageResponseTime = 100 + Math.random() * 100;
          const errorRate = Math.random() * 1;

          // Determine health status
          let status: 'healthy' | 'warning' | 'critical' = 'healthy';
          const issues: string[] = [];
          const recommendations: string[] = [];

          if (activeUsers === 0) {
            status = 'warning';
            issues.push('No active users in the last 7 days');
            recommendations.push('Reach out to tenant for engagement');
          }

          if (errorRate > 2) {
            status = 'critical';
            issues.push('High error rate detected');
            recommendations.push('Investigate system issues');
          }

          if (averageResponseTime > 500) {
            if (status === 'healthy') status = 'warning';
            issues.push('Slow response times');
            recommendations.push('Optimize database queries');
          }

          return {
            tenantId: tenant.tenantId,
            companyName: tenant.companyName,
            status,
            metrics: {
              userCount: tenant.users.length,
              activeUsers,
              vehicleCount,
              storageUsed,
              lastActivity,
              averageResponseTime,
              errorRate
            },
            issues,
            recommendations
          };
        })
      );

      return tenantHealthData;
    } catch (error) {
      logger.error('Error getting tenant health:', error);
      throw new Error('Failed to get tenant health');
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    try {
      const masterDb = await getMasterDb();

      // Test database health
      const dbStart = Date.now();
      await masterDb.tenant.count();
      const dbResponseTime = Date.now() - dbStart;

      // Mock other system metrics
      const database = {
        status: dbResponseTime < 100 ? 'healthy' as const : dbResponseTime < 500 ? 'warning' as const : 'critical' as const,
        responseTime: dbResponseTime,
        connections: Math.floor(Math.random() * 50) + 10,
        diskUsage: Math.floor(Math.random() * 30) + 50 // 50-80%
      };

      const storage = {
        status: 'healthy' as const,
        usagePercent: Math.floor(Math.random() * 20) + 40, // 40-60%
        totalSpace: 1000, // GB
        freeSpace: 600 // GB
      };

      const api = {
        status: 'healthy' as const,
        responseTime: 145 + Math.random() * 50,
        requestsPerMinute: 1200 + Math.random() * 300,
        errorRate: Math.random() * 0.5
      };

      const realtime = {
        status: 'healthy' as const,
        connections: Math.floor(Math.random() * 100) + 50,
        messageRate: Math.floor(Math.random() * 1000) + 500,
        uptime: process.uptime()
      };

      // Determine overall status
      const componentStatuses = [database.status, storage.status, api.status, realtime.status];
      let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      if (componentStatuses.includes('critical')) {
        overall = 'critical';
      } else if (componentStatuses.includes('warning')) {
        overall = 'warning';
      }

      // Mock alerts
      const alerts: SystemHealth['alerts'] = [];
      
      if (database.responseTime > 500) {
        alerts.push({
          severity: 'high',
          component: 'database',
          message: 'Database response time is critically high',
          timestamp: new Date()
        });
      }

      if (storage.usagePercent > 80) {
        alerts.push({
          severity: 'medium',
          component: 'storage',
          message: 'Storage usage is approaching capacity',
          timestamp: new Date()
        });
      }

      return {
        overall,
        components: {
          database,
          storage,
          api,
          realtime
        },
        alerts
      };
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw new Error('Failed to get system health');
    }
  }

  /**
   * Get platform statistics for reporting
   */
  static async getPlatformStats(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    timeSeriesData: Array<{
      date: string;
      tenants: number;
      users: number;
      revenue: number;
      usage: number;
    }>;
    summary: {
      totalRevenue: number;
      averageGrowthRate: number;
      topPerformingTenants: string[];
      keyMetrics: Record<string, number>;
    };
  }> {
    try {
      const masterDb = await getMasterDb();
      
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7 * 12);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 12);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 5);
          break;
      }

      // Mock time series data
      const timeSeriesData = [];
      const intervals = 12; // 12 data points
      
      for (let i = 0; i < intervals; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (i * (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * intervals)));
        
        timeSeriesData.push({
          date: date.toISOString().split('T')[0],
          tenants: Math.floor(Math.random() * 50) + i * 5,
          users: Math.floor(Math.random() * 500) + i * 50,
          revenue: Math.floor(Math.random() * 5000) + i * 1000,
          usage: Math.floor(Math.random() * 1000) + i * 100
        });
      }

      const summary = {
        totalRevenue: timeSeriesData.reduce((sum, item) => sum + item.revenue, 0),
        averageGrowthRate: 15.5, // Mock growth rate
        topPerformingTenants: ['demo', 'test', 'enterprise_client'], // Mock tenant IDs
        keyMetrics: {
          conversionRate: 12.5,
          churnRate: 2.3,
          averageRevenuePerTenant: 299,
          customerLifetimeValue: 3600
        }
      };

      return {
        timeSeriesData,
        summary
      };
    } catch (error) {
      logger.error('Error getting platform stats:', error);
      throw new Error('Failed to get platform stats');
    }
  }
}