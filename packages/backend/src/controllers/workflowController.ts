import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse,
  UserRole
} from '@omsms/shared';

// Workflow stage schema
const workflowStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['start', 'task', 'decision', 'end']),
  assignedRole: z.enum(['admin', 'manager', 'coordinator', 'supervisor', 'salesperson', 'installer']).optional(),
  assignedUserId: z.string().uuid().optional(),
  autoAdvance: z.boolean().default(false),
  requiredFields: z.array(z.string()).default([]),
  conditions: z.record(z.any()).default({}),
  actions: z.array(z.object({
    type: z.enum(['notification', 'assignment', 'status_update', 'webhook', 'email']),
    config: z.record(z.any())
  })).default([]),
  timeoutHours: z.number().optional(),
  nextStages: z.array(z.string()).default([])
});

// Workflow definition schemas
const createWorkflowSchema = z.object({
  workflowName: z.string().min(1).max(255),
  workflowType: z.enum(['vehicle_processing', 'quality_control', 'delivery', 'custom']),
  description: z.string().optional(),
  stages: z.array(workflowStageSchema),
  rules: z.object({
    autoStart: z.boolean().default(false),
    allowSkipStages: z.boolean().default(false),
    requireApproval: z.boolean().default(false),
    notifyOnDelay: z.boolean().default(true),
    escalationHours: z.number().optional()
  }).default({}),
  notifications: z.object({
    onStart: z.boolean().default(true),
    onComplete: z.boolean().default(true),
    onStageChange: z.boolean().default(true),
    onDelay: z.boolean().default(true),
    channels: z.array(z.enum(['email', 'sms', 'push', 'webhook'])).default(['email'])
  }).default({})
});

const updateWorkflowSchema = createWorkflowSchema.partial().omit(['workflowName']);

const startWorkflowSchema = z.object({
  entityType: z.enum(['vehicle', 'installation', 'order']),
  entityId: z.string().uuid(),
  assignedTo: z.string().uuid().optional(),
  initialData: z.record(z.any()).default({})
});

const advanceWorkflowSchema = z.object({
  nextStage: z.string(),
  notes: z.string().optional(),
  stageData: z.record(z.any()).default({})
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  workflowType: z.enum(['vehicle_processing', 'quality_control', 'delivery', 'custom']).optional(),
  status: z.enum(['active', 'inactive']).optional()
});

export class WorkflowController {
  /**
   * Get all workflow definitions
   */
  static async getWorkflows(req: Request, res: Response): Promise<void> {
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
      if (query.search) {
        where.OR = [
          { workflowName: { contains: query.search, mode: 'insensitive' } },
          { workflowType: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      if (query.workflowType) where.workflowType = query.workflowType;
      if (query.status) where.status = query.status;

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Sorting
      const orderBy: any = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'asc';
      } else {
        orderBy.workflowName = 'asc';
      }

      // Get workflows with instance counts
      const [workflows, total] = await Promise.all([
        tenantDb.workflow.findMany({
          where,
          include: {
            _count: {
              select: {
                instances: true
              }
            }
          },
          skip,
          take: limit,
          orderBy
        }),
        tenantDb.workflow.count({ where })
      ]);

      const response: ApiResponse<typeof workflows> = {
        success: true,
        data: workflows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get workflows error:', error);
      
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
        error: 'Failed to get workflows'
      } as ApiResponse);
    }
  }

