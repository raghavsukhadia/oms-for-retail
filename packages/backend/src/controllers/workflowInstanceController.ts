import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse,
  PaginationParams
} from '@omsms/shared';

// Validation schemas
const createWorkflowInstanceSchema = z.object({
  workflowId: z.string().uuid().optional(),
  entityType: z.string().min(1).max(50),
  entityId: z.string().uuid(),
  currentStage: z.string().min(1).max(100),
  stageData: z.record(z.any()).optional(),
  assignedTo: z.string().uuid().optional()
});

const updateWorkflowInstanceSchema = z.object({
  currentStage: z.string().min(1).max(100),
  stageData: z.record(z.any()).optional(),
  assignedTo: z.string().uuid().optional(),
  notes: z.string().optional(),
  status: z.enum(['in_progress', 'completed', 'cancelled']).optional()
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  entityType: z.string().optional(),
  status: z.enum(['in_progress', 'completed', 'cancelled']).optional(),
  assignedTo: z.string().uuid().optional()
});

export class WorkflowInstanceController {
  /**
   * Get all workflow instances with pagination and filtering
   */
  static async getWorkflowInstances(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const query = paginationSchema.parse(req.query);
      const tenantDb = await getTenantDb(req.tenantId);

      // Build where clause
      const where: any = {};
      if (query.entityType) where.entityType = query.entityType;
      if (query.status) where.status = query.status;
      if (query.assignedTo) where.assignedTo = query.assignedTo;

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Sorting
      const orderBy: any = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'asc';
      } else {
        orderBy.createdAt = 'desc';
      }

