import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse,
  PaginationParams
} from '@omsms/shared';

// Validation schemas
const createCoordinatorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  permissions: z.record(z.boolean()).optional()
});

const updateCoordinatorSchema = z.object({
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

export class CoordinatorController {
  /**
   * Get all coordinators with pagination and filtering
   */
  static async getCoordinators(req: Request, res: Response): Promise<void> {
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
        role: 'coordinator'
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

      // Get coordinators
      const [coordinators, total] = await Promise.all([
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
                coordinatedVehicles: true
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
      const coordinatorsWithoutPasswords = coordinators.map(({ passwordHash, ...coordinator }) => coordinator);

      const response: ApiResponse<typeof coordinatorsWithoutPasswords> = {
        success: true,
        data: coordinatorsWithoutPasswords,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get coordinators error:', error);
      
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
        error: 'Failed to get coordinators'
      } as ApiResponse);
    }
  }

  /**
   * Get coordinator by ID
   */
  static async getCoordinatorById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { coordinatorId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const coordinator = await tenantDb.user.findFirst({
        where: { 
          userId: coordinatorId,
          role: 'coordinator'
        },
        include: {
          department: true,
          location: true,
          coordinatedVehicles: {
            select: {
              vehicleId: true,
              carNumber: true,
              ownerName: true,
              status: true,
              inwardDate: true
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!coordinator) {
        res.status(404).json({
          success: false,
          error: 'Coordinator not found'
        } as ApiResponse);
        return;
      }

      // Remove password hash from response
      const { passwordHash, ...coordinatorWithoutPassword } = coordinator;

      const response: ApiResponse<typeof coordinatorWithoutPassword> = {
        success: true,
        data: coordinatorWithoutPassword
      };

      res.json(response);
    } catch (error) {
      console.error('Get coordinator error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get coordinator'
      } as ApiResponse);
    }
  }

  /**
   * Create new coordinator
   */
  static async createCoordinator(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = createCoordinatorSchema.parse(req.body);
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

      // Hash password
      const passwordHash = await AuthService.hashPassword(body.password);

      // Get default permissions for coordinator role
      const permissions = body.permissions || AuthService.getDefaultPermissions('coordinator');

      // Create coordinator
      const newCoordinator = await tenantDb.user.create({
        data: {
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          mobileNumber: body.mobileNumber,
          address: body.address,
          role: 'coordinator',
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
      const { passwordHash: _, ...coordinatorWithoutPassword } = newCoordinator;

      const response: ApiResponse<typeof coordinatorWithoutPassword> = {
        success: true,
        data: coordinatorWithoutPassword,
        message: 'Coordinator created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create coordinator error:', error);
      
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
        error: 'Failed to create coordinator'
      } as ApiResponse);
    }
  }

  /**
   * Update coordinator
   */
  static async updateCoordinator(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { coordinatorId } = req.params;
      const body = updateCoordinatorSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if coordinator exists
      const existingCoordinator = await tenantDb.user.findFirst({
        where: { 
          userId: coordinatorId,
          role: 'coordinator'
        }
      });

      if (!existingCoordinator) {
        res.status(404).json({
          success: false,
          error: 'Coordinator not found'
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

      // Update coordinator
      const updatedCoordinator = await tenantDb.user.update({
        where: { userId: coordinatorId },
        data: body,
        include: {
          department: true,
          location: true
        }
      });

      // Remove password hash from response
      const { passwordHash, ...coordinatorWithoutPassword } = updatedCoordinator;

      const response: ApiResponse<typeof coordinatorWithoutPassword> = {
        success: true,
        data: coordinatorWithoutPassword,
        message: 'Coordinator updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update coordinator error:', error);
      
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
        error: 'Failed to update coordinator'
      } as ApiResponse);
    }
  }

  /**
   * Delete coordinator
   */
  static async deleteCoordinator(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { coordinatorId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if coordinator exists
      const existingCoordinator = await tenantDb.user.findFirst({
        where: { 
          userId: coordinatorId,
          role: 'coordinator'
        },
        include: {
          _count: {
            select: {
              coordinatedVehicles: true
            }
          }
        }
      });

      if (!existingCoordinator) {
        res.status(404).json({
          success: false,
          error: 'Coordinator not found'
        } as ApiResponse);
        return;
      }

      // Check if coordinator has assigned vehicles
      if (existingCoordinator._count.coordinatedVehicles > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete coordinator with assigned vehicles. Please reassign vehicles first.'
        } as ApiResponse);
        return;
      }

      // Soft delete by setting status to inactive
      await tenantDb.user.update({
        where: { userId: coordinatorId },
        data: { status: 'inactive' }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Coordinator deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete coordinator error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete coordinator'
      } as ApiResponse);
    }
  }

  /**
   * Get coordinator statistics
   */
  static async getCoordinatorStats(req: Request, res: Response): Promise<void> {
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
        totalCoordinators,
        activeCoordinators,
        coordinatorsByDepartment,
        coordinatorsByLocation,
        workloadDistribution
      ] = await Promise.all([
        tenantDb.user.count({ where: { role: 'coordinator' } }),
        tenantDb.user.count({ where: { role: 'coordinator', status: 'active' } }),
        tenantDb.user.groupBy({
          by: ['departmentId'],
          _count: { departmentId: true },
          where: { 
            role: 'coordinator',
            departmentId: { not: null },
            status: 'active'
          },
          orderBy: { _count: { departmentId: 'desc' } }
        }),
        tenantDb.user.groupBy({
          by: ['locationId'],
          _count: { locationId: true },
          where: { 
            role: 'coordinator',
            locationId: { not: null },
            status: 'active'
          },
          orderBy: { _count: { locationId: 'desc' } }
        }),
        tenantDb.user.findMany({
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: {
                departmentName: true
              }
            },
            location: {
              select: {
                locationName: true
              }
            },
            _count: {
              select: {
                coordinatedVehicles: true
              }
            }
          },
          where: { role: 'coordinator', status: 'active' },
          orderBy: {
            coordinatedVehicles: {
              _count: 'desc'
            }
          },
          take: 10
        })
      ]);

      const stats = {
        overview: {
          total: totalCoordinators,
          active: activeCoordinators,
          inactive: totalCoordinators - activeCoordinators
        },
        distribution: {
          byDepartment: coordinatorsByDepartment,
          byLocation: coordinatorsByLocation
        },
        workload: workloadDistribution
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get coordinator stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get coordinator statistics'
      } as ApiResponse);
    }
  }
}