  /**
   * Get workflow definition by ID
   */
  static async getWorkflowById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { workflowId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const workflow = await tenantDb.workflow.findUnique({
        where: { workflowId },
        include: {
          _count: {
            select: {
              instances: true
            }
          },
          instances: {
            select: {
              instanceId: true,
              entityType: true,
              entityId: true,
              currentStage: true,
              status: true,
              startedAt: true,
              completedAt: true,
              assignedTo: true,
              assignee: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            },
            take: 10,
            orderBy: { startedAt: 'desc' }
          }
        }
      });

      if (!workflow) {
        res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<typeof workflow> = {
        success: true,
        data: workflow
      };

      res.json(response);
    } catch (error) {
      console.error('Get workflow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow'
      } as ApiResponse);
    }
  }

  /**
   * Create new workflow definition
   */
  static async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = createWorkflowSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if workflow name already exists
      const existingWorkflow = await tenantDb.workflow.findFirst({
        where: { 
          workflowName: body.workflowName,
          status: 'active'
        }
      });

      if (existingWorkflow) {
        res.status(409).json({
          success: false,
          error: 'Workflow with this name already exists'
        } as ApiResponse);
        return;
      }

      // Validate workflow stages
      const validationResult = WorkflowController.validateWorkflowStages(body.stages);
      if (!validationResult.valid) {
        res.status(400).json({
          success: false,
          error: 'Invalid workflow configuration',
          details: validationResult.errors
        } as ApiResponse);
        return;
      }

      // Create workflow
      const newWorkflow = await tenantDb.workflow.create({
        data: {
          workflowName: body.workflowName,
          workflowType: body.workflowType,
          stages: body.stages,
          rules: body.rules,
          notifications: body.notifications,
          status: 'active'
        },
        include: {
          _count: {
            select: {
              instances: true
            }
          }
        }
      });

      const response: ApiResponse<typeof newWorkflow> = {
        success: true,
        data: newWorkflow,
        message: 'Workflow created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create workflow error:', error);
      
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
        error: 'Failed to create workflow'
      } as ApiResponse);
    }
  }

  /**
   * Update workflow definition
   */
  static async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { workflowId } = req.params;
      const body = updateWorkflowSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if workflow exists
      const existingWorkflow = await tenantDb.workflow.findUnique({
        where: { workflowId }
      });

      if (!existingWorkflow) {
        res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
        return;
      }

      // Validate workflow stages if provided
      if (body.stages) {
        const validationResult = WorkflowController.validateWorkflowStages(body.stages);
        if (!validationResult.valid) {
          res.status(400).json({
            success: false,
            error: 'Invalid workflow configuration',
            details: validationResult.errors
          } as ApiResponse);
          return;
        }
      }

      // Update workflow
      const updatedWorkflow = await tenantDb.workflow.update({
        where: { workflowId },
        data: body,
        include: {
          _count: {
            select: {
              instances: true
            }
          }
        }
      });

      const response: ApiResponse<typeof updatedWorkflow> = {
        success: true,
        data: updatedWorkflow,
        message: 'Workflow updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update workflow error:', error);
      
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
        error: 'Failed to update workflow'
      } as ApiResponse);
    }
  }

  /**
   * Delete workflow definition
   */
  static async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { workflowId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if workflow exists and get instance count
      const existingWorkflow = await tenantDb.workflow.findUnique({
        where: { workflowId },
        include: {
          _count: {
            select: {
              instances: true
            }
          }
        }
      });

      if (!existingWorkflow) {
        res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
        return;
      }

      // Check if workflow has active instances
      if (existingWorkflow._count.instances > 0) {
        // Soft delete by setting status to inactive
        await tenantDb.workflow.update({
          where: { workflowId },
          data: { status: 'inactive' }
        });

        const response: ApiResponse = {
          success: true,
          message: 'Workflow deactivated (has active instances)'
        };

        res.json(response);
        return;
      }

      // Hard delete if no instances
      await tenantDb.workflow.delete({
        where: { workflowId }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Workflow deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete workflow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete workflow'
      } as ApiResponse);
    }
  }

  /**
   * Start workflow instance
   */
  static async startWorkflow(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const { workflowId } = req.params;
      const body = startWorkflowSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Get workflow definition
      const workflow = await tenantDb.workflow.findUnique({
        where: { workflowId }
      });

      if (!workflow || workflow.status !== 'active') {
        res.status(404).json({
          success: false,
          error: 'Active workflow not found'
        } as ApiResponse);
        return;
      }

      // Validate entity exists
      if (body.entityType === 'vehicle') {
        const vehicle = await tenantDb.vehicle.findUnique({
          where: { vehicleId: body.entityId }
        });
        if (!vehicle) {
          res.status(400).json({
            success: false,
            error: 'Vehicle not found'
          } as ApiResponse);
          return;
        }
      }

      // Find start stage
      const stages = workflow.stages as any[];
      const startStage = stages.find(stage => stage.type === 'start');
      
      if (!startStage) {
        res.status(400).json({
          success: false,
          error: 'No start stage found in workflow'
        } as ApiResponse);
        return;
      }

      // Create workflow instance
      const instance = await tenantDb.workflowInstance.create({
        data: {
          workflowId: workflow.workflowId,
          entityType: body.entityType,
          entityId: body.entityId,
          currentStage: startStage.id,
          stageData: body.initialData,
          stageHistory: [{
            stage: startStage.id,
            userId: req.user.userId,
            timestamp: new Date(),
            notes: 'Workflow started',
            metadata: body.initialData
          }],
          status: 'in_progress',
          assignedTo: body.assignedTo
        },
        include: {
          workflow: {
            select: {
              workflowName: true,
              workflowType: true
            }
          },
          assignee: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // TODO: Execute start stage actions
      // TODO: Send notifications

      const response: ApiResponse<typeof instance> = {
        success: true,
        data: instance,
        message: 'Workflow started successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Start workflow error:', error);
      
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
        error: 'Failed to start workflow'
      } as ApiResponse);
    }
  }

  /**
   * Get workflow statistics
   */
  static async getWorkflowStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);

      // Get comprehensive workflow statistics
      const [
        totalWorkflows,
        activeWorkflows,
        workflowsByType,
        activeInstances,
        completedInstances,
        instancesByStatus
      ] = await Promise.all([
        tenantDb.workflow.count(),
        tenantDb.workflow.count({ where: { status: 'active' } }),
        tenantDb.workflow.groupBy({
          by: ['workflowType'],
          _count: { workflowType: true },
          where: { status: 'active' }
        }),
        tenantDb.workflowInstance.count({ where: { status: 'in_progress' } }),
        tenantDb.workflowInstance.count({ where: { status: 'completed' } }),
        tenantDb.workflowInstance.groupBy({
          by: ['status'],
          _count: { status: true }
        })
      ]);

      const stats = {
        overview: {
          totalWorkflows,
          activeWorkflows,
          inactiveWorkflows: totalWorkflows - activeWorkflows
        },
        instances: {
          active: activeInstances,
          completed: completedInstances,
          byStatus: instancesByStatus
        },
        distribution: {
          byType: workflowsByType
        }
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get workflow stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow statistics'
      } as ApiResponse);
    }
  }

  // Helper methods
  private static validateWorkflowStages(stages: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for start stage
    const startStages = stages.filter(stage => stage.type === 'start');
    if (startStages.length !== 1) {
      errors.push('Workflow must have exactly one start stage');
    }

    // Check for end stage
    const endStages = stages.filter(stage => stage.type === 'end');
    if (endStages.length === 0) {
      errors.push('Workflow must have at least one end stage');
    }

    // Check stage IDs are unique
    const stageIds = stages.map(stage => stage.id);
    const uniqueIds = [...new Set(stageIds)];
    if (stageIds.length !== uniqueIds.length) {
      errors.push('Stage IDs must be unique');
    }

    // Check next stage references
    for (const stage of stages) {
      for (const nextStageId of stage.nextStages || []) {
        if (!stageIds.includes(nextStageId)) {
          errors.push(`Stage "${stage.id}" references non-existent next stage "${nextStageId}"`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}