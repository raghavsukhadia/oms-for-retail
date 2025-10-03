import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { publicRateLimiter } from '../middleware/rateLimiter';
import { attachDatabases } from '../lib/database';

export const publicRoutes = Router();

// Apply rate limiting to public auth routes
publicRoutes.use(publicRateLimiter);

// Apply database middleware (master DB only for public routes)
publicRoutes.use(attachDatabases());

/**
 * @route POST /api/public/signup
 * @desc Register new tenant organization and admin user
 * @access Public
 */
publicRoutes.post('/signup', AuthController.registerTenant);

/**
 * @route POST /api/public/check-subdomain
 * @desc Check if subdomain is available
 * @access Public
 */
publicRoutes.post('/check-subdomain', AuthController.checkSubdomainAvailability);

/**
 * @route GET /api/public/plans
 * @desc Get available subscription plans
 * @access Public
 */
publicRoutes.get('/plans', AuthController.getSubscriptionPlans);

/**
 * @route POST /api/public/forgot-password
 * @desc Request password reset (public - no tenant required)
 * @access Public
 */
publicRoutes.post('/forgot-password', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Password reset not yet implemented'
  });
});

/**
 * @route POST /api/public/reset-password
 * @desc Reset password with token
 * @access Public
 */
publicRoutes.post('/reset-password', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Password reset not yet implemented'
  });
});

export default publicRoutes;
