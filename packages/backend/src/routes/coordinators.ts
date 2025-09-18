import { Router } from 'express';
import { CoordinatorController } from '../controllers/coordinatorController';
import { authenticate, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const coordinatorRoutes = Router();

// Apply authentication and database middleware to all routes
coordinatorRoutes.use(authenticate);
coordinatorRoutes.use(extractTenant);
coordinatorRoutes.use(attachDatabases());

/**
 * GET /api/coordinators
 * Get all coordinators with pagination and filtering
 * Requires: admin or manager role
 */
coordinatorRoutes.get('/', 
  authorizeRoles(['admin', 'manager']),
  CoordinatorController.getCoordinators
);

/**
 * GET /api/coordinators/stats
 * Get coordinator statistics
 * Requires: admin or manager role
 */
coordinatorRoutes.get('/stats', 
  authorizeRoles(['admin', 'manager']),
  CoordinatorController.getCoordinatorStats
);

/**
 * GET /api/coordinators/:coordinatorId
 * Get coordinator by ID
 * Requires: admin or manager role
 */
coordinatorRoutes.get('/:coordinatorId', 
  authorizeRoles(['admin', 'manager']),
  CoordinatorController.getCoordinatorById
);

/**
 * POST /api/coordinators
 * Create new coordinator
 * Requires: admin or manager role
 */
coordinatorRoutes.post('/', 
  authorizeRoles(['admin', 'manager']),
  CoordinatorController.createCoordinator
);

/**
 * PUT /api/coordinators/:coordinatorId
 * Update coordinator
 * Requires: admin or manager role
 */
coordinatorRoutes.put('/:coordinatorId', 
  authorizeRoles(['admin', 'manager']),
  CoordinatorController.updateCoordinator
);

/**
 * DELETE /api/coordinators/:coordinatorId
 * Delete coordinator (soft delete)
 * Requires: admin role
 */
coordinatorRoutes.delete('/:coordinatorId', 
  authorizeRoles(['admin']),
  CoordinatorController.deleteCoordinator
);