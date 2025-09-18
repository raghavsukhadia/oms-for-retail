import { Router } from 'express';
import { DepartmentController } from '../controllers/departmentController';
import { authenticate, authorizeRoles, requirePermission, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const departmentRoutes = Router();

// Apply authentication and database middleware to all routes
departmentRoutes.use(authenticate);
departmentRoutes.use(extractTenant);
departmentRoutes.use(attachDatabases());

/**
 * GET /api/departments
 * Get all departments with pagination and filtering
 * Requires: departments.read permission (all roles need department info for UI)
 */
departmentRoutes.get('/', 
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor', 'salesperson', 'installer']),
  DepartmentController.getDepartments
);

/**
 * GET /api/departments/stats
 * Get department statistics
 * Requires: departments.read permission or manager+ role
 */
departmentRoutes.get('/stats', 
  authorizeRoles(['admin', 'manager']),
  DepartmentController.getDepartmentStats
);

/**
 * GET /api/departments/:departmentId
 * Get department by ID
 * Requires: departments.read permission (all roles need department info for UI)
 */
departmentRoutes.get('/:departmentId', 
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor', 'salesperson', 'installer']),
  DepartmentController.getDepartmentById
);

/**
 * POST /api/departments
 * Create new department
 * Requires: admin or manager role
 */
departmentRoutes.post('/', 
  authorizeRoles(['admin', 'manager']),
  DepartmentController.createDepartment
);

/**
 * PUT /api/departments/:departmentId
 * Update department
 * Requires: admin or manager role
 */
departmentRoutes.put('/:departmentId', 
  authorizeRoles(['admin', 'manager']),
  DepartmentController.updateDepartment
);

/**
 * DELETE /api/departments/:departmentId
 * Delete department (soft delete if has associations)
 * Requires: admin role
 */
departmentRoutes.delete('/:departmentId', 
  authorizeRoles(['admin']),
  DepartmentController.deleteDepartment
);