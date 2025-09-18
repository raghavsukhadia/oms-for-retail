import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse,
  Location,
  PaginationParams
} from '@omsms/shared';

// Validation schemas
const createLocationSchema = z.object({
  locationName: z.string().min(1).max(255),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  contactPerson: z.string().optional(),
  contactMobile: z.string().optional(),
  contactEmail: z.string().email().optional(),
  settings: z.record(z.any()).optional()
});

const updateLocationSchema = z.object({
  locationName: z.string().min(1).max(255).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  contactPerson: z.string().optional(),
  contactMobile: z.string().optional(),
  contactEmail: z.string().email().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  settings: z.record(z.any()).optional()
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional()
});

export class LocationController {
  /**
   * Get all locations with pagination and filtering
   */
  static async getLocations(req: Request, res: Response): Promise<void> {
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
          { locationName: { contains: query.search, mode: 'insensitive' } },
          { address: { contains: query.search, mode: 'insensitive' } },
          { city: { contains: query.search, mode: 'insensitive' } },
          { contactPerson: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      if (query.status) where.status = query.status;
      if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
      if (query.state) where.state = { contains: query.state, mode: 'insensitive' };
      if (query.country) where.country = { contains: query.country, mode: 'insensitive' };

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Sorting
      const orderBy: any = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'asc';
      } else {
        orderBy.locationName = 'asc';
      }

      // Get locations with vehicle count
      const [locations, total] = await Promise.all([
        tenantDb.location.findMany({
          where,
          include: {
            _count: {
              select: {
                vehicles: true,
                users: true
              }
            }
          },
          skip,
          take: limit,
          orderBy
        }),
        tenantDb.location.count({ where })
      ]);

      const response: ApiResponse<typeof locations> = {
        success: true,
        data: locations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get locations error:', error);
      
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
        error: 'Failed to get locations'
      } as ApiResponse);
    }
  }

  /**
   * Get location by ID
   */
  static async getLocationById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { locationId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const location = await tenantDb.location.findUnique({
        where: { locationId },
        include: {
          _count: {
            select: {
              vehicles: true,
              users: true
            }
          },
          vehicles: {
            select: {
              vehicleId: true,
              carNumber: true,
              status: true,
              ownerName: true
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          users: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!location) {
        res.status(404).json({
          success: false,
          error: 'Location not found'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<typeof location> = {
        success: true,
        data: location
      };

      res.json(response);
    } catch (error) {
      console.error('Get location error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get location'
      } as ApiResponse);
    }
  }

  /**
   * Create new location
   */
  static async createLocation(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = createLocationSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if location name already exists
      const existingLocation = await tenantDb.location.findFirst({
        where: { 
          locationName: body.locationName,
          status: 'active'
        }
      });

      if (existingLocation) {
        res.status(409).json({
          success: false,
          error: 'Location with this name already exists'
        } as ApiResponse);
        return;
      }

      // Create location
      const newLocation = await tenantDb.location.create({
        data: {
          locationName: body.locationName,
          address: body.address,
          city: body.city,
          state: body.state,
          country: body.country,
          postalCode: body.postalCode,
          contactPerson: body.contactPerson,
          contactMobile: body.contactMobile,
          contactEmail: body.contactEmail,
          settings: body.settings || {},
          status: 'active'
        },
        include: {
          _count: {
            select: {
              vehicles: true,
              users: true
            }
          }
        }
      });

      const response: ApiResponse<typeof newLocation> = {
        success: true,
        data: newLocation,
        message: 'Location created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create location error:', error);
      
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
        error: 'Failed to create location'
      } as ApiResponse);
    }
  }

  /**
   * Update location
   */
  static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { locationId } = req.params;
      const body = updateLocationSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if location exists
      const existingLocation = await tenantDb.location.findUnique({
        where: { locationId }
      });

      if (!existingLocation) {
        res.status(404).json({
          success: false,
          error: 'Location not found'
        } as ApiResponse);
        return;
      }

      // Check if location name is being changed and already exists
      if (body.locationName && body.locationName !== existingLocation.locationName) {
        const duplicateLocation = await tenantDb.location.findFirst({
          where: { 
            locationName: body.locationName,
            locationId: { not: locationId },
            status: 'active'
          }
        });

        if (duplicateLocation) {
          res.status(409).json({
            success: false,
            error: 'Location with this name already exists'
          } as ApiResponse);
          return;
        }
      }

      // Update location
      const updatedLocation = await tenantDb.location.update({
        where: { locationId },
        data: body,
        include: {
          _count: {
            select: {
              vehicles: true,
              users: true
            }
          }
        }
      });

      const response: ApiResponse<typeof updatedLocation> = {
        success: true,
        data: updatedLocation,
        message: 'Location updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update location error:', error);
      
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
        error: 'Failed to update location'
      } as ApiResponse);
    }
  }

  /**
   * Delete location
   */
  static async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { locationId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if location exists
      const existingLocation = await tenantDb.location.findUnique({
        where: { locationId },
        include: {
          _count: {
            select: {
              vehicles: true,
              users: true
            }
          }
        }
      });

      if (!existingLocation) {
        res.status(404).json({
          success: false,
          error: 'Location not found'
        } as ApiResponse);
        return;
      }

      // Check if location has associated vehicles or users
      if (existingLocation._count.vehicles > 0 || existingLocation._count.users > 0) {
        // Soft delete by setting status to inactive
        await tenantDb.location.update({
          where: { locationId },
          data: { status: 'inactive' }
        });

        const response: ApiResponse = {
          success: true,
          message: 'Location deactivated successfully (has associated vehicles or users)'
        };

        res.json(response);
        return;
      }

      // Hard delete if no associations
      await tenantDb.location.delete({
        where: { locationId }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Location deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete location error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete location'
      } as ApiResponse);
    }
  }

  /**
   * Get location statistics
   */
  static async getLocationStats(req: Request, res: Response): Promise<void> {
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
        totalLocations,
        activeLocations,
        locationsByCountry,
        locationsByState,
        topLocationsByVehicles
      ] = await Promise.all([
        tenantDb.location.count(),
        tenantDb.location.count({ where: { status: 'active' } }),
        tenantDb.location.groupBy({
          by: ['country'],
          _count: { country: true },
          where: { 
            country: { not: null },
            status: 'active'
          },
          orderBy: { _count: { country: 'desc' } }
        }),
        tenantDb.location.groupBy({
          by: ['state'],
          _count: { state: true },
          where: { 
            state: { not: null },
            status: 'active'
          },
          orderBy: { _count: { state: 'desc' } }
        }),
        tenantDb.location.findMany({
          select: {
            locationId: true,
            locationName: true,
            city: true,
            state: true,
            _count: {
              select: {
                vehicles: true,
                users: true
              }
            }
          },
          where: { status: 'active' },
          orderBy: {
            vehicles: {
              _count: 'desc'
            }
          },
          take: 10
        })
      ]);

      const stats = {
        overview: {
          total: totalLocations,
          active: activeLocations,
          inactive: totalLocations - activeLocations
        },
        distribution: {
          byCountry: locationsByCountry,
          byState: locationsByState
        },
        topLocations: topLocationsByVehicles
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get location stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get location statistics'
      } as ApiResponse);
    }
  }
}