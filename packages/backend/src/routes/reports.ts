import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController';
import { authenticate, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';
import { 
  requireFinancialReportsPermission, 
  requireAccountStatementsPermission,
  requireRevenueDataPermission,
  requireAnyFinancialAccess 
} from '../middleware/financialMiddleware';

export const reportsRoutes = Router();

// Apply authentication and database middleware to all routes
reportsRoutes.use(authenticate);
reportsRoutes.use(extractTenant);
reportsRoutes.use(attachDatabases());

/**
 * POST /api/reports/generate
 * Generate ad-hoc report
 * Requires: coordinator+ role
 */
reportsRoutes.post('/generate',
  authorizeRoles(['admin', 'manager', 'coordinator']),
  ReportsController.generateReport
);

/**
 * GET /api/reports/download/:fileName
 * Download generated report file
 * Requires: coordinator+ role (file access control should be implemented)
 */
reportsRoutes.get('/download/:fileName',
  authorizeRoles(['admin', 'manager', 'coordinator']),
  ReportsController.downloadReport
);

/**
 * GET /api/reports/templates
 * Get available report templates
 * Requires: coordinator+ role
 */
reportsRoutes.get('/templates',
  authorizeRoles(['admin', 'manager', 'coordinator']),
  ReportsController.getReportTemplates
);

/**
 * GET /api/reports/analytics/export
 * Export analytics data in various formats
 * Requires: manager+ role AND financial reports export permission
 */
reportsRoutes.get('/analytics/export',
  authorizeRoles(['admin', 'manager']),
  requireFinancialReportsPermission('export'),
  ReportsController.exportAnalytics
);

/**
 * GET /api/reports/history
 * Get report generation history
 * Requires: coordinator+ role
 */
reportsRoutes.get('/history',
  authorizeRoles(['admin', 'manager', 'coordinator']),
  ReportsController.getReportHistory
);

/**
 * POST /api/reports/scheduled
 * Create scheduled report
 * Requires: manager+ role
 */
reportsRoutes.post('/scheduled',
  authorizeRoles(['admin', 'manager']),
  ReportsController.createScheduledReport
);

/**
 * GET /api/reports/scheduled
 * Get scheduled reports
 * Requires: manager+ role
 */
reportsRoutes.get('/scheduled',
  authorizeRoles(['admin', 'manager']),
  ReportsController.getScheduledReports
);

/**
 * DELETE /api/reports/scheduled/:reportId
 * Delete scheduled report
 * Requires: manager+ role
 */
reportsRoutes.delete('/scheduled/:reportId',
  authorizeRoles(['admin', 'manager']),
  ReportsController.deleteScheduledReport
);

// Specific Report Endpoints

/**
 * GET /api/reports/vehicle-inward
 * Get Vehicle Inward Report
 * Requires: coordinator+ role
 */
reportsRoutes.get('/vehicle-inward',
  authorizeRoles(['admin', 'manager', 'coordinator']),
  ReportsController.getVehicleInwardReport
);

/**
 * GET /api/reports/vehicle-installation
 * Get Vehicle Installation Report
 * Requires: coordinator+ role
 */
reportsRoutes.get('/vehicle-installation',
  authorizeRoles(['admin', 'manager', 'coordinator']),
  ReportsController.getVehicleInstallationReport
);

/**
 * GET /api/reports/vehicle-detailed
 * Get Vehicle Detailed Report
 * Requires: coordinator+ role
 */
reportsRoutes.get('/vehicle-detailed',
  authorizeRoles(['admin', 'manager', 'coordinator']),
  ReportsController.getVehicleDetailedReport
);

/**
 * GET /api/reports/accounts
 * Get Account Reports
 * Requires: manager+ role AND financial reports permission
 */
reportsRoutes.get('/accounts',
  authorizeRoles(['admin', 'manager']),
  requireFinancialReportsPermission('view'),
  ReportsController.getAccountReports
);