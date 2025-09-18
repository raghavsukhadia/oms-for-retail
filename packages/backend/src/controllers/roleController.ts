import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import { ApiResponse } from '@omsms/shared';

// Validation schemas
const createRoleSchema = z.object({
  roleName: z.string().min(1).max(50),
  roleDescription: z.string().optional(),
  roleColor: z.string().optional(),
  roleLevel: z.number().int().min(0).max(100).optional(),
  permissions: z.array(z.object({
    resource: z.string(),
    action: z.string(),
    conditions: z.record(z.any()).optional()
  })).optional()
});

const updateRoleSchema = z.object({
  roleName: z.string().min(1).max(50).optional(),
  roleDescription: z.string().optional(),
  roleColor: z.string().optional(),
  roleLevel: z.number().int().min(0).max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  permissions: z.array(z.object({
    resource: z.string(),
    action: z.string(),
    conditions: z.record(z.any()).optional()
  })).optional()
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  includeSystemRoles: z.string().transform((val) => val === 'true').optional()
});

export class RoleController {
  /**
   * Get all roles with pagination and filtering
   */
  static async getRoles(req: Request, res: Response): Promise<void> {
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
          { roleName: { contains: query.search, mode: 'insensitive' } },
          { roleDescription: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      if (query.status) where.status = query.status;
      if (query.includeSystemRoles === false) where.isSystemRole = false;

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Get roles with permissions and user counts
      const [roles, total] = await Promise.all([
        tenantDb.role.findMany({
          where,
          include: {
            rolePermissions: {
              select: {
                resource: true,
                action: true,
                conditions: true
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
          orderBy: [
            { roleLevel: 'asc' },
            { roleName: 'asc' }
          ]
        }),
        tenantDb.role.count({ where })
      ]);

      const response: ApiResponse<typeof roles> = {
        success: true,
        data: roles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get roles error:', error);
      
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
        error: 'Failed to get roles'
      } as ApiResponse);
    }
  }

  /**
   * Get role by ID
   */
  static async getRoleById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { roleId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const role = await tenantDb.role.findUnique({
        where: { roleId },
        include: {
          rolePermissions: {
            select: {
              rolePermissionId: true,
              resource: true,
              action: true,
              conditions: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        }
      });

      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<typeof role> = {
        success: true,
        data: role
      };

      res.json(response);
    } catch (error) {
      console.error('Get role by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get role'
      } as ApiResponse);
    }
  }

  /**
   * Create new role
   */
  static async createRole(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = createRoleSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if role name already exists
      const existingRole = await tenantDb.role.findFirst({
        where: { 
          roleName: body.roleName,
          status: 'active'
        }
      });

      if (existingRole) {
        res.status(409).json({
          success: false,
          error: 'Role with this name already exists'
        } as ApiResponse);
        return;
      }

      // Create role in transaction
      const newRole = await tenantDb.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: {
            roleName: body.roleName,
            roleDescription: body.roleDescription,
            roleColor: body.roleColor,
            roleLevel: body.roleLevel || 10, // Default level for custom roles
            isSystemRole: false, // Custom roles are never system roles
            status: 'active'
          }
        });

        // Create permissions if provided
        if (body.permissions && body.permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: body.permissions.map(permission => ({
              roleId: role.roleId,
              resource: permission.resource,
              action: permission.action,
              conditions: permission.conditions || {}
            }))
          });
        }

        return role;
      });

      // Fetch the created role with permissions
      const roleWithPermissions = await tenantDb.role.findUnique({
        where: { roleId: newRole.roleId },
        include: {
          rolePermissions: {
            select: {
              rolePermissionId: true,
              resource: true,
              action: true,
              conditions: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        }
      });

      const response: ApiResponse<typeof roleWithPermissions> = {
        success: true,
        data: roleWithPermissions,
        message: 'Role created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create role error:', error);
      
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
        error: 'Failed to create role'
      } as ApiResponse);
    }
  }

  /**
   * Update role
   */
  static async updateRole(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { roleId } = req.params;
      const body = updateRoleSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if role exists
      const existingRole = await tenantDb.role.findUnique({
        where: { roleId }
      });

      if (!existingRole) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        } as ApiResponse);
        return;
      }

      // Prevent modification of system roles' core properties
      if (existingRole.isSystemRole && (body.roleName || body.roleLevel !== undefined)) {
        res.status(403).json({
          success: false,
          error: 'Cannot modify system role name or level'
        } as ApiResponse);
        return;
      }

      // Check if new role name already exists (if changing name)
      if (body.roleName && body.roleName !== existingRole.roleName) {
        const duplicateRole = await tenantDb.role.findFirst({
          where: { 
            roleName: body.roleName,
            roleId: { not: roleId },
            status: 'active'
          }
        });

        if (duplicateRole) {
          res.status(409).json({
            success: false,
            error: 'Role with this name already exists'
          } as ApiResponse);
          return;
        }
      }

      // Update role in transaction
      const updatedRole = await tenantDb.$transaction(async (tx) => {
        const role = await tx.role.update({
          where: { roleId },
          data: {
            roleName: body.roleName,
            roleDescription: body.roleDescription,
            roleColor: body.roleColor,
            roleLevel: body.roleLevel,
            status: body.status,
            updatedAt: new Date()
          }
        });

        // Update permissions if provided
        if (body.permissions !== undefined) {
          // Delete existing permissions
          await tx.rolePermission.deleteMany({
            where: { roleId }
          });

          // Create new permissions
          if (body.permissions.length > 0) {
            await tx.rolePermission.createMany({
              data: body.permissions.map(permission => ({
                roleId: role.roleId,
                resource: permission.resource,
                action: permission.action,
                conditions: permission.conditions || {}
              }))
            });
          }
        }

        return role;
      });

      // Fetch the updated role with permissions
      const roleWithPermissions = await tenantDb.role.findUnique({
        where: { roleId: updatedRole.roleId },
        include: {
          rolePermissions: {
            select: {
              rolePermissionId: true,
              resource: true,
              action: true,
              conditions: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        }
      });

      const response: ApiResponse<typeof roleWithPermissions> = {
        success: true,
        data: roleWithPermissions,
        message: 'Role updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update role error:', error);
      
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
        error: 'Failed to update role'
      } as ApiResponse);
    }
  }

  /**
   * Delete role
   */
  static async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { roleId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if role exists
      const role = await tenantDb.role.findUnique({
        where: { roleId },
        include: {
          _count: {
            select: {
              users: true
            }
          }
        }
      });

      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        } as ApiResponse);
        return;
      }

      // Prevent deletion of system roles
      if (role.isSystemRole) {
        res.status(403).json({
          success: false,
          error: 'Cannot delete system roles'
        } as ApiResponse);
        return;
      }

      // Prevent deletion if users are assigned to this role
      if (role._count.users > 0) {
        res.status(409).json({
          success: false,
          error: `Cannot delete role: ${role._count.users} users are assigned to this role`
        } as ApiResponse);
        return;
      }

      // Delete role and its permissions (cascade)
      await tenantDb.role.delete({
        where: { roleId }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Role deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete role'
      } as ApiResponse);
    }
  }

  /**
   * Get available resources and actions for permission configuration
   */
  static async getPermissionOptions(req: Request, res: Response): Promise<void> {
    try {
      // Define available resources and their possible actions
      const permissionOptions = {
        vehicles: ['create', 'read', 'update', 'delete'],
        users: ['create', 'read', 'update', 'delete'],
        locations: ['create', 'read', 'update', 'delete'],
        departments: ['create', 'read', 'update', 'delete'],
        roles: ['create', 'read', 'update', 'delete'],
        workflows: ['create', 'read', 'update', 'delete'],
        media: ['create', 'read', 'update', 'delete'],
        reports: ['read', 'export'],
        settings: ['read', 'update'],
        // Financial permissions
        payments: ['view', 'create', 'update', 'approve', 'export'],
        invoices: ['view', 'create', 'update', 'send', 'export'],
        pricing: ['view', 'update', 'manage_discounts'],
        financial_reports: ['view', 'export', 'view_detailed'],
        cost_analysis: ['view', 'export'],
        account_statements: ['view', 'export'],
        revenue_data: ['view', 'export', 'view_profit_margins']
      };

      const response: ApiResponse<typeof permissionOptions> = {
        success: true,
        data: permissionOptions
      };

      res.json(response);
    } catch (error) {
      console.error('Get permission options error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get permission options'
      } as ApiResponse);
    }
  }
}