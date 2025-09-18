import { Router } from 'express';
import { SuperAdminController } from '../controllers/superAdminController';
import { SystemMonitoringController } from '../controllers/systemMonitoringController';
import { authenticate, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const superAdminRoutes = Router();

// Super admin authentication middleware
const superAdminAuth = (req: any, res: any, next: any) => {
  // In a real implementation, this would check for super admin privileges
  // For now, we'll check if the user has admin role and specific permissions
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Super admin access required'
    });
  }
  
  // Additional check for super admin flag (would be in JWT or user record)
  // if (!req.user.isSuperAdmin) {
  //   return res.status(403).json({
  //     success: false,
  //     error: 'Super admin privileges required'
  //   });
  // }
  
  next();
};

// Apply authentication middleware to all routes
superAdminRoutes.use(authenticate);
superAdminRoutes.use(superAdminAuth);

/**
 * GET /api/super-admin/overview
 * Get platform overview dashboard
 */
superAdminRoutes.get('/overview',
  SuperAdminController.getPlatformOverview
);

/**
 * GET /api/super-admin/tenants
 * Get all tenants with management capabilities
 */
superAdminRoutes.get('/tenants',
  SuperAdminController.getTenants
);

/**
 * GET /api/super-admin/tenants/:tenantId
 * Get detailed tenant information
 */
superAdminRoutes.get('/tenants/:tenantId',
  SuperAdminController.getTenantDetails
);

/**
 * POST /api/super-admin/tenants/:tenantId/manage
 * Perform tenant management actions (activate, deactivate, suspend, delete)
 */
superAdminRoutes.post('/tenants/:tenantId/manage',
  SuperAdminController.manageTenant
);

/**
 * GET /api/super-admin/stats
 * Get platform statistics and analytics
 */
superAdminRoutes.get('/stats',
  SuperAdminController.getPlatformStats
);

/**
 * GET /api/super-admin/users/analytics
 * Get platform user analytics
 */
superAdminRoutes.get('/users/analytics',
  SuperAdminController.getUserAnalytics
);

/**
 * POST /api/super-admin/announcements
 * Broadcast system announcement to tenants
 */
superAdminRoutes.post('/announcements',
  SuperAdminController.broadcastAnnouncement
);

/**
 * GET /api/super-admin/audit-logs
 * Get audit logs for platform activities
 */
superAdminRoutes.get('/audit-logs',
  SuperAdminController.getAuditLogs
);

// System Monitoring Routes

/**
 * GET /api/super-admin/monitoring/system
 * Get current system metrics
 */
superAdminRoutes.get('/monitoring/system',
  SystemMonitoringController.getSystemMetrics
);

/**
 * GET /api/super-admin/monitoring/database
 * Get database performance metrics
 */
superAdminRoutes.get('/monitoring/database',
  SystemMonitoringController.getDatabaseMetrics
);

/**
 * GET /api/super-admin/monitoring/historical
 * Get historical metrics data
 */
superAdminRoutes.get('/monitoring/historical',
  SystemMonitoringController.getHistoricalMetrics
);

/**
 * GET /api/super-admin/monitoring/alerts
 * Get system alerts and notifications
 */
superAdminRoutes.get('/monitoring/alerts',
  SystemMonitoringController.getSystemAlerts
);

/**
 * POST /api/super-admin/monitoring/alerts
 * Create new system alert
 */
superAdminRoutes.post('/monitoring/alerts',
  SystemMonitoringController.createAlert
);

/**
 * GET /api/super-admin/monitoring/performance
 * Get system performance summary
 */
superAdminRoutes.get('/monitoring/performance',
  SystemMonitoringController.getPerformanceSummary
);

/**
 * GET /api/super-admin/monitoring/forecast
 * Get resource usage forecast
 */
superAdminRoutes.get('/monitoring/forecast',
  SystemMonitoringController.getResourceForecast
);

/**
 * GET /api/super-admin/health
 * Get overall system health status
 */
superAdminRoutes.get('/health',
  SuperAdminController.getSystemHealth
);