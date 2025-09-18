import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import { sendNotification } from '../lib/realTimeEvents';
import { ApiResponse } from '@omsms/shared';
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const createNotificationSchema = z.object({
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  recipientIds: z.array(z.string().uuid()).min(1),
  action: z.object({
    label: z.string().min(1).max(50),
    url: z.string().min(1)
  }).optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional()
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  unreadOnly: z.string().transform((val) => val === 'true').optional(),
  type: z.enum(['info', 'success', 'warning', 'error']).optional()
});

export class NotificationController {
  /**
   * Create and send notification
   */
  static async createNotification(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const body = createNotificationSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      const notificationId = uuidv4();
      const timestamp = new Date();

      // Create notification records for each recipient
      const notifications = await Promise.all(
        body.recipientIds.map(recipientId =>
          tenantDb.notification.create({
            data: {
              notificationId,
              userId: recipientId,
              type: body.type,
              title: body.title,
              message: body.message,
              actionLabel: body.action?.label,
              actionUrl: body.action?.url,
              entityType: body.entityType,
              entityId: body.entityId,
              createdBy: req.user.userId,
              expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined
            }
          })
        )
      );

      // Send real-time notification
      sendNotification(req.tenantId, {
        id: notificationId,
        type: body.type,
        title: body.title,
        message: body.message,
        recipientIds: body.recipientIds,
        action: body.action,
        timestamp
      });

      const response: ApiResponse<typeof notifications> = {
        success: true,
        data: notifications,
        message: `Notification sent to ${body.recipientIds.length} users`
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create notification error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create notification'
      } as ApiResponse);
    }
  }

  /**
   * Get user notifications with pagination
   */
  static async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const query = paginationSchema.parse(req.query);
      const tenantDb = await getTenantDb(req.tenantId);

      // Build where clause
      const where: any = {
        userId: req.user.userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      };

      if (query.unreadOnly) {
        where.readAt = null;
      }

      if (query.type) {
        where.type = query.type;
      }

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Get notifications
      const [notifications, total, unreadCount] = await Promise.all([
        tenantDb.notification.findMany({
          where,
          include: {
            creator: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        tenantDb.notification.count({ where }),
        tenantDb.notification.count({
          where: {
            userId: req.user.userId,
            readAt: null,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        })
      ]);

      const response: ApiResponse<typeof notifications> = {
        success: true,
        data: notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        meta: {
          unreadCount
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get user notifications error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get notifications'
      } as ApiResponse);
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const { notificationId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const notification = await tenantDb.notification.update({
        where: {
          id: parseInt(notificationId),
          userId: req.user.userId
        },
        data: {
          readAt: new Date()
        }
      });

      const response: ApiResponse<typeof notification> = {
        success: true,
        data: notification,
        message: 'Notification marked as read'
      };

      res.json(response);
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read'
      } as ApiResponse);
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);

      const result = await tenantDb.notification.updateMany({
        where: {
          userId: req.user.userId,
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      });

      const response: ApiResponse<{ count: number }> = {
        success: true,
        data: { count: result.count },
        message: `Marked ${result.count} notifications as read`
      };

      res.json(response);
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read'
      } as ApiResponse);
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const { notificationId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      await tenantDb.notification.delete({
        where: {
          id: parseInt(notificationId),
          userId: req.user.userId
        }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Notification deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification'
      } as ApiResponse);
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);

      const [
        totalNotifications,
        unreadCount,
        notificationsByType,
        recentActivity
      ] = await Promise.all([
        tenantDb.notification.count({
          where: {
            userId: req.user.userId,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        }),
        tenantDb.notification.count({
          where: {
            userId: req.user.userId,
            readAt: null,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        }),
        tenantDb.notification.groupBy({
          by: ['type'],
          _count: { type: true },
          where: {
            userId: req.user.userId,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        }),
        tenantDb.notification.findMany({
          where: {
            userId: req.user.userId,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            readAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      const stats = {
        overview: {
          totalNotifications,
          unreadCount,
          readCount: totalNotifications - unreadCount
        },
        distribution: notificationsByType,
        recent: recentActivity
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notification statistics'
      } as ApiResponse);
    }
  }

  /**
   * Create system-wide announcement (admin only)
   */
  static async createAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const { title, message, type, priority, targetRoles } = req.body;
      const tenantDb = await getTenantDb(req.tenantId);

      // Get users based on target roles
      const users = await tenantDb.user.findMany({
        where: targetRoles ? {
          role: { in: targetRoles }
        } : {},
        select: { userId: true }
      });

      const recipientIds = users.map(u => u.userId);

      if (recipientIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No users found for the specified criteria'
        } as ApiResponse);
        return;
      }

      const notificationId = uuidv4();
      const timestamp = new Date();

      // Create notification records
      await Promise.all(
        recipientIds.map(recipientId =>
          tenantDb.notification.create({
            data: {
              notificationId,
              userId: recipientId,
              type: type || 'info',
              title,
              message,
              entityType: 'announcement',
              createdBy: req.user.userId
            }
          })
        )
      );

      // Send real-time notification
      sendNotification(req.tenantId, {
        id: notificationId,
        type: type || 'info',
        title,
        message,
        recipientIds,
        timestamp
      });

      const response: ApiResponse = {
        success: true,
        message: `Announcement sent to ${recipientIds.length} users`
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create announcement error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create announcement'
      } as ApiResponse);
    }
  }
}