import { getSocketManager } from './socket';
import { logger } from './logger';

export interface VehicleUpdateEvent {
  vehicleId: string;
  status?: string;
  assignedTo?: string;
  location?: string;
  updatedBy: string;
  changes: Record<string, any>;
  timestamp: Date;
}

export interface WorkflowUpdateEvent {
  workflowInstanceId: string;
  entityType: string;
  entityId: string;
  stage: string;
  status: string;
  assignedTo?: string;
  updatedBy: string;
  completionPercentage?: number;
  timestamp: Date;
}

export interface MediaUploadEvent {
  fileId: string;
  entityType: string;
  entityId: string;
  fileCategory: string;
  fileName: string;
  uploadedBy: string;
  timestamp: Date;
}

export interface UserActivityEvent {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface NotificationEvent {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  recipientIds: string[];
  action?: {
    label: string;
    url: string;
  };
  timestamp: Date;
}

export class RealTimeEventEmitter {
  private static instance: RealTimeEventEmitter;

  public static getInstance(): RealTimeEventEmitter {
    if (!RealTimeEventEmitter.instance) {
      RealTimeEventEmitter.instance = new RealTimeEventEmitter();
    }
    return RealTimeEventEmitter.instance;
  }

  /**
   * Emit vehicle update event
   */
  public emitVehicleUpdate(tenantId: string, event: VehicleUpdateEvent): void {
    try {
      const socketManager = getSocketManager();
      
      // Broadcast to all users in tenant
      socketManager.broadcastToTenant(tenantId, 'vehicle:updated', event);
      
      // Send to users viewing this specific vehicle
      socketManager.sendToEntity('vehicle', event.vehicleId, 'vehicle:updated', event);
      
      // Send to assigned user if changed
      if (event.assignedTo) {
        socketManager.sendToUser(event.assignedTo, 'vehicle:assigned', {
          vehicleId: event.vehicleId,
          assignedBy: event.updatedBy,
          timestamp: event.timestamp
        });
      }

      logger.info(`Vehicle update event emitted for vehicle ${event.vehicleId} in tenant ${tenantId}`);
    } catch (error) {
      logger.error('Error emitting vehicle update event:', error);
    }
  }

  /**
   * Emit workflow progress update
   */
  public emitWorkflowUpdate(tenantId: string, event: WorkflowUpdateEvent): void {
    try {
      const socketManager = getSocketManager();
      
      // Broadcast to tenant
      socketManager.broadcastToTenant(tenantId, 'workflow:updated', event);
      
      // Send to users viewing the entity
      socketManager.sendToEntity(event.entityType, event.entityId, 'workflow:updated', event);
      
      // Send to assigned user
      if (event.assignedTo) {
        socketManager.sendToUser(event.assignedTo, 'workflow:stage_assigned', {
          workflowInstanceId: event.workflowInstanceId,
          stage: event.stage,
          entityType: event.entityType,
          entityId: event.entityId,
          assignedBy: event.updatedBy,
          timestamp: event.timestamp
        });
      }

      // Send to managers if workflow completed or failed
      if (event.status === 'completed' || event.status === 'failed') {
        socketManager.sendToRole(tenantId, 'manager', 'workflow:status_changed', event);
        socketManager.sendToRole(tenantId, 'admin', 'workflow:status_changed', event);
      }

      logger.info(`Workflow update event emitted for workflow ${event.workflowInstanceId} in tenant ${tenantId}`);
    } catch (error) {
      logger.error('Error emitting workflow update event:', error);
    }
  }

  /**
   * Emit media upload event
   */
  public emitMediaUpload(tenantId: string, event: MediaUploadEvent): void {
    try {
      const socketManager = getSocketManager();
      
      // Broadcast to tenant
      socketManager.broadcastToTenant(tenantId, 'media:uploaded', event);
      
      // Send to users viewing the entity
      socketManager.sendToEntity(event.entityType, event.entityId, 'media:uploaded', event);
      
      logger.info(`Media upload event emitted for file ${event.fileId} in tenant ${tenantId}`);
    } catch (error) {
      logger.error('Error emitting media upload event:', error);
    }
  }

  /**
   * Emit user activity event
   */
  public emitUserActivity(tenantId: string, event: UserActivityEvent): void {
    try {
      const socketManager = getSocketManager();
      
      // Broadcast to tenant (for activity feeds)
      socketManager.broadcastToTenant(tenantId, 'user:activity', event);
      
      // Send to users viewing the entity if applicable
      if (event.entityType && event.entityId) {
        socketManager.sendToEntity(event.entityType, event.entityId, 'user:activity', event);
      }
      
      logger.info(`User activity event emitted for user ${event.userId} in tenant ${tenantId}`);
    } catch (error) {
      logger.error('Error emitting user activity event:', error);
    }
  }

