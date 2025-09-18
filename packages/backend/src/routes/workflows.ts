import { Router } from 'express';
import { WorkflowInstanceController } from '../controllers/workflowInstanceController';
import { authenticate, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const workflowRoutes = Router();

// Apply authentication and database middleware to all routes
workflowRoutes.use(authenticate);
workflowRoutes.use(extractTenant);
workflowRoutes.use(attachDatabases());

/**
 * GET /api/workflows/instances
 * Get all workflow instances with pagination and filtering
 * Requires: coordinator, supervisor, manager, or admin role
 */
workflowRoutes.get('/instances', 
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor']),
  WorkflowInstanceController.getWorkflowInstances
);

/**
 * GET /api/workflows/instances/:instanceId
 * Get workflow instance by ID
 * Requires: coordinator, supervisor, manager, or admin role
 */
workflowRoutes.get('/instances/:instanceId', 
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor']),
  WorkflowInstanceController.getWorkflowInstanceById
);

/**
 * POST /api/workflows/instances
 * Create new workflow instance
 * Requires: coordinator, manager, or admin role
 */
workflowRoutes.post('/instances', 
  authorizeRoles(['admin', 'manager', 'coordinator']),
  WorkflowInstanceController.createWorkflowInstance
);

/**
 * PUT /api/workflows/instances/:instanceId
 * Update workflow instance (stage transition)
 * Requires: coordinator, supervisor, manager, or admin role
 */
workflowRoutes.put('/instances/:instanceId', 
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor']),
  WorkflowInstanceController.updateWorkflowInstance
);

/**
 * DELETE /api/workflows/instances/:instanceId
 * Cancel workflow instance
 * Requires: manager or admin role
 */
workflowRoutes.delete('/instances/:instanceId', 
  authorizeRoles(['admin', 'manager']),
  WorkflowInstanceController.deleteWorkflowInstance
);

/**
 * GET /api/workflows/entity/:entityType/:entityId
 * Get workflow instances for a specific entity
 * Requires: coordinator, supervisor, manager, or admin role
 */
workflowRoutes.get('/entity/:entityType/:entityId', 
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor']),
  WorkflowInstanceController.getWorkflowInstancesByEntity
);

/**
 * PATCH /api/workflows/vehicles/:vehicleId/:workflowType
 * Update vehicle workflow stage (specialized endpoint)
 * Requires: coordinator, supervisor, manager, or admin role
 */
workflowRoutes.patch('/vehicles/:vehicleId/:workflowType', 
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor']),
  WorkflowInstanceController.updateVehicleWorkflowStage
);