import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticate, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const dashboardRoutes = Router();

// Apply authentication and database middleware to all routes
dashboardRoutes.use(authenticate);
dashboardRoutes.use(extractTenant);
dashboardRoutes.use(attachDatabases());

/**
 * GET /api/dashboard/data
 * Get comprehensive dashboard data with analytics
 * Requires: authenticated user with vehicles.read permission
 */
dashboardRoutes.get('/data',
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor', 'salesperson', 'installer']),
  DashboardController.getDashboardData
);

/**
 * GET /api/dashboard/kpi
 * Get real-time KPI metrics
 * Requires: authenticated user
 */
dashboardRoutes.get('/kpi',
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor', 'salesperson', 'installer']),
  DashboardController.getKPIMetrics
);

/**
 * GET /api/dashboard/activity
 * Get activity feed for dashboard
 * Requires: authenticated user
 */
dashboardRoutes.get('/activity',
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor', 'salesperson', 'installer']),
  DashboardController.getActivityFeed
);

/**
 * GET /api/dashboard/health
 * Get system health status
 * Requires: admin+ role
 */
dashboardRoutes.get('/health',
  authorizeRoles(['admin']),
  DashboardController.getSystemHealth
);

/**
 * POST /api/dashboard/refresh
 * Trigger dashboard refresh for all connected users
 * Requires: admin+ role
 */
dashboardRoutes.post('/refresh',
  authorizeRoles(['admin']),
  DashboardController.refreshDashboard
);