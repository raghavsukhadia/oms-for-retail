import { Router } from 'express';
import { SalesController } from '../controllers/salesController';
import { authenticate, requirePermission, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const salesRoutes = Router();

// Apply authentication and database middleware to all routes
salesRoutes.use(authenticate);
salesRoutes.use(extractTenant);
salesRoutes.use(attachDatabases());

/**
 * GET /api/sales
 * Get all sales persons with pagination and filtering
 * Requires: users.read permission
 */
salesRoutes.get('/', 
  requirePermission('users.read'),
  SalesController.getSalesPersons
);

/**
 * GET /api/sales/stats
 * Get sales person statistics
 * Requires: users.read permission
 */
salesRoutes.get('/stats', 
  requirePermission('users.read'),
  SalesController.getSalesStats
);

/**
 * GET /api/sales/:salespersonId
 * Get sales person by ID
 * Requires: users.read permission
 */
salesRoutes.get('/:salespersonId', 
  requirePermission('users.read'),
  SalesController.getSalesPersonById
);

/**
 * POST /api/sales
 * Create new sales person
 * Requires: users.create permission
 */
salesRoutes.post('/', 
  requirePermission('users.create'),
  SalesController.createSalesPerson
);

/**
 * PUT /api/sales/:salespersonId
 * Update sales person
 * Requires: users.update permission
 */
salesRoutes.put('/:salespersonId', 
  requirePermission('users.update'),
  SalesController.updateSalesPerson
);

/**
 * DELETE /api/sales/:salespersonId
 * Delete sales person (soft delete)
 * Requires: users.delete permission
 */
salesRoutes.delete('/:salespersonId', 
  requirePermission('users.delete'),
  SalesController.deleteSalesPerson
);