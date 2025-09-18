import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse,
  PaginationParams
} from '@omsms/shared';

// For Account Team, we'll create a specialized view of users with manager role who handle accounts
// This could be expanded later to include specific account management features

// Validation schemas
const createAccountManagerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  permissions: z.record(z.boolean()).optional(),
  accountSpecialization: z.enum(['sales', 'customer_service', 'billing', 'general']).optional()
});

const updateAccountManagerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  permissions: z.record(z.boolean()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  accountSpecialization: z.enum(['sales', 'customer_service', 'billing', 'general']).optional()
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  specialization: z.enum(['sales', 'customer_service', 'billing', 'general']).optional()
});

export class AccountController {
  /**
   * Get all account managers with pagination and filtering
   */
  static async getAccountManagers(req: Request, res: Response): Promise<void> {
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

      // Build where clause - focusing on manager role for account team
      const where: any = {
        role: 'manager'
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
      
      // Filter by account specialization if provided (stored in preferences)
      if (query.specialization) {
        where.preferences = {
          path: ['accountSpecialization'],
          equals: query.specialization
        };
      }

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

      // Get account managers
      const [accountManagers, total] = await Promise.all([
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
            managedSalespeople: {
              select: {
                salespersonId: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            },
            headedDepartments: {
              select: {
                departmentId: true,
                departmentName: true
              }
            }
          },
          skip,
          take: limit,
          orderBy
        }),
        tenantDb.user.count({ where })
      ]);

      // Remove password hashes from response and add account specialization
      const accountManagersWithoutPasswords = accountManagers.map(({ passwordHash, ...manager }) => ({
        ...manager,
        accountSpecialization: manager.preferences?.accountSpecialization || 'general'
      }));

