import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse,
  PaginationParams
} from '@omsms/shared';

// Validation schemas
const createSalesPersonSchema = z.object({
  userId: z.string().uuid(),
  employeeCode: z.string().min(1).max(50).optional(),
  territory: z.string().min(1).max(255).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  targetAmount: z.number().min(0).optional(),
  managerId: z.string().uuid().optional()
});

const updateSalesPersonSchema = z.object({
  employeeCode: z.string().min(1).max(50).optional(),
  territory: z.string().min(1).max(255).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  targetAmount: z.number().min(0).optional(),
  managerId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  performanceMetrics: z.record(z.any()).optional()
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  territory: z.string().optional(),
  managerId: z.string().uuid().optional()
});

export class SalesController {
  /**
   * Get all sales persons with pagination and filtering
   */
  static async getSalesPersons(req: Request, res: Response): Promise<void> {
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

      // Build where clause for SalesPerson table
      const where: any = {};
      if (query.status) where.status = query.status;
      if (query.territory) where.territory = { contains: query.territory, mode: 'insensitive' };
      if (query.managerId) where.managerId = query.managerId;

      // Build user search filter
      const userWhere: any = {};
      if (query.search) {
        userWhere.OR = [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } }
        ];
      }

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Sorting
      const orderBy: any = {};
      if (query.sortBy) {
        // Handle sorting by user fields
        if (['firstName', 'lastName', 'email'].includes(query.sortBy)) {
          orderBy.user = { [query.sortBy]: query.sortOrder || 'asc' };
        } else {
          orderBy[query.sortBy] = query.sortOrder || 'asc';
        }
      } else {
        orderBy.user = { firstName: 'asc' };
      }

      // Get sales persons with user details
      const [salesPersons, total] = await Promise.all([
        tenantDb.salesPerson.findMany({
          where: {
            ...where,
            user: userWhere
          },
          include: {
            user: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,
                email: true,
                mobileNumber: true,
                address: true,
                status: true,
                department: {
                  select: {
                    departmentId: true,
                    departmentName: true
                  }
                },
                location: {
                  select: {
                    locationId: true,
                    locationName: true
                  }
                }
              }
            },
            manager: {
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
        tenantDb.salesPerson.count({ 
          where: {
            ...where,
            user: userWhere
          }
        })
      ]);

      const response: ApiResponse<typeof salesPersons> = {
        success: true,
        data: salesPersons,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get sales persons error:', error);
      
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
        error: 'Failed to get sales persons'
      } as ApiResponse);
    }
  }

  /**
   * Get sales person by ID
   */
  static async getSalesPersonById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { salespersonId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const salesPerson = await tenantDb.salesPerson.findUnique({
        where: { salespersonId },
        include: {
          user: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
              address: true,
              status: true,
              department: true,
              location: true
            }
          },
          manager: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!salesPerson) {
        res.status(404).json({
          success: false,
          error: 'Sales person not found'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<typeof salesPerson> = {
        success: true,
        data: salesPerson
      };

      res.json(response);
    } catch (error) {
      console.error('Get sales person error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sales person'
      } as ApiResponse);
    }
  }

  /**
   * Create new sales person
   */
  static async createSalesPerson(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = createSalesPersonSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if user exists and is active
      const user = await tenantDb.user.findUnique({
        where: { userId: body.userId },
        select: {
          userId: true,
          status: true,
          email: true
        }
      });

      if (!user) {
        res.status(400).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
        return;
      }

      if (user.status !== 'active') {
        res.status(400).json({
          success: false,
          error: 'User must be active to create sales person record'
        } as ApiResponse);
        return;
      }

      // Check if sales person already exists for this user
      const existingSalesPerson = await tenantDb.salesPerson.findUnique({
        where: { userId: body.userId }
      });

      if (existingSalesPerson) {
        res.status(409).json({
          success: false,
          error: 'Sales person record already exists for this user'
        } as ApiResponse);
        return;
      }

      // Validate manager exists if provided
      if (body.managerId) {
        const manager = await tenantDb.user.findUnique({
          where: { userId: body.managerId }
        });

        if (!manager) {
          res.status(400).json({
            success: false,
            error: 'Manager not found'
          } as ApiResponse);
          return;
        }
      }

      // Create sales person
      const newSalesPerson = await tenantDb.salesPerson.create({
        data: {
          userId: body.userId,
          employeeCode: body.employeeCode,
          territory: body.territory,
          commissionRate: body.commissionRate,
          targetAmount: body.targetAmount,
          managerId: body.managerId,
          status: 'active',
          performanceMetrics: {}
        },
        include: {
          user: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
              department: true,
              location: true
            }
          },
          manager: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      const response: ApiResponse<typeof newSalesPerson> = {
        success: true,
        data: newSalesPerson,
        message: 'Sales person created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create sales person error:', error);
      
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
        error: 'Failed to create sales person'
      } as ApiResponse);
    }
  }

  /**
   * Update sales person
   */
  static async updateSalesPerson(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { salespersonId } = req.params;
      const body = updateSalesPersonSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if sales person exists
      const existingSalesPerson = await tenantDb.salesPerson.findUnique({
        where: { salespersonId }
      });

      if (!existingSalesPerson) {
        res.status(404).json({
          success: false,
          error: 'Sales person not found'
        } as ApiResponse);
        return;
      }

      // Validate manager exists if provided
      if (body.managerId) {
        const manager = await tenantDb.user.findUnique({
          where: { userId: body.managerId }
        });

        if (!manager) {
          res.status(400).json({
            success: false,
            error: 'Manager not found'
          } as ApiResponse);
          return;
        }
      }

      // Update sales person
      const updatedSalesPerson = await tenantDb.salesPerson.update({
        where: { salespersonId },
        data: body,
        include: {
          user: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
              department: true,
              location: true
            }
          },
          manager: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      const response: ApiResponse<typeof updatedSalesPerson> = {
        success: true,
        data: updatedSalesPerson,
        message: 'Sales person updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update sales person error:', error);
      
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
        error: 'Failed to update sales person'
      } as ApiResponse);
    }
  }

  /**
   * Delete sales person
   */
  static async deleteSalesPerson(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { salespersonId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if sales person exists
      const existingSalesPerson = await tenantDb.salesPerson.findUnique({
        where: { salespersonId }
      });

      if (!existingSalesPerson) {
        res.status(404).json({
          success: false,
          error: 'Sales person not found'
        } as ApiResponse);
        return;
      }

      // Soft delete by setting status to inactive
      await tenantDb.salesPerson.update({
        where: { salespersonId },
        data: { status: 'inactive' }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Sales person deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete sales person error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete sales person'
      } as ApiResponse);
    }
  }

  /**
   * Get sales person statistics
   */
  static async getSalesStats(req: Request, res: Response): Promise<void> {
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
        totalSalesPersons,
        activeSalesPersons,
        salesPersonsByTerritory,
        topPerformers
      ] = await Promise.all([
        tenantDb.salesPerson.count(),
        tenantDb.salesPerson.count({ where: { status: 'active' } }),
        tenantDb.salesPerson.groupBy({
          by: ['territory'],
          _count: { territory: true },
          where: { 
            territory: { not: null },
            status: 'active'
          },
          orderBy: { _count: { territory: 'desc' } }
        }),
        tenantDb.salesPerson.findMany({
          select: {
            salespersonId: true,
            territory: true,
            targetAmount: true,
            commissionRate: true,
            performanceMetrics: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          where: { status: 'active' },
          orderBy: { targetAmount: 'desc' },
          take: 10
        })
      ]);

      const stats = {
        overview: {
          total: totalSalesPersons,
          active: activeSalesPersons,
          inactive: totalSalesPersons - activeSalesPersons
        },
        distribution: {
          byTerritory: salesPersonsByTerritory
        },
        topPerformers
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get sales stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sales statistics'
      } as ApiResponse);
    }
  }
}