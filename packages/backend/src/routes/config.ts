import { Router } from 'express';
import { ConfigController } from '../controllers/configController';
import { authenticate, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const configRoutes = Router();

// Apply authentication and database middleware to all routes
configRoutes.use(authenticate);
configRoutes.use(extractTenant);
configRoutes.use(attachDatabases());

/**
 * GET /api/config
 * Get all configurations (optionally filtered by category)
 * Requires: admin or manager role
 */
configRoutes.get('/', 
  authorizeRoles(['admin', 'manager']),
  ConfigController.getConfigurations
);

/**
 * GET /api/config/:category/schema
 * Get configuration schema for a category
 * Requires: admin or manager role
 */
configRoutes.get('/:category/schema', 
  authorizeRoles(['admin', 'manager']),
  ConfigController.getConfigurationSchema
);

/**
 * GET /api/config/:category/:key
 * Get specific configuration value
 * Requires: admin or manager role
 */
configRoutes.get('/:category/:key', 
  authorizeRoles(['admin', 'manager']),
  ConfigController.getConfiguration
);

/**
 * PUT /api/config/:category/:key
 * Set configuration value
 * Requires: admin role
 */
configRoutes.put('/:category/:key', 
  authorizeRoles(['admin']),
  ConfigController.setConfiguration
);

/**
 * PUT /api/config/bulk
 * Bulk update configurations
 * Requires: admin role
 */
configRoutes.put('/bulk', 
  authorizeRoles(['admin']),
  ConfigController.bulkUpdateConfigurations
);

/**
 * POST /api/config/:category/reset
 * Reset configuration category to defaults
 * Requires: admin role
 */
configRoutes.post('/:category/reset', 
  authorizeRoles(['admin']),
  ConfigController.resetCategoryToDefaults
);

/**
 * DELETE /api/config/:category/:key
 * Delete configuration
 * Requires: admin role
 */
configRoutes.delete('/:category/:key', 
  authorizeRoles(['admin']),
  ConfigController.deleteConfiguration
);