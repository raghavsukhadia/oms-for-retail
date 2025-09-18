import { Router } from 'express';
import { AccountController } from '../controllers/accountController';
import { authenticate, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const accountRoutes = Router();

// Apply authentication and database middleware to all routes
accountRoutes.use(authenticate);
accountRoutes.use(extractTenant);
accountRoutes.use(extractTenant);
accountRoutes.use(attachDatabases());

/**
 * GET /api/accounts
 * Get all account managers with pagination and filtering
 * Requires: admin role
 */
accountRoutes.get('/', 
  authorizeRoles(['admin']),
  AccountController.getAccountManagers
);

/**
 * GET /api/accounts/stats
 * Get account team statistics
 * Requires: admin role
 */
accountRoutes.get('/stats', 
  authorizeRoles(['admin']),
  AccountController.getAccountStats
);

/**
 * GET /api/accounts/:accountManagerId
 * Get account manager by ID
 * Requires: admin role
 */
accountRoutes.get('/:accountManagerId', 
  authorizeRoles(['admin']),
  AccountController.getAccountManagerById
);

/**
 * POST /api/accounts
 * Create new account manager
 * Requires: admin role
 */
accountRoutes.post('/', 
  authorizeRoles(['admin']),
  AccountController.createAccountManager
);

/**
 * PUT /api/accounts/:accountManagerId
 * Update account manager
 * Requires: admin role
 */
accountRoutes.put('/:accountManagerId', 
  authorizeRoles(['admin']),
  AccountController.updateAccountManager
);

/**
 * DELETE /api/accounts/:accountManagerId
 * Delete account manager (soft delete)
 * Requires: admin role
 */
accountRoutes.delete('/:accountManagerId', 
  authorizeRoles(['admin']),
  AccountController.deleteAccountManager
);