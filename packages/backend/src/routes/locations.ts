import { Router } from 'express';
import { LocationController } from '../controllers/locationController';
import { authenticate, authorizeRoles, requirePermission, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const locationRoutes = Router();

// Apply authentication and database middleware to all routes
locationRoutes.use(authenticate);
locationRoutes.use(extractTenant);
locationRoutes.use(attachDatabases());

/**
 * GET /api/locations
 * Get all locations with pagination and filtering
 * Requires: locations.read permission or manager+ role
 */
locationRoutes.get('/', 
  authorizeRoles(['admin', 'manager', 'coordinator']),
  LocationController.getLocations
);

/**
 * GET /api/locations/stats
 * Get location statistics
 * Requires: locations.read permission or manager+ role
 */
locationRoutes.get('/stats', 
  authorizeRoles(['admin', 'manager']),
  LocationController.getLocationStats
);

/**
 * GET /api/locations/:locationId
 * Get location by ID
 * Requires: locations.read permission or manager+ role
 */
locationRoutes.get('/:locationId', 
  authorizeRoles(['admin', 'manager', 'coordinator']),
  LocationController.getLocationById
);

/**
 * POST /api/locations
 * Create new location
 * Requires: admin or manager role
 */
locationRoutes.post('/', 
  authorizeRoles(['admin', 'manager']),
  LocationController.createLocation
);

/**
 * PUT /api/locations/:locationId
 * Update location
 * Requires: admin or manager role
 */
locationRoutes.put('/:locationId', 
  authorizeRoles(['admin', 'manager']),
  LocationController.updateLocation
);

/**
 * DELETE /api/locations/:locationId
 * Delete location (soft delete if has associations)
 * Requires: admin role
 */
locationRoutes.delete('/:locationId', 
  authorizeRoles(['admin']),
  LocationController.deleteLocation
);