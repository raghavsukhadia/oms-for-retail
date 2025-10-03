import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';
import { authRateLimiter } from '../middleware/rateLimiter';

export const authRoutes = Router();

// Apply rate limiting to auth routes
authRoutes.use(authRateLimiter);

// Apply database middleware to all routes
authRoutes.use(attachDatabases());

// Public routes (no authentication required)

// Tenant registration - no tenant extraction needed
authRoutes.post('/register-tenant', AuthController.registerTenant);

// Login - requires tenant identification
authRoutes.post('/login', extractTenant, AuthController.login);

// Tenant login - alias for login (for frontend compatibility)
authRoutes.post('/tenant-login', extractTenant, AuthController.login);

// Register user within tenant - requires tenant identification
authRoutes.post('/register', extractTenant, AuthController.register);

// Refresh token - no tenant extraction needed (token contains tenant info)
authRoutes.post('/refresh', AuthController.refreshToken);

// Protected routes (authentication required)

// Get current user profile
authRoutes.get('/profile', authenticate, AuthController.getProfile);

// Logout (client-side token removal)
authRoutes.post('/logout', authenticate, AuthController.logout);

// Password reset endpoints (to be implemented later)
authRoutes.post('/forgot-password', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Password reset not yet implemented'
  });
});

authRoutes.post('/reset-password', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Password reset not yet implemented'
  });
});