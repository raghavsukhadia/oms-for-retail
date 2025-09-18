import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authenticate, authorizeRoles, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const notificationRoutes = Router();

// Apply authentication and database middleware to all routes
notificationRoutes.use(authenticate);
notificationRoutes.use(extractTenant);
notificationRoutes.use(attachDatabases());

/**
 * POST /api/notifications
 * Create and send notification to specified users
 * Requires: coordinator+ role
 */
notificationRoutes.post('/',
  authorizeRoles(['admin', 'manager', 'coordinator']),
  NotificationController.createNotification
);

/**
 * GET /api/notifications
 * Get current user's notifications with pagination and filtering
 * All authenticated users can access their own notifications
 */
notificationRoutes.get('/',
  NotificationController.getUserNotifications
);

/**
 * GET /api/notifications/stats
 * Get notification statistics for current user
 * All authenticated users can access their own stats
 */
notificationRoutes.get('/stats',
  NotificationController.getNotificationStats
);

/**
 * POST /api/notifications/announcement
 * Create system-wide announcement
 * Requires: admin role
 */
notificationRoutes.post('/announcement',
  authorizeRoles(['admin']),
  NotificationController.createAnnouncement
);

/**
 * PUT /api/notifications/:notificationId/read
 * Mark specific notification as read
 * Users can only mark their own notifications as read
 */
notificationRoutes.put('/:notificationId/read',
  NotificationController.markAsRead
);

/**
 * PUT /api/notifications/read-all
 * Mark all user notifications as read
 * Users can only mark their own notifications as read
 */
notificationRoutes.put('/read-all',
  NotificationController.markAllAsRead
);

/**
 * DELETE /api/notifications/:notificationId
 * Delete notification
 * Users can only delete their own notifications
 */
notificationRoutes.delete('/:notificationId',
  NotificationController.deleteNotification
);