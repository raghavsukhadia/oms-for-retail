import { Router } from 'express';
import { RoleController } from '../controllers/roleController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const roleRoutes = Router();

// Apply authentication and database middleware to all routes
roleRoutes.use(authenticate);
roleRoutes.use(attachDatabases());

/**
 * GET /api/roles
 * Get all roles with pagination and filtering
 * Requires: admin or manager role
 */
roleRoutes.get('/', 
  authorizeRoles(['admin', 'manager']),
  RoleController.getRoles
);

/**
 * GET /api/roles/permission-options
 * Get available resources and actions for permission configuration
 * Requires: admin role
 */
roleRoutes.get('/permission-options',
  authorizeRoles(['admin']),
  RoleController.getPermissionOptions
);

/**
 * GET /api/roles/:roleId
 * Get role by ID
 * Requires: admin or manager role
 */
roleRoutes.get('/:roleId', 
  authorizeRoles(['admin', 'manager']),
  RoleController.getRoleById
);

/**
 * POST /api/roles
 * Create new role
 * Requires: admin role
 */
roleRoutes.post('/', 
  authorizeRoles(['admin']),
  RoleController.createRole
);

/**
 * PUT /api/roles/:roleId
 * Update role
 * Requires: admin role
 */
roleRoutes.put('/:roleId', 
  authorizeRoles(['admin']),
  RoleController.updateRole
);

/**
 * DELETE /api/roles/:roleId
 * Delete role
 * Requires: admin role
 */
roleRoutes.delete('/:roleId', 
  authorizeRoles(['admin']),
  RoleController.deleteRole
);