      // Get workflow instances
      const [workflowInstances, total] = await Promise.all([
        tenantDb.workflowInstance.findMany({
          where,
          include: {
            workflow: {
              select: {
                workflowId: true,
                workflowName: true,
                workflowType: true
              }
            },
            assignee: {
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
          orderBy
        }),
        tenantDb.workflowInstance.count({ where })
      ]);

      const response: ApiResponse<typeof workflowInstances> = {
        success: true,
        data: workflowInstances,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get workflow instances error:', error);
      
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
        error: 'Failed to get workflow instances'
      } as ApiResponse);
    }
  }

  /**
   * Get workflow instance by ID
   */
  static async getWorkflowInstanceById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { instanceId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const workflowInstance = await tenantDb.workflowInstance.findUnique({
        where: { instanceId },
        include: {
          workflow: true,
          assignee: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      });

      if (!workflowInstance) {
        res.status(404).json({
          success: false,
          error: 'Workflow instance not found'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<typeof workflowInstance> = {
        success: true,
        data: workflowInstance
      };

      res.json(response);
    } catch (error) {
      console.error('Get workflow instance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow instance'
      } as ApiResponse);
    }
  }

  /**
   * Create new workflow instance
   */
  static async createWorkflowInstance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = createWorkflowInstanceSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Validate workflow exists if provided
      if (body.workflowId) {
        const workflow = await tenantDb.workflow.findUnique({
          where: { workflowId: body.workflowId }
        });

        if (!workflow) {
          res.status(400).json({
            success: false,
            error: 'Workflow not found'
          } as ApiResponse);
          return;
        }
      }

      // Validate assignee exists if provided
      if (body.assignedTo) {
        const assignee = await tenantDb.user.findUnique({
          where: { userId: body.assignedTo }
        });

        if (!assignee) {
          res.status(400).json({
            success: false,
            error: 'Assignee not found'
          } as ApiResponse);
          return;
        }
      }

      // Create workflow instance
      const newWorkflowInstance = await tenantDb.workflowInstance.create({
        data: {
          workflowId: body.workflowId,
          entityType: body.entityType,
          entityId: body.entityId,
          currentStage: body.currentStage,
          stageData: body.stageData || {},
          stageHistory: [{
            stage: body.currentStage,
            timestamp: new Date().toISOString(),
            userId: req.user?.userId,
            notes: 'Workflow instance created'
          }],
          status: 'in_progress',
          assignedTo: body.assignedTo,
          startedAt: new Date()
        },
        include: {
          workflow: true,
          assignee: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      const response: ApiResponse<typeof newWorkflowInstance> = {
        success: true,
        data: newWorkflowInstance,
        message: 'Workflow instance created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create workflow instance error:', error);
      
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
        error: 'Failed to create workflow instance'
      } as ApiResponse);
    }
  }

  /**
   * Update workflow instance (stage transition)
   */
  static async updateWorkflowInstance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { instanceId } = req.params;
      const body = updateWorkflowInstanceSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Get existing workflow instance
      const existingInstance = await tenantDb.workflowInstance.findUnique({
        where: { instanceId }
      });

      if (!existingInstance) {
        res.status(404).json({
          success: false,
          error: 'Workflow instance not found'
        } as ApiResponse);
        return;
      }

      // Validate assignee exists if provided
      if (body.assignedTo) {
        const assignee = await tenantDb.user.findUnique({
          where: { userId: body.assignedTo }
        });

        if (!assignee) {
          res.status(400).json({
            success: false,
            error: 'Assignee not found'
          } as ApiResponse);
          return;
        }
      }

      // Prepare stage history update
      const newHistoryEntry = {
        stage: body.currentStage,
        timestamp: new Date().toISOString(),
        userId: req.user?.userId,
        notes: body.notes || `Stage changed to ${body.currentStage}`,
        previousStage: existingInstance.currentStage
      };

      const updatedStageHistory = [
        ...(Array.isArray(existingInstance.stageHistory) ? existingInstance.stageHistory : []),
        newHistoryEntry
      ];

      // Determine if workflow is completed
      const isCompleted = body.status === 'completed' || 
        (body.currentStage === 'delivered' || body.currentStage === 'payment');

      // Update workflow instance
      const updatedInstance = await tenantDb.workflowInstance.update({
        where: { instanceId },
        data: {
          currentStage: body.currentStage,
          stageData: body.stageData ? { ...existingInstance.stageData, ...body.stageData } : existingInstance.stageData,
          stageHistory: updatedStageHistory,
          status: isCompleted ? 'completed' : (body.status || existingInstance.status),
          assignedTo: body.assignedTo,
          completedAt: isCompleted ? new Date() : existingInstance.completedAt,
          updatedAt: new Date()
        },
        include: {
          workflow: true,
          assignee: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      const response: ApiResponse<typeof updatedInstance> = {
        success: true,
        data: updatedInstance,
        message: 'Workflow instance updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update workflow instance error:', error);
      
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
        error: 'Failed to update workflow instance'
      } as ApiResponse);
    }
  }

  /**
   * Delete workflow instance
   */
  static async deleteWorkflowInstance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { instanceId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if workflow instance exists
      const existingInstance = await tenantDb.workflowInstance.findUnique({
        where: { instanceId }
      });

      if (!existingInstance) {
        res.status(404).json({
          success: false,
          error: 'Workflow instance not found'
        } as ApiResponse);
        return;
      }

      // Soft delete by setting status to cancelled
      await tenantDb.workflowInstance.update({
        where: { instanceId },
        data: { 
          status: 'cancelled',
          completedAt: new Date()
        }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Workflow instance cancelled successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete workflow instance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete workflow instance'
      } as ApiResponse);
    }
  }

  /**
   * Get workflow instances for a specific entity
   */
  static async getWorkflowInstancesByEntity(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { entityType, entityId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const workflowInstances = await tenantDb.workflowInstance.findMany({
        where: {
          entityType,
          entityId
        },
        include: {
          workflow: {
            select: {
              workflowId: true,
              workflowName: true,
              workflowType: true
            }
          },
          assignee: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const response: ApiResponse<typeof workflowInstances> = {
        success: true,
        data: workflowInstances
      };

      res.json(response);
    } catch (error) {
      console.error('Get workflow instances by entity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow instances'
      } as ApiResponse);
    }
  }

  /**
   * Update vehicle workflow stage (specialized endpoint)
   */
  static async updateVehicleWorkflowStage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { vehicleId, workflowType } = req.params;
      const { stage, notes } = req.body;
      const tenantDb = await getTenantDb(req.tenantId);

      // Validate vehicle exists
      const vehicle = await tenantDb.vehicle.findUnique({
        where: { vehicleId }
      });

      if (!vehicle) {
        res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        } as ApiResponse);
        return;
      }

      // Find or create workflow instance
      let workflowInstance = await tenantDb.workflowInstance.findFirst({
        where: {
          entityType: 'vehicle',
          entityId: vehicleId,
          workflow: {
            workflowType: workflowType
          }
        }
      });

      if (!workflowInstance) {
        // Create new workflow instance
        const workflow = await tenantDb.workflow.findFirst({
          where: { workflowType: workflowType }
        });

        workflowInstance = await tenantDb.workflowInstance.create({
          data: {
            workflowId: workflow?.workflowId,
            entityType: 'vehicle',
            entityId: vehicleId,
            currentStage: stage,
            stageData: {},
            stageHistory: [{
              stage: stage,
              timestamp: new Date().toISOString(),
              userId: req.user?.userId,
              notes: notes || `Workflow started at ${stage}`
            }],
            status: 'in_progress',
            startedAt: new Date()
          }
        });
      } else {
        // Update existing workflow instance
        const newHistoryEntry = {
          stage: stage,
          timestamp: new Date().toISOString(),
          userId: req.user?.userId,
          notes: notes || `Stage changed to ${stage}`,
          previousStage: workflowInstance.currentStage
        };

        const updatedStageHistory = [
          ...(Array.isArray(workflowInstance.stageHistory) ? workflowInstance.stageHistory : []),
          newHistoryEntry
        ];

        const isCompleted = stage === 'delivered' || stage === 'payment';

        workflowInstance = await tenantDb.workflowInstance.update({
          where: { instanceId: workflowInstance.instanceId },
          data: {
            currentStage: stage,
            stageHistory: updatedStageHistory,
            status: isCompleted ? 'completed' : workflowInstance.status,
            completedAt: isCompleted ? new Date() : workflowInstance.completedAt,
            updatedAt: new Date()
          }
        });
      }

      const response: ApiResponse<typeof workflowInstance> = {
        success: true,
        data: workflowInstance,
        message: `${workflowType} workflow updated successfully`
      };

      res.json(response);
    } catch (error) {
      console.error('Update vehicle workflow stage error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to update vehicle workflow stage'
        } as ApiResponse);
      }
    }
  }
}