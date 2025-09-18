import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../lib/auth';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse,
  UserRole,
  User,
  PaginationParams
} from '@omsms/shared';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  roleId: z.string().uuid(), // Changed from role enum to roleId
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  permissions: z.record(z.string(), z.boolean()).optional()
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  roleId: z.string().uuid().optional(), // Changed from role enum to roleId
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8)
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  roleId: z.string().uuid().optional(), // Changed from role enum to roleId
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional()
});

export class UserController {
  /**
   * Get all users with pagination and filtering
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
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
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      if (query.roleId) where.roleId = query.roleId;
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

      // Get users
      const [users, total] = await Promise.all([
        tenantDb.user.findMany({
          where,
          include: {
            role: true,
            department: true,
            location: true
          },
          skip,
          take: limit,
          orderBy
        }),
        tenantDb.user.count({ where })
      ]);

      // Remove password hashes from response
      const usersWithoutPasswords = users.map(({ passwordHash, ...user }) => user);

      const response: ApiResponse<typeof usersWithoutPasswords> = {
        success: true,
        data: usersWithoutPasswords,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get users error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.issues
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get users'
      } as ApiResponse);
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { userId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const user = await tenantDb.user.findUnique({
        where: { userId },
        include: {
          department: true,
          location: true,
          salesPerson: true
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
        return;
      }

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      const response: ApiResponse<typeof userWithoutPassword> = {
        success: true,
        data: userWithoutPassword
      };

      res.json(response);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user'
      } as ApiResponse);
    }
  }

  /**
   * Create new user
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = createUserSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

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

      // Hash password
      const passwordHash = await AuthService.hashPassword(body.password);

      // Verify role exists
      if (!body.roleId) {
        res.status(400).json({
          success: false,
          error: 'Role is required'
        } as ApiResponse);
        return;
      }

      const role = await tenantDb.role.findUnique({
        where: { roleId: body.roleId }
      });

      if (!role) {
        res.status(400).json({
          success: false,
          error: 'Invalid role specified'
        } as ApiResponse);
        return;
      }

      // Get default permissions for role (use role name for now)
      const permissions = body.permissions || AuthService.getDefaultPermissions(role.roleName as UserRole);

      // Create user
      const newUser = await tenantDb.user.create({
        data: {
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          mobileNumber: body.mobileNumber,
          address: body.address,
          roleId: body.roleId,
          departmentId: body.departmentId,
          locationId: body.locationId,
          permissions: permissions as any,
          preferences: {},
          status: 'active'
        },
        include: {
          role: true,
          department: true,
          location: true
        }
      });

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = newUser;

      const response: ApiResponse<typeof userWithoutPassword> = {
        success: true,
        data: userWithoutPassword,
        message: 'User created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create user error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.issues
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create user'
      } as ApiResponse);
    }
  }

  /**
   * Update user
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { userId } = req.params;
      const body = updateUserSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if user exists
      const existingUser = await tenantDb.user.findUnique({
        where: { userId },
        include: {
          role: {
            select: {
              roleName: true
            }
          }
        }
      });

      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
        return;
      }

      // Verify role exists if roleId is being updated
      if (body.roleId) {
        const role = await tenantDb.role.findUnique({
          where: { roleId: body.roleId }
        });

        if (!role) {
          res.status(400).json({
            success: false,
            error: 'Invalid role specified'
          } as ApiResponse);
          return;
        }
      }

      // Update permissions if role changed
      let permissions = body.permissions;
      if (body.roleId && body.roleId !== existingUser.roleId && !body.permissions) {
        const newRole = await tenantDb.role.findUnique({
          where: { roleId: body.roleId }
        });
        if (newRole) {
          permissions = AuthService.getDefaultPermissions(newRole.roleName as UserRole);
        }
      }

      // Update user
      const updatedUser = await tenantDb.user.update({
        where: { userId },
        data: {
          ...body,
          ...(permissions && { permissions: permissions as any })
        },
        include: {
          role: true,
          department: true,
          location: true
        }
      });

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = updatedUser;

      const response: ApiResponse<typeof userWithoutPassword> = {
        success: true,
        data: userWithoutPassword,
        message: 'User updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update user error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.issues
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      } as ApiResponse);
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { userId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if user exists
      const existingUser = await tenantDb.user.findUnique({
        where: { userId },
        include: {
          role: {
            select: {
              roleName: true
            }
          }
        }
      });

      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
        return;
      }

      // Prevent deleting the last admin user
      if (existingUser.role?.roleName === 'admin') {
        const adminCount = await tenantDb.user.count({
          where: { 
            role: {
              roleName: 'admin'
            },
            status: 'active' 
          }
        });

        if (adminCount <= 1) {
          res.status(400).json({
            success: false,
            error: 'Cannot delete the last admin user'
          } as ApiResponse);
          return;
        }
      }

      // Soft delete by setting status to inactive
      await tenantDb.user.update({
        where: { userId },
        data: { status: 'inactive' }
      });

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      } as ApiResponse);
    }
  }

  /**
   * Change user password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as ApiResponse);
        return;
      }

      const { userId } = req.params;
      const body = changePasswordSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if user can change this password (only their own, unless admin)
      const userRoleName = typeof req.user.role === 'string' ? req.user.role : (req.user.role as any)?.roleName;
      if (userId !== req.user.userId && userRoleName !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'You can only change your own password'
        } as ApiResponse);
        return;
      }

      // Get user
      const user = await tenantDb.user.findUnique({
        where: { userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
        return;
      }

      // Verify current password (only if changing own password)
      if (userId === req.user.userId) {
        const isCurrentPasswordValid = await AuthService.verifyPassword(
          body.currentPassword,
          user.passwordHash
        );

        if (!isCurrentPasswordValid) {
          res.status(400).json({
            success: false,
            error: 'Current password is incorrect'
          } as ApiResponse);
          return;
        }
      }

      // Hash new password
      const newPasswordHash = await AuthService.hashPassword(body.newPassword);

      // Update password
      await tenantDb.user.update({
        where: { userId },
        data: { passwordHash: newPasswordHash }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.issues
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      } as ApiResponse);
    }
  }

  /**
   * Update user permissions
   */
  static async updatePermissions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { userId } = req.params;
      const { permissions } = req.body;
      const tenantDb = await getTenantDb(req.tenantId);

      // Update user permissions
      const updatedUser = await tenantDb.user.update({
        where: { userId },
        data: { permissions },
        select: { userId: true, email: true, role: true, permissions: true }
      });

      const response: ApiResponse<typeof updatedUser> = {
        success: true,
        data: updatedUser,
        message: 'Permissions updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update permissions'
      } as ApiResponse);
    }
  }
}