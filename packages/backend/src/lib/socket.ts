import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { getMasterDb, getTenantDb } from './database';
import { logger } from './logger';

export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
  };
  tenantId?: string;
}

export interface SocketEventData {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  tenantId: string;
  entityId?: string;
  entityType?: string;
}

export class SocketManager {
  private io: SocketIOServer;
  private authenticatedSockets: Map<string, AuthenticatedSocket> = new Map();
  private tenantRooms: Map<string, Set<string>> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
        
        // Get user details from master database
        const masterDb = await getMasterDb();
        const tenant = await masterDb.tenant.findUnique({
          where: { tenantId: decoded.tenantId },
          include: {
            users: {
              where: { userId: decoded.userId },
              select: {
                userId: true,
                email: true,
                role: true,
                isActive: true
              }
            }
          }
        });

        if (!tenant || !tenant.users[0] || !tenant.users[0].isActive) {
          return next(new Error('User not found or inactive'));
        }

        // Attach user info to socket
        socket.user = {
          userId: decoded.userId,
          email: tenant.users[0].email,
          role: tenant.users[0].role,
          tenantId: decoded.tenantId
        };
        socket.tenantId = decoded.tenantId;

        logger.info(`Socket authenticated for user ${socket.user.email} (${socket.user.userId})`);
        next();

      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    if (!socket.user || !socket.tenantId) {
      socket.disconnect();
      return;
    }

    const { userId, tenantId, email, role } = socket.user;
    
    logger.info(`User ${email} connected via Socket.io (${socket.id})`);

    // Store authenticated socket
    this.authenticatedSockets.set(socket.id, socket);

    // Join tenant room
    const tenantRoom = `tenant:${tenantId}`;
    socket.join(tenantRoom);

    // Track tenant room membership
    if (!this.tenantRooms.has(tenantId)) {
      this.tenantRooms.set(tenantId, new Set());
    }
    this.tenantRooms.get(tenantId)!.add(socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-based rooms
    socket.join(`role:${role}`);
    socket.join(`tenant:${tenantId}:role:${role}`);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to real-time updates',
      userId,
      tenantId,
      timestamp: new Date()
    });

    // Broadcast user online status to tenant
    this.broadcastToTenant(tenantId, 'user:online', {
      userId,
      email,
      role,
      timestamp: new Date()
    }, socket.id);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle joining specific entity rooms
    socket.on('join:entity', (data: { entityType: string; entityId: string }) => {
      const entityRoom = `entity:${data.entityType}:${data.entityId}`;
      socket.join(entityRoom);
      logger.info(`User ${email} joined entity room: ${entityRoom}`);
    });

    // Handle leaving specific entity rooms
    socket.on('leave:entity', (data: { entityType: string; entityId: string }) => {
      const entityRoom = `entity:${data.entityType}:${data.entityId}`;
      socket.leave(entityRoom);
      logger.info(`User ${email} left entity room: ${entityRoom}`);
    });

    // Handle real-time activity tracking
    socket.on('activity:viewed', async (data: { entityType: string; entityId: string }) => {
      await this.trackActivity(socket, 'viewed', data);
    });

    socket.on('activity:editing', async (data: { entityType: string; entityId: string; field?: string }) => {
      await this.trackActivity(socket, 'editing', data);
      
      // Broadcast to others viewing the same entity
      const entityRoom = `entity:${data.entityType}:${data.entityId}`;
      socket.to(entityRoom).emit('user:editing', {
        userId,
        email,
        entityType: data.entityType,
        entityId: data.entityId,
        field: data.field,
        timestamp: new Date()
      });
    });

    socket.on('activity:stopped_editing', (data: { entityType: string; entityId: string }) => {
      const entityRoom = `entity:${data.entityType}:${data.entityId}`;
      socket.to(entityRoom).emit('user:stopped_editing', {
        userId,
        entityType: data.entityType,
        entityId: data.entityId,
        timestamp: new Date()
      });
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    if (!socket.user || !socket.tenantId) return;

    const { userId, email, tenantId } = socket.user;

    logger.info(`User ${email} disconnected from Socket.io (${socket.id})`);

    // Remove from authenticated sockets
    this.authenticatedSockets.delete(socket.id);

    // Remove from tenant room tracking
    const tenantSockets = this.tenantRooms.get(tenantId);
    if (tenantSockets) {
      tenantSockets.delete(socket.id);
      if (tenantSockets.size === 0) {
        this.tenantRooms.delete(tenantId);
      }
    }

    // Broadcast user offline status to tenant
    this.broadcastToTenant(tenantId, 'user:offline', {
      userId,
      email,
      timestamp: new Date()
    });
  }

  private async trackActivity(
    socket: AuthenticatedSocket,
    activityType: string,
    data: { entityType: string; entityId: string; [key: string]: any }
  ): Promise<void> {
    if (!socket.user || !socket.tenantId) return;

    try {
      const tenantDb = await getTenantDb(socket.tenantId);
      
      // Log activity to audit trail
      await tenantDb.auditLog.create({
        data: {
          userId: socket.user.userId,
          action: `realtime:${activityType}`,
          entityType: data.entityType,
          entityId: data.entityId,
          details: {
            activityType,
            socketId: socket.id,
            ...data
          }
        }
      });

    } catch (error) {
      logger.error('Error tracking socket activity:', error);
    }
  }

  // Public methods for emitting events

  /**
   * Broadcast event to all users in a tenant
   */
  public broadcastToTenant(tenantId: string, event: string, data: any, excludeSocketId?: string): void {
    const room = `tenant:${tenantId}`;
    if (excludeSocketId) {
      this.io.to(room).except(excludeSocketId).emit(event, data);
    } else {
      this.io.to(room).emit(event, data);
    }
  }

  /**
   * Send event to specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Send event to users with specific role in tenant
   */
  public sendToRole(tenantId: string, role: string, event: string, data: any): void {
    this.io.to(`tenant:${tenantId}:role:${role}`).emit(event, data);
  }

  /**
   * Send event to users viewing specific entity
   */
  public sendToEntity(entityType: string, entityId: string, event: string, data: any): void {
    this.io.to(`entity:${entityType}:${entityId}`).emit(event, data);
  }

  /**
   * Send notification to specific users
   */
  public sendNotification(userIds: string[], notification: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    action?: {
      label: string;
      url: string;
    };
    timestamp: Date;
  }): void {
    userIds.forEach(userId => {
      this.sendToUser(userId, 'notification', notification);
    });
  }

  /**
   * Broadcast system announcement to tenant
   */
  public broadcastAnnouncement(tenantId: string, announcement: {
    type: 'maintenance' | 'update' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    priority: 'low' | 'medium' | 'high';
  }): void {
    this.broadcastToTenant(tenantId, 'announcement', announcement);
  }

  /**
   * Get online users for a tenant
   */
  public getOnlineUsers(tenantId: string): string[] {
    const tenantSockets = this.tenantRooms.get(tenantId);
    if (!tenantSockets) return [];

    const userIds = new Set<string>();
    tenantSockets.forEach(socketId => {
      const socket = this.authenticatedSockets.get(socketId);
      if (socket?.user?.userId) {
        userIds.add(socket.user.userId);
      }
    });

    return Array.from(userIds);
  }

  /**
   * Get Socket.io server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Global socket manager instance
let socketManager: SocketManager;

export function initializeSocket(httpServer: HttpServer): SocketManager {
  socketManager = new SocketManager(httpServer);
  return socketManager;
}

export function getSocketManager(): SocketManager {
  if (!socketManager) {
    throw new Error('Socket manager not initialized. Call initializeSocket first.');
  }
  return socketManager;
}