      const response: ApiResponse<typeof accountManagersWithoutPasswords> = {
        success: true,
        data: accountManagersWithoutPasswords,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get account managers error:', error);
      
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
        error: 'Failed to get account managers'
      } as ApiResponse);
    }
  }

  /**
   * Get account manager by ID
   */
  static async getAccountManagerById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { accountManagerId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const accountManager = await tenantDb.user.findFirst({
        where: { 
          userId: accountManagerId,
          role: 'manager'
        },
        include: {
          department: true,
          location: true,
          managedSalespeople: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  status: true
                }
              }
            }
          },
          headedDepartments: true
        }
      });

      if (!accountManager) {
        res.status(404).json({
          success: false,
          error: 'Account manager not found'
        } as ApiResponse);
        return;
      }

      // Remove password hash from response and add account specialization
      const { passwordHash, ...managerWithoutPassword } = accountManager;
      const responseData = {
        ...managerWithoutPassword,
        accountSpecialization: accountManager.preferences?.accountSpecialization || 'general'
      };

      const response: ApiResponse<typeof responseData> = {
        success: true,
        data: responseData
      };

      res.json(response);
    } catch (error) {
      console.error('Get account manager error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get account manager'
      } as ApiResponse);
    }
  }

  /**
   * Create new account manager
   */
  static async createAccountManager(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = createAccountManagerSchema.parse(req.body);
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

      // Get default permissions for manager role
      const permissions = body.permissions || AuthService.getDefaultPermissions('manager');

      // Set up preferences with account specialization
      const preferences = {
        accountSpecialization: body.accountSpecialization || 'general'
      };

      // Create account manager
      const newAccountManager = await tenantDb.user.create({
        data: {
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          mobileNumber: body.mobileNumber,
          address: body.address,
          role: 'manager',
          departmentId: body.departmentId,
          locationId: body.locationId,
          permissions,
          preferences,
          status: 'active'
        },
        include: {
          department: true,
          location: true
        }
      });

      // Remove password hash from response
      const { passwordHash: _, ...managerWithoutPassword } = newAccountManager;
      const responseData = {
        ...managerWithoutPassword,
        accountSpecialization: preferences.accountSpecialization
      };

      const response: ApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        message: 'Account manager created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create account manager error:', error);
      
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
        error: 'Failed to create account manager'
      } as ApiResponse);
    }
  }

  /**
   * Update account manager
   */
  static async updateAccountManager(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { accountManagerId } = req.params;
      const body = updateAccountManagerSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if account manager exists
      const existingManager = await tenantDb.user.findFirst({
        where: { 
          userId: accountManagerId,
          role: 'manager'
        }
      });

      if (!existingManager) {
        res.status(404).json({
          success: false,
          error: 'Account manager not found'
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

      // Update preferences with account specialization if provided
      const updateData: any = { ...body };
      if (body.accountSpecialization) {
        updateData.preferences = {
          ...existingManager.preferences,
          accountSpecialization: body.accountSpecialization
        };
        delete updateData.accountSpecialization; // Remove from top level
      }

      // Update account manager
      const updatedManager = await tenantDb.user.update({
        where: { userId: accountManagerId },
        data: updateData,
        include: {
          department: true,
          location: true
        }
      });

      // Remove password hash from response
      const { passwordHash, ...managerWithoutPassword } = updatedManager;
      const responseData = {
        ...managerWithoutPassword,
        accountSpecialization: updatedManager.preferences?.accountSpecialization || 'general'
      };

      const response: ApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        message: 'Account manager updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update account manager error:', error);
      
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
        error: 'Failed to update account manager'
      } as ApiResponse);
    }
  }

  /**
   * Delete account manager
   */
  static async deleteAccountManager(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { accountManagerId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if account manager exists
      const existingManager = await tenantDb.user.findFirst({
        where: { 
          userId: accountManagerId,
          role: 'manager'
        },
        include: {
          managedSalespeople: true,
          headedDepartments: true
        }
      });

      if (!existingManager) {
        res.status(404).json({
          success: false,
          error: 'Account manager not found'
        } as ApiResponse);
        return;
      }

      // Check if manager has dependencies
      if (existingManager.managedSalespeople.length > 0 || existingManager.headedDepartments.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete account manager with managed sales persons or headed departments. Please reassign them first.'
        } as ApiResponse);
        return;
      }

      // Soft delete by setting status to inactive
      await tenantDb.user.update({
        where: { userId: accountManagerId },
        data: { status: 'inactive' }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Account manager deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete account manager error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account manager'
      } as ApiResponse);
    }
  }

  /**
   * Get account team statistics
   */
  static async getAccountStats(req: Request, res: Response): Promise<void> {
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
        totalManagers,
        activeManagers,
        managersBySpecialization,
        managersByDepartment,
        teamOverview
      ] = await Promise.all([
        tenantDb.user.count({ where: { role: 'manager' } }),
        tenantDb.user.count({ where: { role: 'manager', status: 'active' } }),
        // Group by account specialization using JSON path queries
        tenantDb.$queryRaw`
          SELECT 
            preferences->>'accountSpecialization' as specialization,
            COUNT(*) as count
          FROM users 
          WHERE role = 'manager' AND status = 'active'
          GROUP BY preferences->>'accountSpecialization'
          ORDER BY count DESC
        `,
        tenantDb.user.groupBy({
          by: ['departmentId'],
          _count: { departmentId: true },
          where: { 
            role: 'manager',
            departmentId: { not: null },
            status: 'active'
          },
          orderBy: { _count: { departmentId: 'desc' } }
        }),
        tenantDb.user.findMany({
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            preferences: true,
            department: {
              select: {
                departmentName: true,
                colorCode: true
              }
            },
            _count: {
              select: {
                managedSalespeople: true,
                headedDepartments: true
              }
            }
          },
          where: { role: 'manager', status: 'active' },
          orderBy: {
            managedSalespeople: {
              _count: 'desc'
            }
          },
          take: 10
        })
      ]);

      const stats = {
        overview: {
          total: totalManagers,
          active: activeManagers,
          inactive: totalManagers - activeManagers
        },
        distribution: {
          bySpecialization: managersBySpecialization,
          byDepartment: managersByDepartment
        },
        teamLeaders: teamOverview.map(manager => ({
          ...manager,
          accountSpecialization: manager.preferences?.accountSpecialization || 'general'
        }))
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get account stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get account team statistics'
      } as ApiResponse);
    }
  }
}