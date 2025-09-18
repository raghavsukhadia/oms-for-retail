import { Router } from 'express';
import { SupervisorController } from '../controllers/supervisorController';
import { authenticate, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const supervisorRoutes = Router();

// Apply authentication and database middleware to all routes
supervisorRoutes.use(authenticate);
supervisorRoutes.use(extractTenant);
supervisorRoutes.use(attachDatabases());

/**
 * GET /api/supervisors
 * Get all supervisors with pagination and filtering
 * Requires: admin or manager role
 */
supervisorRoutes.get('/', 
  authorizeRoles(['admin', 'manager']),
  SupervisorController.getSupervisors
);

/**
 * GET /api/supervisors/stats
 * Get supervisor statistics
 * Requires: admin or manager role
 */
supervisorRoutes.get('/stats', 
  authorizeRoles(['admin', 'manager']),
  SupervisorController.getSupervisorStats
);

/**
 * GET /api/supervisors/:supervisorId
 * Get supervisor by ID
 * Requires: admin or manager role
 */
supervisorRoutes.get('/:supervisorId', 
  authorizeRoles(['admin', 'manager']),
  SupervisorController.getSupervisorById
);

/**
 * POST /api/supervisors
 * Create new supervisor
 * Requires: admin or manager role
 */
supervisorRoutes.post('/', 
  authorizeRoles(['admin', 'manager']),
  SupervisorController.createSupervisor
);

/**
 * PUT /api/supervisors/:supervisorId
 * Update supervisor
 * Requires: admin or manager role
 */
supervisorRoutes.put('/:supervisorId', 
  authorizeRoles(['admin', 'manager']),
  SupervisorController.updateSupervisor
);

/**
 * DELETE /api/supervisors/:supervisorId
 * Delete supervisor (soft delete)
 * Requires: admin role
 */
supervisorRoutes.delete('/:supervisorId', 
  authorizeRoles(['admin']),
  SupervisorController.deleteSupervisor
);