  /**
   * Send notification to specific users
   */
  public sendNotification(tenantId: string, notification: NotificationEvent): void {
    try {
      const socketManager = getSocketManager();
      
      // Send to specific users
      socketManager.sendNotification(notification.recipientIds, notification);
      
      logger.info(`Notification sent to ${notification.recipientIds.length} users in tenant ${tenantId}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  /**
   * Emit dashboard metrics update
   */
  public emitDashboardUpdate(tenantId: string, metrics: {
    type: 'vehicle_count' | 'workflow_progress' | 'user_activity' | 'system_status';
    data: any;
    timestamp: Date;
  }): void {
    try {
      const socketManager = getSocketManager();
      
      // Send to managers and admins
      socketManager.sendToRole(tenantId, 'manager', 'dashboard:updated', metrics);
      socketManager.sendToRole(tenantId, 'admin', 'dashboard:updated', metrics);
      
      logger.info(`Dashboard update emitted for tenant ${tenantId}`);
    } catch (error) {
      logger.error('Error emitting dashboard update:', error);
    }
  }

  /**
   * Emit system status change
   */
  public emitSystemStatus(tenantId: string, status: {
    type: 'maintenance' | 'outage' | 'degraded' | 'operational';
    message: string;
    affectedServices?: string[];
    estimatedResolution?: Date;
    timestamp: Date;
  }): void {
    try {
      const socketManager = getSocketManager();
      
      // Broadcast to all users in tenant
      socketManager.broadcastToTenant(tenantId, 'system:status', status);
      
      logger.info(`System status update emitted for tenant ${tenantId}: ${status.type}`);
    } catch (error) {
      logger.error('Error emitting system status:', error);
    }
  }

  /**
   * Emit data synchronization events
   */
  public emitDataSync(tenantId: string, sync: {
    entityType: string;
    action: 'created' | 'updated' | 'deleted';
    entityId: string;
    data?: any;
    timestamp: Date;
  }): void {
    try {
      const socketManager = getSocketManager();
      
      // Broadcast to tenant for cache invalidation
      socketManager.broadcastToTenant(tenantId, 'data:sync', sync);
      
      logger.info(`Data sync event emitted for ${sync.entityType}:${sync.entityId} in tenant ${tenantId}`);
    } catch (error) {
      logger.error('Error emitting data sync event:', error);
    }
  }

  /**
   * Emit collaboration events (comments, mentions, etc.)
   */
  public emitCollaboration(tenantId: string, collaboration: {
    type: 'comment' | 'mention' | 'share' | 'review_request';
    entityType: string;
    entityId: string;
    fromUserId: string;
    toUserIds?: string[];
    content?: string;
    timestamp: Date;
  }): void {
    try {
      const socketManager = getSocketManager();
      
      // Send to mentioned users
      if (collaboration.toUserIds) {
        collaboration.toUserIds.forEach(userId => {
          socketManager.sendToUser(userId, 'collaboration:mention', collaboration);
        });
      }
      
      // Send to users viewing the entity
      socketManager.sendToEntity(collaboration.entityType, collaboration.entityId, 'collaboration:update', collaboration);
      
      logger.info(`Collaboration event emitted for ${collaboration.entityType}:${collaboration.entityId} in tenant ${tenantId}`);
    } catch (error) {
      logger.error('Error emitting collaboration event:', error);
    }
  }

  /**
   * Emit live metrics for real-time charts
   */
  public emitLiveMetrics(tenantId: string, metrics: {
    category: string;
    metric: string;
    value: number;
    unit?: string;
    timestamp: Date;
  }): void {
    try {
      const socketManager = getSocketManager();
      
      // Send to dashboard viewers
      socketManager.sendToRole(tenantId, 'manager', 'metrics:live', metrics);
      socketManager.sendToRole(tenantId, 'admin', 'metrics:live', metrics);
      
      logger.debug(`Live metrics emitted for tenant ${tenantId}: ${metrics.category}.${metrics.metric}`);
    } catch (error) {
      logger.error('Error emitting live metrics:', error);
    }
  }
}

// Convenience functions
export const emitVehicleUpdate = (tenantId: string, event: VehicleUpdateEvent) => 
  RealTimeEventEmitter.getInstance().emitVehicleUpdate(tenantId, event);

export const emitWorkflowUpdate = (tenantId: string, event: WorkflowUpdateEvent) => 
  RealTimeEventEmitter.getInstance().emitWorkflowUpdate(tenantId, event);

export const emitMediaUpload = (tenantId: string, event: MediaUploadEvent) => 
  RealTimeEventEmitter.getInstance().emitMediaUpload(tenantId, event);

export const emitUserActivity = (tenantId: string, event: UserActivityEvent) => 
  RealTimeEventEmitter.getInstance().emitUserActivity(tenantId, event);

export const sendNotification = (tenantId: string, notification: NotificationEvent) => 
  RealTimeEventEmitter.getInstance().sendNotification(tenantId, notification);

export const emitDashboardUpdate = (tenantId: string, metrics: any) => 
  RealTimeEventEmitter.getInstance().emitDashboardUpdate(tenantId, metrics);

export const emitDataSync = (tenantId: string, sync: any) => 
  RealTimeEventEmitter.getInstance().emitDataSync(tenantId, sync);

export const emitCollaboration = (tenantId: string, collaboration: any) => 
  RealTimeEventEmitter.getInstance().emitCollaboration(tenantId, collaboration);

export const emitLiveMetrics = (tenantId: string, metrics: any) => 
  RealTimeEventEmitter.getInstance().emitLiveMetrics(tenantId, metrics);