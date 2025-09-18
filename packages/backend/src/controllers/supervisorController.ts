import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse,
  PaginationParams
} from '@omsms/shared';

// Validation schemas
const createSupervisorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  permissions: z.record(z.boolean()).optional()
});

const updateSupervisorSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  permissions: z.record(z.boolean()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional()
});

export class SupervisorController {
  /**
   * Get all supervisors with pagination and filtering
   */
  static async getSupervisors(req: Request, res: Response): Promise<void> {
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
      const where: any = {
        role: 'supervisor'
      };
      
      if (query.search) {
        where.OR = [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      if (query.status) where.status = query.status;
      if (query.departmentId) where.departmentId = query.departmentId;
      if (query.locationId) where.locationId = query.locationId;

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

      // Get supervisors
      const [supervisors, total] = await Promise.all([
        tenantDb.user.findMany({
          where,
          include: {
            department: {
              select: {
                departmentId: true,
                departmentName: true,
                colorCode: true
              }
            },
            location: {
              select: {
                locationId: true,
                locationName: true,
                city: true,
                state: true
              }
            },
            _count: {
              select: {
                supervisedVehicles: true,
                qualityChecks: true
              }
            }
          },
          skip,
          take: limit,
          orderBy
        }),
        tenantDb.user.count({ where })
      ]);

      // Remove password hashes from response
      const supervisorsWithoutPasswords = supervisors.map(({ passwordHash, ...supervisor }) => supervisor);

      const response: ApiResponse<typeof supervisorsWithoutPasswords> = {
        success: true,
        data: supervisorsWithoutPasswords,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get supervisors error:', error);
      
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
        error: 'Failed to get supervisors'
      } as ApiResponse);
    }
  }

  /**
   * Get supervisor by ID
   */
  static async getSupervisorById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { supervisorId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const supervisor = await tenantDb.user.findFirst({
        where: { 
          userId: supervisorId,
          role: 'supervisor'
        },
        include: {
          department: true,
          location: true,
          supervisedVehicles: {
            select: {
              vehicleId: true,
              carNumber: true,
              ownerName: true,
              status: true,
              inwardDate: true
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          qualityChecks: {
            select: {
              installationId: true,
              qualityCheckDate: true,
              status: true,
              vehicle: {
                select: {
                  carNumber: true,
                  ownerName: true
                }
              }
            },
            take: 10,
            orderBy: { qualityCheckDate: 'desc' }
          }
        }
      });

      if (!supervisor) {
        res.status(404).json({
          success: false,
          error: 'Supervisor not found'
        } as ApiResponse);
        return;
      }

      // Remove password hash from response
      const { passwordHash, ...supervisorWithoutPassword } = supervisor;

      const response: ApiResponse<typeof supervisorWithoutPassword> = {
        success: true,
        data: supervisorWithoutPassword
      };

      res.json(response);
    } catch (error) {
      console.error('Get supervisor error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get supervisor'
      } as ApiResponse);
    }
  }

  /**
   * Create new supervisor
   */
  static async createSupervisor(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = createSupervisorSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);
      const { AuthService } = await import('../lib/auth');

