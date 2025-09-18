import { Router } from 'express';
import { VehicleController } from '../controllers/vehicleController';
import { authenticate, requirePermission, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';
import { 
  requirePaymentPermission,
  requirePricingPermission,
  requireCostAnalysisPermission 
} from '../middleware/financialMiddleware';

export const vehicleRoutes = Router();

// Apply authentication and database middleware to all routes
vehicleRoutes.use(authenticate);
vehicleRoutes.use(extractTenant);
vehicleRoutes.use(attachDatabases());

/**
 * GET /api/vehicles
 * Get all vehicles with advanced filtering and pagination
 * Requires: vehicles.read permission
 */
vehicleRoutes.get('/', 
  requirePermission('vehicles.read'),
  VehicleController.getVehicles
);

/**
 * GET /api/vehicles/stats
 * Get vehicle statistics
 * Requires: vehicles.read permission
 */
vehicleRoutes.get('/stats', 
  requirePermission('vehicles.read'),
  VehicleController.getVehicleStats
);

/**
 * GET /api/vehicles/:vehicleId
 * Get vehicle by ID with all related data
 * Requires: vehicles.read permission
 */
vehicleRoutes.get('/:vehicleId', 
  requirePermission('vehicles.read'),
  VehicleController.getVehicleById
);

/**
 * POST /api/vehicles
 * Create new vehicle
 * Requires: vehicles.create permission
 */
vehicleRoutes.post('/', 
  requirePermission('vehicles.create'),
  VehicleController.createVehicle
);

/**
 * PUT /api/vehicles/:vehicleId
 * Update vehicle information
 * Requires: vehicles.update permission
 */
vehicleRoutes.put('/:vehicleId', 
  requirePermission('vehicles.update'),
  VehicleController.updateVehicle
);

/**
 * PUT /api/vehicles/:vehicleId/status
 * Update vehicle status with validation
 * Requires: vehicles.update permission
 */
vehicleRoutes.put('/:vehicleId/status', 
  requirePermission('vehicles.update'),
  VehicleController.updateVehicleStatus
);

/**
 * PUT /api/vehicles/:vehicleId/assignments
 * Update vehicle assignments (salesperson, coordinator, supervisor)
 * Requires: vehicles.update permission
 */
vehicleRoutes.put('/:vehicleId/assignments', 
  requirePermission('vehicles.update'),
  VehicleController.updateVehicleAssignments
);

/**
 * POST /api/vehicles/:vehicleId/workflows/initialize
 * Initialize missing workflow instances for a vehicle
 * Requires: authentication only (coordinator+ role)
 */
vehicleRoutes.post('/:vehicleId/workflows/initialize', 
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor']),
  VehicleController.initializeMissingWorkflows
);

/**
 * PATCH /api/vehicles/:vehicleId/workflows/:workflowType
 * Update vehicle workflow stage
 * Requires: authentication only (coordinator+ role) + payment permissions for payment workflows
 */
vehicleRoutes.patch('/:vehicleId/workflows/:workflowType', 
  authorizeRoles(['admin', 'manager', 'coordinator', 'supervisor']),
  // Note: Payment permission check is handled inside the controller based on workflow type
  VehicleController.updateVehicleWorkflowStage
);

/**
 * GET /api/vehicles/:vehicleId/products/:productName/workflows/:workflowType
 * Get individual product workflow stage
 * Requires: workflows.read permission
 */
vehicleRoutes.get('/:vehicleId/products/:productName/workflows/:workflowType', 
  requirePermission('workflows.read'),
  VehicleController.getProductWorkflowStage
);

/**
 * PATCH /api/vehicles/:vehicleId/products/:productName/workflows/:workflowType
 * Update individual product workflow stage
 * Requires: workflows.update permission
 */
vehicleRoutes.patch('/:vehicleId/products/:productName/workflows/:workflowType', 
  requirePermission('workflows.update'),
  VehicleController.updateProductWorkflowStage
);

/**
 * DELETE /api/vehicles/:vehicleId
 * Delete vehicle (soft delete if has associations)
 * Requires: vehicles.delete permission
 */
vehicleRoutes.delete('/:vehicleId', 
  requirePermission('vehicles.delete'),
  VehicleController.deleteVehicle
);