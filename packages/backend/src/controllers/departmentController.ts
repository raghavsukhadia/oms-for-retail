import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse,
  Department,
  PaginationParams
} from '@omsms/shared';

// Validation schemas
const createDepartmentSchema = z.object({
  departmentName: z.string().min(1).max(255),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().optional(),
  headUserId: z.string().uuid().optional(),
  config: z.record(z.any()).optional()
});

const updateDepartmentSchema = z.object({
  departmentName: z.string().min(1).max(255).optional(),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().optional(),
  headUserId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  config: z.record(z.any()).optional()
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional()
});

export class DepartmentController {
  /**
   * Get all departments with pagination and filtering
   */
  static async getDepartments(req: Request, res: Response): Promise<void> {
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
          { departmentName: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } }
        ];
      }
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
        orderBy.departmentName = 'asc';
      }

      // Get departments with user counts and head user info
      const [departments, total] = await Promise.all([
        tenantDb.department.findMany({
          where,
          include: {
            headUser: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            _count: {
              select: {
                users: true
              }
            }
          },
          skip,
          take: limit,
          orderBy
        }),
        tenantDb.department.count({ where })
      ]);

      const response: ApiResponse<typeof departments> = {
        success: true,
        data: departments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get departments error:', error);
      
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
        error: 'Failed to get departments'
      } as ApiResponse);
    }
  }

  /**
   * Get department by ID
   */
  static async getDepartmentById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { departmentId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const department = await tenantDb.department.findUnique({
        where: { departmentId },
        include: {
          headUser: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          _count: {
            select: {
              users: true
            }
          },
          users: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              status: true
            },
            take: 20,
            orderBy: { firstName: 'asc' }
          }
        }
      });

      if (!department) {
        res.status(404).json({
          success: false,
          error: 'Department not found'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<typeof department> = {
        success: true,
        data: department
      };

      res.json(response);
    } catch (error) {
      console.error('Get department error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get department'
      } as ApiResponse);
    }
  }

  /**
   * Create new department
   */
  static async createDepartment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = createDepartmentSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if department name already exists
      const existingDepartment = await tenantDb.department.findFirst({
        where: { 
          departmentName: body.departmentName,
          status: 'active'
        }
      });

      if (existingDepartment) {
        res.status(409).json({
          success: false,
          error: 'Department with this name already exists'
        } as ApiResponse);
        return;
      }

      // Validate head user exists if provided
      if (body.headUserId) {
        const headUser = await tenantDb.user.findUnique({
          where: { userId: body.headUserId }
        });

        if (!headUser) {
          res.status(400).json({
            success: false,
            error: 'Head user not found'
          } as ApiResponse);
          return;
        }
      }

      // Create department
      const newDepartment = await tenantDb.department.create({
        data: {
          departmentName: body.departmentName,
          colorCode: body.colorCode,
          description: body.description,
          headUserId: body.headUserId,
          config: body.config || {},
          status: 'active'
        },
        include: {
          headUser: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        }
      });

      const response: ApiResponse<typeof newDepartment> = {
        success: true,
        data: newDepartment,
        message: 'Department created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create department error:', error);
      
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
        error: 'Failed to create department'
      } as ApiResponse);
    }
  }

  /**
   * Update department
   */
  static async updateDepartment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { departmentId } = req.params;
      const body = updateDepartmentSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if department exists
      const existingDepartment = await tenantDb.department.findUnique({
        where: { departmentId }
      });

      if (!existingDepartment) {
        res.status(404).json({
          success: false,
          error: 'Department not found'
        } as ApiResponse);
        return;
      }

      // Check if department name is being changed and already exists
      if (body.departmentName && body.departmentName !== existingDepartment.departmentName) {
        const duplicateDepartment = await tenantDb.department.findFirst({
          where: { 
            departmentName: body.departmentName,
            departmentId: { not: departmentId },
            status: 'active'
          }
        });

        if (duplicateDepartment) {
          res.status(409).json({
            success: false,
            error: 'Department with this name already exists'
          } as ApiResponse);
          return;
        }
      }

      // Validate head user exists if provided
      if (body.headUserId) {
        const headUser = await tenantDb.user.findUnique({
          where: { userId: body.headUserId }
        });

        if (!headUser) {
          res.status(400).json({
            success: false,
            error: 'Head user not found'
          } as ApiResponse);
          return;
        }
      }

      // Update department
      const updatedDepartment = await tenantDb.department.update({
        where: { departmentId },
        data: body,
        include: {
          headUser: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        }
      });

      const response: ApiResponse<typeof updatedDepartment> = {
        success: true,
        data: updatedDepartment,
        message: 'Department updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update department error:', error);
      
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
        error: 'Failed to update department'
      } as ApiResponse);
    }
  }

  /**
   * Delete department
   */
  static async deleteDepartment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { departmentId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if department exists
      const existingDepartment = await tenantDb.department.findUnique({
        where: { departmentId },
        include: {
          _count: {
            select: {
              users: true
            }
          }
        }
      });

      if (!existingDepartment) {
        res.status(404).json({
          success: false,
          error: 'Department not found'
        } as ApiResponse);
        return;
      }

      // Check if department has associated users
      if (existingDepartment._count.users > 0) {
        // Soft delete by setting status to inactive
        await tenantDb.department.update({
          where: { departmentId },
          data: { status: 'inactive' }
        });

        const response: ApiResponse = {
          success: true,
          message: 'Department deactivated successfully (has associated users)'
        };

        res.json(response);
        return;
      }

      // Hard delete if no associations
      await tenantDb.department.delete({
        where: { departmentId }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Department deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete department error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete department'
      } as ApiResponse);
    }
  }

  /**
   * Get department statistics
   */
  static async getDepartmentStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);

      // Get comprehensive statistics
      const [
        totalDepartments,
        activeDepartments,
        departmentsByUserCount,
        departmentsWithoutHead
      ] = await Promise.all([
        tenantDb.department.count(),
        tenantDb.department.count({ where: { status: 'active' } }),
        tenantDb.department.findMany({
          select: {
            departmentId: true,
            departmentName: true,
            colorCode: true,
            _count: {
              select: {
                users: true
              }
            },
            headUser: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          where: { status: 'active' },
          orderBy: {
            users: {
              _count: 'desc'
            }
          }
        }),
        tenantDb.department.count({
          where: {
            status: 'active',
            headUserId: null
          }
        })
      ]);

      const stats = {
        overview: {
          total: totalDepartments,
          active: activeDepartments,
          inactive: totalDepartments - activeDepartments,
          withoutHead: departmentsWithoutHead
        },
        departments: departmentsByUserCount
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get department stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get department statistics'
      } as ApiResponse);
    }
  }
}