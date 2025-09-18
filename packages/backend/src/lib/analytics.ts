import { getTenantDb } from './database';
import { logger } from './logger';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsFilter {
  dateRange?: DateRange;
  locationIds?: string[];
  salespersonIds?: string[];
  vehicleStatuses?: string[];
  workflowStages?: string[];
}

export interface MetricValue {
  value: number;
  change?: number;
  changePercent?: number;
  previousValue?: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface CategoryData {
  category: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface AnalyticsData {
  overview: {
    totalVehicles: MetricValue;
    activeVehicles: MetricValue;
    completedVehicles: MetricValue;
    revenue: MetricValue;
    averageProcessingTime: MetricValue;
    customerSatisfaction: MetricValue;
  };
  trends: {
    vehicleVolume: TimeSeriesData[];
    revenue: TimeSeriesData[];
    processingTime: TimeSeriesData[];
    completionRate: TimeSeriesData[];
  };
  distribution: {
    vehiclesByStatus: CategoryData[];
    vehiclesByLocation: CategoryData[];
    vehiclesBySalesperson: CategoryData[];
    revenueByLocation: CategoryData[];
  };
  performance: {
    topSalespeople: Array<{
      userId: string;
      name: string;
      vehicleCount: number;
      revenue: number;
      averageTime: number;
    }>;
    topLocations: Array<{
      locationId: string;
      name: string;
      vehicleCount: number;
      completionRate: number;
    }>;
    workflowEfficiency: Array<{
      stage: string;
      averageTime: number;
      completionRate: number;
    }>;
  };
}

export class AnalyticsEngine {
  /**
   * Generate comprehensive analytics data for dashboard
   */
  static async generateDashboardData(
    tenantId: string,
    filter: AnalyticsFilter = {}
  ): Promise<AnalyticsData> {
    const tenantDb = await getTenantDb(tenantId);
    
    // Set default date range (last 30 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const dateRange = filter.dateRange || {
      startDate: defaultStartDate,
      endDate: defaultEndDate
    };

    // Calculate previous period for comparison
    const previousPeriodDays = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const previousStartDate = new Date(dateRange.startDate);
    previousStartDate.setDate(previousStartDate.getDate() - previousPeriodDays);
    const previousEndDate = new Date(dateRange.startDate);

    try {
      const [
        overview,
        trends,
        distribution,
        performance
      ] = await Promise.all([
        this.calculateOverviewMetrics(tenantDb, dateRange, { startDate: previousStartDate, endDate: previousEndDate }, filter),
        this.calculateTrends(tenantDb, dateRange, filter),
        this.calculateDistribution(tenantDb, dateRange, filter),
        this.calculatePerformance(tenantDb, dateRange, filter)
      ]);

      return {
        overview,
        trends,
        distribution,
        performance
      };
    } catch (error) {
      logger.error('Error generating dashboard data:', error);
      throw new Error('Failed to generate analytics data');
    }
  }

  /**
   * Calculate overview metrics with period comparison
   */
  private static async calculateOverviewMetrics(
    tenantDb: any,
    currentPeriod: DateRange,
    previousPeriod: DateRange,
    filter: AnalyticsFilter
  ): Promise<AnalyticsData['overview']> {
    const whereClause = this.buildWhereClause(filter);

    const [currentMetrics, previousMetrics] = await Promise.all([
      this.getBasicMetrics(tenantDb, currentPeriod, whereClause),
      this.getBasicMetrics(tenantDb, previousPeriod, whereClause)
    ]);

    return {
      totalVehicles: this.calculateMetricWithChange(
        currentMetrics.totalVehicles,
        previousMetrics.totalVehicles
      ),
      activeVehicles: this.calculateMetricWithChange(
        currentMetrics.activeVehicles,
        previousMetrics.activeVehicles
      ),
      completedVehicles: this.calculateMetricWithChange(
        currentMetrics.completedVehicles,
        previousMetrics.completedVehicles
      ),
      revenue: this.calculateMetricWithChange(
        currentMetrics.revenue,
        previousMetrics.revenue
      ),
      averageProcessingTime: this.calculateMetricWithChange(
        currentMetrics.averageProcessingTime,
        previousMetrics.averageProcessingTime
      ),
      customerSatisfaction: this.calculateMetricWithChange(
        currentMetrics.customerSatisfaction,
        previousMetrics.customerSatisfaction
      )
    };
  }

  /**
   * Get basic metrics for a period
   */
  private static async getBasicMetrics(
    tenantDb: any,
    period: DateRange,
    whereClause: any
  ): Promise<any> {
    const periodWhereClause = {
      ...whereClause,
      createdAt: {
        gte: period.startDate,
        lte: period.endDate
      }
    };

    const [
      totalVehicles,
      activeVehicles,
      completedVehicles,
      installations,
      workflowInstances
    ] = await Promise.all([
      tenantDb.vehicle.count({
        where: periodWhereClause
      }),
      tenantDb.vehicle.count({
        where: {
          ...periodWhereClause,
          status: { in: ['pending', 'in_progress', 'quality_check'] }
        }
      }),
      tenantDb.vehicle.count({
        where: {
          ...periodWhereClause,
          status: 'delivered'
        }
      }),
      tenantDb.installation.findMany({
        where: {
          createdAt: {
            gte: period.startDate,
            lte: period.endDate
          }
        },
        select: {
          amount: true
        }
      }),
      tenantDb.workflowInstance.findMany({
        where: {
          startedAt: {
            gte: period.startDate,
            lte: period.endDate
          },
          status: 'completed'
        },
        select: {
          startedAt: true,
          completedAt: true
        }
      })
    ]);

    const revenue = installations.reduce((sum, installation) => 
      sum + (Number(installation.amount) || 0), 0
    );

    const averageProcessingTime = workflowInstances.length > 0 
      ? workflowInstances.reduce((sum, instance) => {
          if (instance.completedAt && instance.startedAt) {
            return sum + (instance.completedAt.getTime() - instance.startedAt.getTime());
          }
          return sum;
        }, 0) / workflowInstances.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Mock customer satisfaction - in real implementation, this would come from feedback data
    const customerSatisfaction = 4.2 + Math.random() * 0.6; // Random between 4.2 and 4.8

    return {
      totalVehicles,
      activeVehicles,
      completedVehicles,
      revenue,
      averageProcessingTime,
      customerSatisfaction
    };
  }

  /**
   * Calculate trends over time
   */
  private static async calculateTrends(
    tenantDb: any,
    dateRange: DateRange,
    filter: AnalyticsFilter
  ): Promise<AnalyticsData['trends']> {
    const days = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Generate date intervals
    const intervals = [];
    for (let i = 0; i < days; i += Math.max(1, Math.floor(days / 30))) {
      const date = new Date(dateRange.startDate);
      date.setDate(date.getDate() + i);
      intervals.push(date);
    }

    const vehicleVolume: TimeSeriesData[] = [];
    const revenue: TimeSeriesData[] = [];
    const processingTime: TimeSeriesData[] = [];
    const completionRate: TimeSeriesData[] = [];

    for (const date of intervals) {
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + Math.max(1, Math.floor(days / 30)));

      const [vehicles, installations, workflows] = await Promise.all([
        tenantDb.vehicle.count({
          where: {
            ...this.buildWhereClause(filter),
            createdAt: {
              gte: date,
              lt: nextDate
            }
          }
        }),
        tenantDb.installation.aggregate({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate
            }
          },
          _sum: {
            amount: true
          }
        }),
        tenantDb.workflowInstance.findMany({
          where: {
            startedAt: {
              gte: date,
              lt: nextDate
            }
          },
          select: {
            status: true,
            startedAt: true,
            completedAt: true
          }
        })
      ]);