      // Check if user already exists
      const existingUser = await tenantDb.user.findUnique({
        where: { email: body.email }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        } as ApiResponse);
        return;
      }

      // Validate department exists (required for supervisors)
      const department = await tenantDb.department.findUnique({
        where: { departmentId: body.departmentId }
      });

      if (!department) {
        res.status(400).json({
          success: false,
          error: 'Department not found'
        } as ApiResponse);
        return;
      }

      // Validate location exists if provided
      if (body.locationId) {
        const location = await tenantDb.location.findUnique({
          where: { locationId: body.locationId }
        });

        if (!location) {
          res.status(400).json({
            success: false,
            error: 'Location not found'
          } as ApiResponse);
          return;
        }
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(body.password);

      // Get default permissions for supervisor role
      const permissions = body.permissions || AuthService.getDefaultPermissions('supervisor');

      // Create supervisor
      const newSupervisor = await tenantDb.user.create({
        data: {
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          mobileNumber: body.mobileNumber,
          address: body.address,
          role: 'supervisor',
          departmentId: body.departmentId,
          locationId: body.locationId,
          permissions,
          preferences: {},
          status: 'active'
        },
        include: {
          department: true,
          location: true
        }
      });

      // Remove password hash from response
      const { passwordHash: _, ...supervisorWithoutPassword } = newSupervisor;

      const response: ApiResponse<typeof supervisorWithoutPassword> = {
        success: true,
        data: supervisorWithoutPassword,
        message: 'Supervisor created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create supervisor error:', error);
      
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
        error: 'Failed to create supervisor'
      } as ApiResponse);
    }
  }

  /**
   * Update supervisor
   */
  static async updateSupervisor(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { supervisorId } = req.params;
      const body = updateSupervisorSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if supervisor exists
      const existingSupervisor = await tenantDb.user.findFirst({
        where: { 
          userId: supervisorId,
          role: 'supervisor'
        }
      });

      if (!existingSupervisor) {
        res.status(404).json({
          success: false,
          error: 'Supervisor not found'
        } as ApiResponse);
        return;
      }

      // Validate department exists if provided
      if (body.departmentId) {
        const department = await tenantDb.department.findUnique({
          where: { departmentId: body.departmentId }
        });

        if (!department) {
          res.status(400).json({
            success: false,
            error: 'Department not found'
          } as ApiResponse);
          return;
        }
      }

      // Validate location exists if provided
      if (body.locationId) {
        const location = await tenantDb.location.findUnique({
          where: { locationId: body.locationId }
        });

        if (!location) {
          res.status(400).json({
            success: false,
            error: 'Location not found'
          } as ApiResponse);
          return;
        }
      }

      // Update supervisor
      const updatedSupervisor = await tenantDb.user.update({
        where: { userId: supervisorId },
        data: body,
        include: {
          department: true,
          location: true
        }
      });

      // Remove password hash from response
      const { passwordHash, ...supervisorWithoutPassword } = updatedSupervisor;

      const response: ApiResponse<typeof supervisorWithoutPassword> = {
        success: true,
        data: supervisorWithoutPassword,
        message: 'Supervisor updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update supervisor error:', error);
      
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
        error: 'Failed to update supervisor'
      } as ApiResponse);
    }
  }

  /**
   * Delete supervisor
   */
  static async deleteSupervisor(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { supervisorId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if supervisor exists
      const existingSupervisor = await tenantDb.user.findFirst({
        where: { 
          userId: supervisorId,
          role: 'supervisor'
        },
        include: {
          _count: {
            select: {
              supervisedVehicles: true,
              qualityChecks: true
            }
          }
        }
      });

      if (!existingSupervisor) {
        res.status(404).json({
          success: false,
          error: 'Supervisor not found'
        } as ApiResponse);
        return;
      }

      // Check if supervisor has assigned vehicles or quality checks
      if (existingSupervisor._count.supervisedVehicles > 0 || existingSupervisor._count.qualityChecks > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete supervisor with assigned vehicles or quality checks. Please reassign them first.'
        } as ApiResponse);
        return;
      }

      // Soft delete by setting status to inactive
      await tenantDb.user.update({
        where: { userId: supervisorId },
        data: { status: 'inactive' }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Supervisor deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete supervisor error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete supervisor'
      } as ApiResponse);
    }
  }

  /**
   * Get supervisor statistics
   */
  static async getSupervisorStats(req: Request, res: Response): Promise<void> {
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
        totalSupervisors,
        activeSupervisors,
        supervisorsByDepartment,
        qualityMetrics,
        workloadDistribution
      ] = await Promise.all([
        tenantDb.user.count({ where: { role: 'supervisor' } }),
        tenantDb.user.count({ where: { role: 'supervisor', status: 'active' } }),
        tenantDb.user.groupBy({
          by: ['departmentId'],
          _count: { departmentId: true },
          where: { 
            role: 'supervisor',
            departmentId: { not: null },
            status: 'active'
          },
          orderBy: { _count: { departmentId: 'desc' } }
        }),
        tenantDb.installation.groupBy({
          by: ['status'],
          _count: { status: true },
          where: {
            qualityCheckedBy: { not: null }
          }
        }),
        tenantDb.user.findMany({
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: {
                departmentName: true,
                colorCode: true
              }
            },
            _count: {
              select: {
                supervisedVehicles: true,
                qualityChecks: true
              }
            }
          },
          where: { role: 'supervisor', status: 'active' },
          orderBy: {
            supervisedVehicles: {
              _count: 'desc'
            }
          },
          take: 10
        })
      ]);

      const stats = {
        overview: {
          total: totalSupervisors,
          active: activeSupervisors,
          inactive: totalSupervisors - activeSupervisors
        },
        distribution: {
          byDepartment: supervisorsByDepartment
        },
        quality: {
          metrics: qualityMetrics
        },
        workload: workloadDistribution
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get supervisor stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get supervisor statistics'
      } as ApiResponse);
    }
  }
}