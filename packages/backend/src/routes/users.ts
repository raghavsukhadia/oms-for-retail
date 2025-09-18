import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, authorizeRoles, requirePermission, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const userRoutes = Router();

// Apply authentication and database middleware to all routes
userRoutes.use(authenticate);
userRoutes.use(extractTenant);
userRoutes.use(attachDatabases());

/**
 * GET /api/users
 * Get all users with pagination and filtering
 * Requires: coordinator+ role (consistent with other master data)
 */
userRoutes.get('/', 
  authorizeRoles(['admin', 'manager', 'coordinator']),
  UserController.getUsers
);

/**
 * GET /api/users/:userId
 * Get user by ID
 * Requires: coordinator+ role (consistent with other master data)
 */
userRoutes.get('/:userId', 
  authorizeRoles(['admin', 'manager', 'coordinator']),
  UserController.getUserById
);

/**
 * POST /api/users
 * Create new user
 * Requires: users.create permission or admin/manager role
 */
userRoutes.post('/', 
  authorizeRoles(['admin', 'manager']),
  UserController.createUser
);

/**
 * PUT /api/users/:userId
 * Update user
 * Requires: users.update permission or admin/manager role
 */
userRoutes.put('/:userId', 
  authorizeRoles(['admin', 'manager']),
  UserController.updateUser
);

/**
 * DELETE /api/users/:userId
 * Delete user (soft delete)
 * Requires: admin role
 */
userRoutes.delete('/:userId', 
  authorizeRoles(['admin']),
  UserController.deleteUser
);

/**
 * PUT /api/users/:userId/password
 * Change user password
 * Users can change their own password, admins can change any password
 */
userRoutes.put('/:userId/password', 
  UserController.changePassword
);

/**
 * PUT /api/users/:userId/permissions
 * Update user permissions
 * Requires: admin role
 */
userRoutes.put('/:userId/permissions', 
  authorizeRoles(['admin']),
  UserController.updatePermissions
);