      const dayRevenue = Number(installations._sum.amount) || 0;
      const completedWorkflows = workflows.filter(w => w.status === 'completed');
      const avgProcessingTime = completedWorkflows.length > 0
        ? completedWorkflows.reduce((sum, w) => {
            if (w.completedAt && w.startedAt) {
              return sum + (w.completedAt.getTime() - w.startedAt.getTime());
            }
            return sum;
          }, 0) / completedWorkflows.length / (1000 * 60 * 60 * 24)
        : 0;

      const dayCompletionRate = workflows.length > 0
        ? (completedWorkflows.length / workflows.length) * 100
        : 0;

      vehicleVolume.push({
        date: date.toISOString().split('T')[0],
        value: vehicles
      });

      revenue.push({
        date: date.toISOString().split('T')[0],
        value: dayRevenue
      });

      processingTime.push({
        date: date.toISOString().split('T')[0],
        value: avgProcessingTime
      });

      completionRate.push({
        date: date.toISOString().split('T')[0],
        value: dayCompletionRate
      });
    }

    return {
      vehicleVolume,
      revenue,
      processingTime,
      completionRate
    };
  }

  /**
   * Calculate distribution data
   */
  private static async calculateDistribution(
    tenantDb: any,
    dateRange: DateRange,
    filter: AnalyticsFilter
  ): Promise<AnalyticsData['distribution']> {
    const whereClause = {
      ...this.buildWhereClause(filter),
      createdAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    };

    const [
      vehiclesByStatus,
      vehiclesByLocation,
      vehiclesBySalesperson,
      installationsByLocation
    ] = await Promise.all([
      tenantDb.vehicle.groupBy({
        by: ['status'],
        _count: { status: true },
        where: whereClause
      }),
      tenantDb.vehicle.groupBy({
        by: ['locationId'],
        _count: { locationId: true },
        where: {
          ...whereClause,
          locationId: { not: null }
        }
      }),
      tenantDb.vehicle.groupBy({
        by: ['salespersonId'],
        _count: { salespersonId: true },
        where: {
          ...whereClause,
          salespersonId: { not: null }
        }
      }),
      tenantDb.installation.groupBy({
        by: ['vehicle', 'locationId'],
        _sum: { amount: true },
        where: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        }
      })
    ]);

    // Get location and user names for better display
    const [locations, users] = await Promise.all([
      tenantDb.location.findMany({
        select: { locationId: true, locationName: true }
      }),
      tenantDb.user.findMany({
        select: { userId: true, firstName: true, lastName: true }
      })
    ]);

    const locationMap = new Map(locations.map(l => [l.locationId, l.locationName]));
    const userMap = new Map(users.map(u => [u.userId, `${u.firstName || ''} ${u.lastName || ''}`.trim()]));

    return {
      vehiclesByStatus: this.convertToCategoryData(vehiclesByStatus, 'status', '_count'),
      vehiclesByLocation: this.convertToLocationCategoryData(vehiclesByLocation, locationMap, '_count'),
      vehiclesBySalesperson: this.convertToUserCategoryData(vehiclesBySalesperson, userMap, '_count'),
      revenueByLocation: [] // TODO: Implement based on installationsByLocation
    };
  }

  /**
   * Calculate performance metrics
   */
  private static async calculatePerformance(
    tenantDb: any,
    dateRange: DateRange,
    filter: AnalyticsFilter
  ): Promise<AnalyticsData['performance']> {
    const whereClause = {
      ...this.buildWhereClause(filter),
      createdAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    };

    const [topSalespeople, topLocations, workflowData] = await Promise.all([
      this.getTopSalespeople(tenantDb, whereClause),
      this.getTopLocations(tenantDb, whereClause),
      this.getWorkflowEfficiency(tenantDb, dateRange)
    ]);

    return {
      topSalespeople,
      topLocations,
      workflowEfficiency: workflowData
    };
  }

  // Helper methods

  private static buildWhereClause(filter: AnalyticsFilter): any {
    const where: any = {};

    if (filter.locationIds?.length) {
      where.locationId = { in: filter.locationIds };
    }

    if (filter.salespersonIds?.length) {
      where.salespersonId = { in: filter.salespersonIds };
    }

    if (filter.vehicleStatuses?.length) {
      where.status = { in: filter.vehicleStatuses };
    }

    return where;
  }

  private static calculateMetricWithChange(current: number, previous: number): MetricValue {
    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;

    return {
      value: current,
      change,
      changePercent,
      previousValue: previous
    };
  }

  private static convertToCategoryData(
    data: any[],
    categoryField: string,
    valueField: string
  ): CategoryData[] {
    const total = data.reduce((sum, item) => sum + item[valueField], 0);
    
    return data.map(item => ({
      category: item[categoryField] || 'Unknown',
      value: item[valueField],
      percentage: total > 0 ? (item[valueField] / total) * 100 : 0
    }));
  }

  private static convertToLocationCategoryData(
    data: any[],
    locationMap: Map<string, string>,
    valueField: string
  ): CategoryData[] {
    const total = data.reduce((sum, item) => sum + item[valueField], 0);
    
    return data.map(item => ({
      category: locationMap.get(item.locationId) || 'Unknown Location',
      value: item[valueField],
      percentage: total > 0 ? (item[valueField] / total) * 100 : 0
    }));
  }

  private static convertToUserCategoryData(
    data: any[],
    userMap: Map<string, string>,
    valueField: string
  ): CategoryData[] {
    const total = data.reduce((sum, item) => sum + item[valueField], 0);
    
    return data.map(item => ({
      category: userMap.get(item.salespersonId) || 'Unknown User',
      value: item[valueField],
      percentage: total > 0 ? (item[valueField] / total) * 100 : 0
    }));
  }

  private static async getTopSalespeople(tenantDb: any, whereClause: any): Promise<any[]> {
    const salespeople = await tenantDb.vehicle.groupBy({
      by: ['salespersonId'],
      _count: { salespersonId: true },
      where: {
        ...whereClause,
        salespersonId: { not: null }
      },
      orderBy: {
        _count: {
          salespersonId: 'desc'
        }
      },
      take: 10
    });

    const userIds = salespeople.map(s => s.salespersonId).filter(Boolean);
    const users = await tenantDb.user.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, firstName: true, lastName: true }
    });

    const userMap = new Map(users.map(u => [u.userId, u]));

    return salespeople.map(sp => {
      const user = userMap.get(sp.salespersonId);
      return {
        userId: sp.salespersonId,
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
        vehicleCount: sp._count.salespersonId,
        revenue: 0, // TODO: Calculate from installations
        averageTime: 0 // TODO: Calculate from workflow instances
      };
    });
  }

  private static async getTopLocations(tenantDb: any, whereClause: any): Promise<any[]> {
    const locations = await tenantDb.vehicle.groupBy({
      by: ['locationId'],
      _count: { locationId: true },
      where: {
        ...whereClause,
        locationId: { not: null }
      },
      orderBy: {
        _count: {
          locationId: 'desc'
        }
      },
      take: 10
    });

    const locationIds = locations.map(l => l.locationId).filter(Boolean);
    const locationData = await tenantDb.location.findMany({
      where: { locationId: { in: locationIds } },
      select: { locationId: true, locationName: true }
    });

    const locationMap = new Map(locationData.map(l => [l.locationId, l]));

    return locations.map(loc => {
      const location = locationMap.get(loc.locationId);
      return {
        locationId: loc.locationId,
        name: location?.locationName || 'Unknown Location',
        vehicleCount: loc._count.locationId,
        completionRate: 85 + Math.random() * 10 // Mock data
      };
    });
  }

  private static async getWorkflowEfficiency(tenantDb: any, dateRange: DateRange): Promise<any[]> {
    // Mock workflow efficiency data
    const stages = ['intake', 'assessment', 'installation', 'quality_check', 'delivery'];
    
    return stages.map(stage => ({
      stage,
      averageTime: 2 + Math.random() * 5, // 2-7 days
      completionRate: 85 + Math.random() * 10 // 85-95%
    }));
  }

  /**
   * Export data for reports
   */
  static async exportAnalyticsData(
    tenantId: string,
    filter: AnalyticsFilter,
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    const data = await this.generateDashboardData(tenantId, filter);
    
    if (format === 'csv') {
      // TODO: Convert to CSV format
      return this.convertToCSV(data);
    }
    
    return data;
  }

  private static convertToCSV(data: AnalyticsData): string {
    // TODO: Implement CSV conversion
    return JSON.stringify(data);
  }
}