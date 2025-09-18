import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import { emitVehicleUpdate, emitDataSync } from '../lib/realTimeEvents';
import {
  ApiResponse,
  VehicleStatus,
  UserRole
} from '@omsms/shared';

// Vehicle status enum for validation
const vehicleStatusEnum = z.enum(['pending', 'in_progress', 'quality_check', 'delivered', 'cancelled']);

// Validation schemas
const createVehicleSchema = z.object({
  carNumber: z.string().min(1).max(50),
  ownerName: z.string().min(1).max(255),
  ownerMobile: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  ownerAddress: z.string().optional(),
  modelName: z.string().optional(),
  brandName: z.string().optional(),
  vehicleType: z.string().optional(),
  locationId: z.string().uuid().optional(),
  salespersonId: z.string().uuid().optional(),
  coordinatorId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional(),
  inwardDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  vehicleDetails: z.record(z.string(), z.any()).optional(),
  customFields: z.record(z.string(), z.any()).optional()
});

// Helper function to clean request data
const cleanRequestData = (data: any) => {
  const cleaned = { ...data };
  
  // Convert empty strings to undefined for optional fields
  const fieldsToClean = [
    'ownerMobile', 'ownerEmail', 'ownerAddress', 'modelName', 
    'brandName', 'vehicleType', 'locationId', 'salespersonId', 
    'coordinatorId', 'supervisorId', 'inwardDate', 'expectedDeliveryDate'
  ];
  
  fieldsToClean.forEach(field => {
    if (cleaned[field] === '' || cleaned[field] === null) {
      cleaned[field] = undefined;
    }
  });
  
  // Remove undefined fields completely to avoid validation issues
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  
  return cleaned;
};

const updateVehicleSchema = z.any();

const statusUpdateSchema = z.object({
  status: vehicleStatusEnum,
  notes: z.string().optional(),
  actualDeliveryDate: z.string().pipe(z.coerce.date()).optional()
});

const assignmentSchema = z.object({
  salespersonId: z.string().uuid().optional(),
  coordinatorId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional()
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: vehicleStatusEnum.optional(),
  locationId: z.string().uuid().optional(),
  salespersonId: z.string().uuid().optional(),
  coordinatorId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional(),
  brandName: z.string().optional(),
  vehicleType: z.string().optional(),
  dateFrom: z.string().pipe(z.coerce.date()).optional(),
  dateTo: z.string().pipe(z.coerce.date()).optional(),
  include: z.string().optional()
});

export class VehicleController {
  /**
   * Get all vehicles with advanced filtering and pagination
   */
  static async getVehicles(req: Request, res: Response): Promise<void> {
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
      
      // Search across multiple fields
      if (query.search) {
        where.OR = [
          { carNumber: { contains: query.search, mode: 'insensitive' } },
          { ownerName: { contains: query.search, mode: 'insensitive' } },
          { ownerMobile: { contains: query.search, mode: 'insensitive' } },
          { ownerEmail: { contains: query.search, mode: 'insensitive' } },
          { modelName: { contains: query.search, mode: 'insensitive' } },
          { brandName: { contains: query.search, mode: 'insensitive' } }
        ];
      }

      // Apply filters
      if (query.status) where.status = query.status;
      if (query.locationId) where.locationId = query.locationId;
      if (query.salespersonId) where.salespersonId = query.salespersonId;
      if (query.coordinatorId) where.coordinatorId = query.coordinatorId;
      if (query.supervisorId) where.supervisorId = query.supervisorId;
      if (query.brandName) where.brandName = { contains: query.brandName, mode: 'insensitive' };
      if (query.vehicleType) where.vehicleType = { contains: query.vehicleType, mode: 'insensitive' };

      // Date range filters
      if (query.dateFrom || query.dateTo) {
        where.inwardDate = {};
        if (query.dateFrom) where.inwardDate.gte = query.dateFrom;
        if (query.dateTo) where.inwardDate.lte = query.dateTo;
      }

      // Role-based filtering
      if (req.user?.role === 'salesperson') {
        where.salespersonId = req.user.userId;
      } else if (req.user?.role === 'coordinator') {
        where.coordinatorId = req.user.userId;
      } else if (req.user?.role === 'supervisor') {
        where.supervisorId = req.user.userId;
      }
      // Note: Installers can see all vehicles (no filtering applied)

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

      // Build include object based on query parameter
      const buildInclude = (includeParam?: string) => {
        const includes: any = {};
        
        if (!includeParam) {
          // Default includes for backward compatibility
          includes.location = {
            select: {
              locationId: true,
              locationName: true,
              city: true,
              state: true
            }
          };
          includes._count = {
            select: {
              installations: true,
              mediaFiles: true
            }
          };
          return includes;
        }
        
        const includeList = includeParam.split(',').map(item => item.trim());
        
        if (includeList.includes('location')) {
          includes.location = {
            select: {
              locationId: true,
              locationName: true,
              city: true,
              state: true
            }
          };
        }
        
        if (includeList.includes('salesperson')) {
          includes.salesperson = {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          };
        }
        
        if (includeList.includes('coordinator')) {
          includes.coordinator = {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          };
        }
        
        if (includeList.includes('supervisor')) {
          includes.supervisor = {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          };
        }
        
        if (includeList.includes('workflows')) {
          // NOTE: workflowInstances are fetched separately below since Vehicle model 
          // doesn't have direct relation to WorkflowInstance
        }
        
        includes._count = {
          select: {
            installations: true,
            mediaFiles: true
          }
        };
        
        return includes;
      };

      // Get vehicles with related data
      const [vehicles, total] = await Promise.all([
        tenantDb.vehicle.findMany({
          where,
          include: buildInclude(query.include),
          skip,
          take: limit,
          orderBy
        }),
        tenantDb.vehicle.count({ where })
      ]);

      // Fetch workflow instances separately if requested
      const includeWorkflows = query.include?.includes('workflows');
      if (includeWorkflows && vehicles.length > 0) {
        console.log('🔍 [FETCH WORKFLOWS] Fetching workflow instances for vehicles:', vehicles.map(v => v.vehicleId));
        
        const vehicleIds = vehicles.map(v => v.vehicleId);
        const workflowInstances = await tenantDb.workflowInstance.findMany({
          where: {
            entityType: 'vehicle',
            entityId: { in: vehicleIds }
          },
          include: {
            workflow: {
              select: {
                workflowId: true,
                workflowName: true,
                workflowType: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        console.log('📋 [WORKFLOW INSTANCES FOUND]', {
          totalCount: workflowInstances.length,
          byVehicle: vehicleIds.map(vehicleId => ({
            vehicleId,
            count: workflowInstances.filter(w => w.entityId === vehicleId).length
          }))
        });

        // Group workflow instances by vehicle ID and attach to vehicles
        const workflowsByVehicle = workflowInstances.reduce((acc, instance) => {
          if (!acc[instance.entityId]) {
            acc[instance.entityId] = [];
          }
          // Flatten workflow instances for easier frontend consumption
          acc[instance.entityId].push({
            ...instance,
            workflowType: instance.workflow?.workflowType || null
          });
          return acc;
        }, {} as { [vehicleId: string]: any[] });

        // Attach workflow instances to each vehicle
        vehicles.forEach(vehicle => {
          (vehicle as any).workflowInstances = workflowsByVehicle[vehicle.vehicleId] || [];
        });
      }

      const response: ApiResponse<typeof vehicles> = {
        success: true,
        data: vehicles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
      return;
    } catch (error) {
      console.error('Get vehicles error:', error);
      
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
        error: 'Failed to get vehicles'
      } as ApiResponse);
    }
  }

  /**
   * Get vehicle by ID
   */
  static async getVehicleById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { vehicleId } = req.params;
      const { include } = req.query;
      const tenantDb = await getTenantDb(req.tenantId);

      console.log('🔍 [GET VEHICLE] Request details:', {
        vehicleId,
        includeParam: include,
        includeType: typeof include
      });

      // Build include object for single vehicle
      const buildDetailInclude = (includeParam?: string) => {
        const includes: any = {};
        
        if (!includeParam) {
          // Default includes for backward compatibility
          includes.location = {
            select: {
              locationId: true,
              locationName: true,
              address: true,
              city: true,
              state: true,
              country: true,
              contactPerson: true,
              contactMobile: true
            }
          };
          includes.installations = {
            include: {
              product: {
                select: {
                  productId: true,
                  productName: true,
                  brandName: true,
                  price: true
                }
              },
              installer: {
                select: {
                  userId: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          };
          // workflowInstances relation removed
          return { includes, shouldIncludeWorkflows: false };
        }
        
        const includeList = (includeParam as string).split(',').map(item => item.trim());
        
        console.log('📋 [INCLUDE LIST]', {
          rawParam: includeParam,
          parsedList: includeList,
          includesWorkflows: includeList.includes('workflows')
        });
        
        if (includeList.includes('location')) {
          includes.location = {
            select: {
              locationId: true,
              locationName: true,
              address: true,
              city: true,
              state: true,
              country: true,
              contactPerson: true,
              contactMobile: true
            }
          };
        }
        
        if (includeList.includes('salesperson')) {
          includes.salesperson = {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true
            }
          };
        }
        
        if (includeList.includes('coordinator')) {
          includes.coordinator = {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true
            }
          };
        }
        
        if (includeList.includes('supervisor')) {
          includes.supervisor = {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true
            }
          };
        }
        
        // Note: workflows are fetched separately since WorkflowInstance uses entityType/entityId pattern
        const shouldIncludeWorkflows = includeList.includes('workflows');
        
        // Always include installations and media files for detail view
        includes.installations = {
          include: {
            product: {
              select: {
                productId: true,
                productName: true,
                brandName: true,
                price: true
              }
            },
            installer: {
              select: {
                userId: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        };
        
        includes.mediaFiles = {
          select: {
            fileId: true,
            fileCategory: true,
            fileSubcategory: true,
            originalFilename: true,
            filePath: true,
            fileSize: true,
            mimeType: true,
            isPublic: true,
            workflowStage: true,
            uploadedBy: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        };
        
        return { includes, shouldIncludeWorkflows };
      };

      const { includes: includeOptions, shouldIncludeWorkflows } = buildDetailInclude(include as string);
      
      console.log('🏗️ [INCLUDE OPTIONS]', {
        includeOptions: JSON.stringify(includeOptions, null, 2),
        shouldIncludeWorkflows
      });
      
      const vehicle = await tenantDb.vehicle.findUnique({
        where: { vehicleId },
        include: includeOptions
      });

      // Fetch workflow instances separately if requested
      if (shouldIncludeWorkflows && vehicle) {
        console.log('🔍 [FETCH WORKFLOWS] Fetching workflow instances for vehicle:', vehicle.vehicleId);
        
        const workflowInstances = await tenantDb.workflowInstance.findMany({
          where: {
            entityType: 'vehicle',
            entityId: vehicle.vehicleId
          },
          include: {
            workflow: {
              select: {
                workflowId: true,
                workflowName: true,
                workflowType: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        console.log('📋 [WORKFLOW INSTANCES FOUND]', {
          count: workflowInstances.length,
          instances: workflowInstances.map((w: any) => ({
            id: w.instanceId,
            type: w.workflow?.workflowType || 'unknown',
            stage: w.currentStage,
            status: w.status
          }))
        });

        // Flatten workflow instances for easier frontend consumption
        const flattenedInstances = workflowInstances.map((instance: any) => ({
          ...instance,
          workflowType: instance.workflow?.workflowType || null
        }));

        // Attach workflow instances to vehicle
        (vehicle as any).workflowInstances = flattenedInstances;
      }

      console.log('🚗 [VEHICLE RESULT]', {
        found: !!vehicle,
        shouldIncludeWorkflows,
        workflowInstancesCount: (vehicle as any)?.workflowInstances?.length || 0,
        workflowInstances: (vehicle as any)?.workflowInstances?.map((w: any) => ({
          id: w.instanceId,
          type: w.workflow?.workflowType || 'unknown',
          stage: w.currentStage,
          status: w.status
        })) || 'undefined'
      });

      if (!vehicle) {
        res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        } as ApiResponse);
        return;
      }

      // Check if user has permission to view this vehicle
      if (!VehicleController.canAccessVehicle(req.user!, vehicle)) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this vehicle'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<typeof vehicle> = {
        success: true,
        data: vehicle
      };

      res.json(response);
      return;
    } catch (error) {
      console.error('Get vehicle error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get vehicle'
      } as ApiResponse);
    }
  }

  /**
   * Create new vehicle
   */
  static async createVehicle(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      console.log('Create vehicle - raw request body:', JSON.stringify(req.body, null, 2));
      
      // Clean and transform the data (same as update method)
      const body = { ...req.body };
      
      // Convert empty strings to null for optional fields  
      const optionalFields = [
        'ownerMobile', 'ownerEmail', 'ownerAddress', 'modelName', 
        'brandName', 'locationId', 'salespersonId', 
        'coordinatorId', 'supervisorId'
      ];
      
      optionalFields.forEach(field => {
        if (body[field] === '') {
          body[field] = null;
        }
      });
      
      // Handle vehicleType specifically - keep it if it has a value, otherwise remove it
      if (body.vehicleType === '') {
        delete body.vehicleType;
      }
      
      // Convert date strings to proper Date objects
      if (body.inwardDate && body.inwardDate !== '') {
        body.inwardDate = new Date(body.inwardDate);
      } else if (body.inwardDate === '') {
        body.inwardDate = null;
      }
      
      if (body.expectedDeliveryDate && body.expectedDeliveryDate !== '') {
        body.expectedDeliveryDate = new Date(body.expectedDeliveryDate);
      } else if (body.expectedDeliveryDate === '') {
        body.expectedDeliveryDate = null;
      }
      
      // Remove fields that are null or undefined to avoid sending them to Prisma
      Object.keys(body).forEach(key => {
        if (body[key] === null || body[key] === undefined) {
          delete body[key];
        }
      });
      
      console.log('Create vehicle - cleaned body:', JSON.stringify(body, null, 2));
      
      // Manual validation for safer approach
      if (!body.carNumber || body.carNumber.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Car number is required'
        } as ApiResponse);
        return;
      }
      
      if (!body.ownerName || body.ownerName.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Owner name is required'
        } as ApiResponse);
        return;
      }
      
      const tenantDb = await getTenantDb(req.tenantId);
      
      // Auto-create new products and brands if they don't exist
      if (body.vehicleDetails && body.vehicleDetails.products) {
        await VehicleController.ensureProductsAndBrandsExist(tenantDb, body.vehicleDetails.products);
      }

      // Check if car number already exists
      const existingVehicle = await tenantDb.vehicle.findUnique({
        where: { carNumber: body.carNumber }
      });

      if (existingVehicle) {
        res.status(409).json({
          success: false,
          error: 'Vehicle with this car number already exists'
        } as ApiResponse);
        return;
      }

      // Validate related entities exist
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

      // Validate assigned users exist (no role validation - permissions handle authorization)
      const userValidations = [
        { id: body.salespersonId, field: 'Salesperson' },
        { id: body.coordinatorId, field: 'Coordinator' },
        { id: body.supervisorId, field: 'Supervisor' }
      ];

      for (const validation of userValidations) {
        if (validation.id) {
          const user = await tenantDb.user.findUnique({
            where: { userId: validation.id },
            select: {
              userId: true,
              status: true
            }
          });
          if (!user) {
            res.status(400).json({
              success: false,
              error: `${validation.field} not found`
            } as ApiResponse);
            return;
          }
          if (user.status !== 'active') {
            res.status(400).json({
              success: false,
              error: `${validation.field} is not active`
            } as ApiResponse);
            return;
          }
        }
      }

      // Create vehicle
      const newVehicle = await tenantDb.vehicle.create({
        data: {
          carNumber: body.carNumber,
          ownerName: body.ownerName,
          ownerMobile: body.ownerMobile,
          ownerEmail: body.ownerEmail,
          ownerAddress: body.ownerAddress,
          modelName: body.modelName,
          brandName: body.brandName,
          vehicleType: body.vehicleType,
          locationId: body.locationId,
          salespersonId: body.salespersonId,
          coordinatorId: body.coordinatorId,
          supervisorId: body.supervisorId,
          inwardDate: body.inwardDate,
          expectedDeliveryDate: body.expectedDeliveryDate,
          status: 'pending',
          vehicleDetails: body.vehicleDetails || {},
          customFields: body.customFields || {},
          createdBy: req.user.userId
        },
        include: {
          location: {
            select: {
              locationId: true,
              locationName: true,
              city: true,
              state: true
            }
          },
          salesperson: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          coordinator: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          supervisor: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          creator: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      console.log('🏭 [WORKFLOW INIT] Initializing default workflow instances for new vehicle:', newVehicle.vehicleId);
      
      // Initialize default workflow instances for the vehicle
      await VehicleController.initializeDefaultWorkflows(tenantDb, newVehicle.vehicleId, req.user.userId);

      // Emit real-time events
      emitVehicleUpdate(req.tenantId, {
        vehicleId: newVehicle.vehicleId,
        status: newVehicle.status,
        assignedTo: newVehicle.salespersonId || undefined,
        location: newVehicle.locationId || undefined,
        updatedBy: req.user.userId,
        changes: { action: 'created', vehicle: newVehicle },
        timestamp: new Date()
      });

      emitDataSync(req.tenantId, {
        entityType: 'vehicle',
        action: 'created',
        entityId: newVehicle.vehicleId,
        data: newVehicle,
        timestamp: new Date()
      });

      const response: ApiResponse<typeof newVehicle> = {
        success: true,
        data: newVehicle,
        message: 'Vehicle created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create vehicle error:', error);
      
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
        error: 'Failed to create vehicle'
      } as ApiResponse);
    }
  }

  /**
   * Update vehicle
   */
  static async updateVehicle(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const { vehicleId } = req.params;
      console.log('Update vehicle - raw request body:', JSON.stringify(req.body, null, 2));
      
      // Clean and transform the data
      const body = { ...req.body };
      
      // Convert empty strings to null for optional fields  
      const optionalFields = [
        'ownerMobile', 'ownerEmail', 'ownerAddress', 'modelName', 
        'brandName', 'locationId', 'salespersonId', 
        'coordinatorId', 'supervisorId'
      ];
      
      optionalFields.forEach(field => {
        if (body[field] === '') {
          body[field] = null;
        }
      });
      
      // Handle vehicleType specifically - keep it if it has a value, otherwise remove it
      if (body.vehicleType === '') {
        delete body.vehicleType;
      }
      
      // Convert date strings to proper Date objects
      if (body.inwardDate && body.inwardDate !== '') {
        body.inwardDate = new Date(body.inwardDate);
      } else if (body.inwardDate === '') {
        body.inwardDate = null;
      }
      
      if (body.expectedDeliveryDate && body.expectedDeliveryDate !== '') {
        body.expectedDeliveryDate = new Date(body.expectedDeliveryDate);
      } else if (body.expectedDeliveryDate === '') {
        body.expectedDeliveryDate = null;
      }
      
      // Remove fields that are null or undefined to avoid sending them to Prisma
      Object.keys(body).forEach(key => {
        if (body[key] === null || body[key] === undefined) {
          delete body[key];
        }
      });
      
      console.log('Update vehicle - cleaned body:', JSON.stringify(body, null, 2));
      const tenantDb = await getTenantDb(req.tenantId);
      
      // Auto-create new products and brands if they don't exist
      if (body.vehicleDetails && body.vehicleDetails.products) {
        await VehicleController.ensureProductsAndBrandsExist(tenantDb, body.vehicleDetails.products);
      }

      // Check if vehicle exists
      const existingVehicle = await tenantDb.vehicle.findUnique({
        where: { vehicleId }
      });

      if (!existingVehicle) {
        res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        } as ApiResponse);
        return;
      }

      // Check if user can update this vehicle
      if (!VehicleController.canModifyVehicle(req.user, existingVehicle)) {
        res.status(403).json({
          success: false,
          error: 'Access denied to modify this vehicle'
        } as ApiResponse);
        return;
      }

      // Check if car number is being changed and already exists
      if (body.carNumber && body.carNumber !== existingVehicle.carNumber) {
        const duplicateVehicle = await tenantDb.vehicle.findUnique({
          where: { carNumber: body.carNumber }
        });

        if (duplicateVehicle) {
          res.status(409).json({
            success: false,
            error: 'Vehicle with this car number already exists'
          } as ApiResponse);
          return;
        }
      }

      // Update vehicle
      console.log('Updating vehicle with ID:', vehicleId);
      console.log('Update data:', JSON.stringify(body, null, 2));
      
      const updatedVehicle = await tenantDb.vehicle.update({
        where: { vehicleId },
        data: body,
        include: {
          location: {
            select: {
              locationId: true,
              locationName: true,
              city: true,
              state: true
            }
          },
          salesperson: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          coordinator: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          supervisor: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      
      console.log('Vehicle updated successfully:', updatedVehicle.vehicleId);

      const response: ApiResponse<typeof updatedVehicle> = {
        success: true,
        data: updatedVehicle,
        message: 'Vehicle updated successfully'
      };

      res.json(response);
      return;
    } catch (error: any) {
      console.error('Update vehicle error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      
      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', error.issues);
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.issues
        } as ApiResponse);
        return;
      }

      // Handle Prisma errors
      if (error.code === 'P2002') {
        res.status(409).json({
          success: false,
          error: 'Duplicate entry - this car number already exists'
        } as ApiResponse);
        return;
      }

      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: `Failed to update vehicle: ${error.message}`
      } as ApiResponse);
    }
  }

  /**
   * Update vehicle status
   */
  static async updateVehicleStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const { vehicleId } = req.params;
      const body = statusUpdateSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Get existing vehicle
      const existingVehicle = await tenantDb.vehicle.findUnique({
        where: { vehicleId }
      });

      if (!existingVehicle) {
        res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        } as ApiResponse);
        return;
      }

      // Validate status transition
      if (!VehicleController.isValidStatusTransition(existingVehicle.status as VehicleStatus, body.status)) {
        res.status(400).json({
          success: false,
          error: `Invalid status transition from ${existingVehicle.status} to ${body.status}`
        } as ApiResponse);
        return;
      }

      // Prepare update data
      const updateData: any = {
        status: body.status
      };

      // Set actual delivery date when status becomes 'delivered'
      if (body.status === 'delivered') {
        updateData.actualDeliveryDate = body.actualDeliveryDate || new Date();
      }

      // Update vehicle status
      const updatedVehicle = await tenantDb.vehicle.update({
        where: { vehicleId },
        data: updateData
      });

      // TODO: Create audit log entry for status change
      // TODO: Send notifications for status change

      const response: ApiResponse<typeof updatedVehicle> = {
        success: true,
        data: updatedVehicle,
        message: `Vehicle status updated to ${body.status}`
      };

      res.json(response);
      return;
    } catch (error) {
      console.error('Update vehicle status error:', error);
      
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
        error: 'Failed to update vehicle status'
      } as ApiResponse);
    }
  }

  /**
   * Update vehicle assignments
   */
  static async updateVehicleAssignments(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { vehicleId } = req.params;
      const body = assignmentSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if vehicle exists
      const existingVehicle = await tenantDb.vehicle.findUnique({
        where: { vehicleId }
      });

      if (!existingVehicle) {
        res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        } as ApiResponse);
        return;
      }

      // Update assignments
      const updatedVehicle = await tenantDb.vehicle.update({
        where: { vehicleId },
        data: {
          salespersonId: body.salespersonId,
          coordinatorId: body.coordinatorId,
          supervisorId: body.supervisorId
        },
        include: {
          salesperson: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          coordinator: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          supervisor: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      const response: ApiResponse<typeof updatedVehicle> = {
        success: true,
        data: updatedVehicle,
        message: 'Vehicle assignments updated successfully'
      };

      res.json(response);
      return;
    } catch (error) {
      console.error('Update vehicle assignments error:', error);
      
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
        error: 'Failed to update vehicle assignments'
      } as ApiResponse);
    }
  }

  /**
   * Delete vehicle
   */
  static async deleteVehicle(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { vehicleId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if vehicle exists and get counts
      const existingVehicle = await tenantDb.vehicle.findUnique({
        where: { vehicleId },
        include: {
          _count: {
            select: {
              installations: true,
              mediaFiles: true
            }
          }
        }
      });

      if (!existingVehicle) {
        res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        } as ApiResponse);
        return;
      }

      // Check if vehicle has associated data
      const hasAssociations = 
        existingVehicle._count.installations > 0 ||
        existingVehicle._count.mediaFiles > 0;

      if (hasAssociations) {
        // Soft delete by setting status to cancelled
        await tenantDb.vehicle.update({
          where: { vehicleId },
          data: { status: 'cancelled' }
        });

        const response: ApiResponse = {
          success: true,
          message: 'Vehicle cancelled (has associated data)'
        };

        res.json(response);
        return;
      }

      // Hard delete if no associations
      await tenantDb.vehicle.delete({
        where: { vehicleId }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Vehicle deleted successfully'
      };

      res.json(response);
      return;
    } catch (error) {
      console.error('Delete vehicle error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete vehicle'
      } as ApiResponse);
    }
  }

  /**
   * Get vehicle statistics
   */
  static async getVehicleStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);

      // Get comprehensive vehicle statistics
      const [
        totalVehicles,
        vehiclesByStatus,
        vehiclesByLocation,
        vehiclesByBrand,
        recentVehicles,
        overdueVehicles
      ] = await Promise.all([
        tenantDb.vehicle.count(),
        tenantDb.vehicle.groupBy({
          by: ['status'],
          _count: { status: true },
          orderBy: { _count: { status: 'desc' } }
        }),
        tenantDb.vehicle.groupBy({
          by: ['locationId'],
          _count: { locationId: true },
          where: { locationId: { not: null } }
        }),
        tenantDb.vehicle.groupBy({
          by: ['brandName'],
          _count: { brandName: true },
          where: { brandName: { not: null } },
          orderBy: { _count: { brandName: 'desc' } },
          take: 10
        }),
        tenantDb.vehicle.findMany({
          select: {
            vehicleId: true,
            carNumber: true,
            ownerName: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }),
        tenantDb.vehicle.count({
          where: {
            expectedDeliveryDate: { lt: new Date() },
            status: { notIn: ['delivered', 'cancelled'] }
          }
        })
      ]);

      const stats = {
        overview: {
          total: totalVehicles,
          overdue: overdueVehicles
        },
        byStatus: vehiclesByStatus,
        byLocation: vehiclesByLocation,
        byBrand: vehiclesByBrand,
        recent: recentVehicles
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
      return;
    } catch (error) {
      console.error('Get vehicle stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get vehicle statistics'
      } as ApiResponse);
    }
  }

  // Helper methods for record-level access control
  private static canAccessVehicle(user: any, vehicle: any): boolean {
    // Users with wildcard permissions (admin) can access all vehicles
    if (user.permissions && user.permissions['*'] === true) {
      return true;
    }

    // Installers can access all vehicles
    if (user.role === 'installer') {
      return true;
    }

    // Users can access vehicles they are assigned to or created
    if (
      user.userId === vehicle.salespersonId ||
      user.userId === vehicle.coordinatorId ||
      user.userId === vehicle.supervisorId ||
      user.userId === vehicle.createdBy
    ) {
      return true;
    }

    // Users can access vehicles with their installations
    if (vehicle.installations?.some((inst: any) => inst.installerId === user.userId)) {
      return true;
    }

    return false;
  }

  private static canModifyVehicle(user: any, vehicle: any): boolean {
    // Users with wildcard permissions (admin) can modify all vehicles
    if (user.permissions && user.permissions['*'] === true) {
      return true;
    }

    // Users can modify vehicles they are assigned to or created
    if (
      user.userId === vehicle.salespersonId ||
      user.userId === vehicle.coordinatorId ||
      user.userId === vehicle.supervisorId ||
      user.userId === vehicle.createdBy
    ) {
      return true;
    }

    return false;
  }

  private static isValidStatusTransition(currentStatus: VehicleStatus, newStatus: VehicleStatus): boolean {
    const validTransitions: Record<VehicleStatus, VehicleStatus[]> = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['quality_check', 'delivered', 'cancelled'],
      'quality_check': ['in_progress', 'delivered', 'cancelled'],
      'delivered': [], // Terminal state
      'cancelled': [] // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Ensure products and brands exist in database, create them if they don't
   */
  private static async ensureProductsAndBrandsExist(tenantDb: any, products: any[]): Promise<void> {
    if (!products || !Array.isArray(products)) return;

    for (const product of products) {
      if (!product.productName || product.productName.trim() === '') continue;

      const productName = product.productName.trim();
      const brandName = product.brandName?.trim();

      try {
        // Check if product exists
        const existingProduct = await tenantDb.product.findFirst({
          where: {
            productName: {
              equals: productName,
              mode: 'insensitive'
            }
          }
        });

        if (!existingProduct) {
          // Create new product
          console.log(`Creating new product: ${productName}`);
          await tenantDb.product.create({
            data: {
              productName: productName,
              brandName: brandName || null,
              price: product.price || null,
              status: 'active'
            }
          });
        } else if (brandName && existingProduct.brandName !== brandName) {
          // Update existing product with brand if it doesn't have one
          if (!existingProduct.brandName) {
            console.log(`Updating product ${productName} with brand: ${brandName}`);
            await tenantDb.product.update({
              where: { productId: existingProduct.productId },
              data: { brandName: brandName }
            });
          }
        }
      } catch (error) {
        console.error(`Error ensuring product exists: ${productName}`, error);
        // Continue processing other products even if one fails
      }
    }
  }

  /**
   * Get individual product workflow stage
   */
  static async getProductWorkflowStage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { vehicleId, productName, workflowType } = req.params;
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

      // Check permissions
      if (!VehicleController.canAccessVehicle(req.user!, vehicle)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this vehicle workflow'
        } as ApiResponse);
        return;
      }

      // Find workflow instance for this specific product
      const entityId = vehicleId; // Use vehicleId to avoid FK constraint issues
      
      // Find existing workflow instances for this vehicle and product
      const existingInstances = await tenantDb.workflowInstance.findMany({
        where: {
          entityType: 'product',
          entityId: entityId,
          workflow: {
            workflowType: workflowType
          }
        },
        include: {
          workflow: {
            select: {
              workflowId: true,
              workflowName: true,
              workflowType: true
            }
          }
        }
      });

      // Find the specific product workflow by checking stageData
      const workflowInstance = existingInstances.find(instance => {
        const data = instance.stageData as any;
        return data?.productName === productName;
      });

      if (!workflowInstance) {
        // Return default empty workflow stages instead of 404
        const defaultStages = VehicleController.getDefaultStages(workflowType);
        const defaultResponse = {
          instanceId: null,
          workflowId: null,
          entityType: 'product',
          entityId: entityId,
          currentStage: 'pending',
          stageData: {
            productName,
            vehicleId,
            stages: defaultStages,
            lastUpdated: new Date().toISOString()
          },
          stageHistory: [],
          status: 'pending',
          assignedTo: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          workflow: null,
          assignee: null,
          vehicle: null
        };

        res.json({
          success: true,
          data: defaultResponse
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<typeof workflowInstance> = {
        success: true,
        data: workflowInstance
      };

      res.json(response);
      return;
    } catch (error) {
      console.error('Get product workflow stage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get product workflow stage'
      } as ApiResponse);
    }
  }

  /**
   * Update individual product workflow stage
   */
  static async updateProductWorkflowStage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { vehicleId, productName, workflowType } = req.params;
      const { stages, notes } = req.body;
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

      // Check permissions
      if (!VehicleController.canModifyVehicle(req.user!, vehicle)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update this vehicle workflow'
        } as ApiResponse);
        return;
      }

      // Create or update workflow instance for this specific product
      // Use vehicleId as entityId and store product info in stageData to avoid FK constraint issues
      const entityId = vehicleId;
      
      // Find existing workflow instances for this vehicle and product
      const existingInstances = await tenantDb.workflowInstance.findMany({
        where: {
          entityType: 'product',
          entityId: entityId,
          workflow: {
            workflowType: workflowType
          }
        }
      });

      // Find the specific product workflow by checking stageData
      let workflowInstance = existingInstances.find(instance => {
        const data = instance.stageData as any;
        return data?.productName === productName;
      });

      const stageData = {
        productName,
        vehicleId,
        stages,
        lastUpdated: new Date().toISOString()
      };

      if (!workflowInstance) {
        // Find or create workflow
        let workflow = await tenantDb.workflow.findFirst({
          where: { workflowType: workflowType }
        });

        // Create workflow if it doesn't exist
        if (!workflow) {
          const workflowConfig = VehicleController.getDefaultWorkflowConfig(workflowType);
          workflow = await tenantDb.workflow.create({
            data: workflowConfig
          });
          console.log(`Created missing workflow: ${workflowType}`);
        }

        workflowInstance = await tenantDb.workflowInstance.create({
          data: {
            workflowId: workflow.workflowId,
            entityType: 'product',
            entityId: entityId, // Now uses vehicleId instead of vehicleId:productName
            currentStage: VehicleController.determineCurrentStage(stages),
            stageData: stageData,
            stageHistory: [{
              stages: stages,
              timestamp: new Date().toISOString(),
              userId: req.user?.userId,
              notes: notes || `Product workflow updated for ${productName}`,
              action: 'created'
            }],
            status: 'in_progress',
            startedAt: new Date()
          }
        });
      } else {
        // Update existing workflow instance
        const newHistoryEntry = {
          stages: stages,
          timestamp: new Date().toISOString(),
          userId: req.user?.userId,
          notes: notes || `Product workflow updated for ${productName}`,
          action: 'updated',
          previousStages: workflowInstance.stageData
        };

        const updatedStageHistory = [
          ...(Array.isArray(workflowInstance.stageHistory) ? workflowInstance.stageHistory : []),
          newHistoryEntry
        ];

        const currentStage = VehicleController.determineCurrentStage(stages);
        const isCompleted = VehicleController.isWorkflowCompleted(stages, workflowType);

        workflowInstance = await tenantDb.workflowInstance.update({
          where: { instanceId: workflowInstance.instanceId },
          data: {
            currentStage,
            stageData: stageData,
            stageHistory: updatedStageHistory,
            status: isCompleted ? 'completed' : 'in_progress',
            completedAt: isCompleted ? new Date() : workflowInstance.completedAt,
            updatedAt: new Date()
          }
        });
      }

      // Emit real-time update
      emitVehicleUpdate(req.tenantId, {
        vehicleId,
        updatedBy: req.user?.userId || 'system',
        changes: {
          type: 'product_workflow_updated',
          productName,
          workflowType,
          stages
        },
        timestamp: new Date()
      });

      const response: ApiResponse<typeof workflowInstance> = {
        success: true,
        data: workflowInstance,
        message: `${productName} ${workflowType} workflow updated successfully`
      };

      res.json(response);
      return;
    } catch (error) {
      console.error('Update product workflow stage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update product workflow stage'
      } as ApiResponse);
    }
  }

  /**
   * Helper method to determine current stage from stages object
   */
  private static determineCurrentStage(stages: { [key: string]: boolean }): string {
    const stageOrder = [
      'start_installation', 'quality_checked', 'delivered',
      'draft', 'invoice', 'payment'
    ];
    
    for (let i = stageOrder.length - 1; i >= 0; i--) {
      if (stages[stageOrder[i]]) {
        return stageOrder[i];
      }
    }
    
    return 'pending';
  }

  /**
   * Helper method to check if workflow is completed
   */
  private static isWorkflowCompleted(stages: { [key: string]: boolean }, workflowType: string): boolean {
    if (workflowType === 'installation') {
      return stages.delivered === true;
    } else if (workflowType === 'payment') {
      return stages.payment === true;
    }
    return false;
  }

  /**
   * Update vehicle workflow stage
   */
  static async updateVehicleWorkflowStage(req: Request, res: Response): Promise<void> {
    console.log('🔄 [WORKFLOW UPDATE] Starting workflow update process');
    console.log('📥 [REQUEST DATA]', {
      vehicleId: req.params.vehicleId,
      workflowType: req.params.workflowType,
      requestBody: req.body,
      tenantId: req.tenantId,
      userId: req.user?.userId
    });

    try {
      if (!req.tenantId) {
        console.log('❌ [ERROR] No tenant ID provided');
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { vehicleId, workflowType } = req.params;
      const { stage, notes, paymentDetails } = req.body;
      
      console.log('🎯 [PARAMS]', { vehicleId, workflowType, stage, notes, paymentDetails });
      
      const tenantDb = await getTenantDb(req.tenantId);

      // Validate vehicle exists
      const vehicle = await tenantDb.vehicle.findUnique({
        where: { vehicleId }
      });

      console.log('🚗 [VEHICLE CHECK]', vehicle ? 'Vehicle found' : 'Vehicle not found');

      if (!vehicle) {
        console.log('❌ [ERROR] Vehicle not found for ID:', vehicleId);
        res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        } as ApiResponse);
        return;
      }

      // Check permissions
      if (!VehicleController.canModifyVehicle(req.user!, vehicle)) {
        console.log('❌ [ERROR] Insufficient permissions for user:', req.user?.userId);
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update this vehicle workflow'
        } as ApiResponse);
        return;
      }

      // Additional financial permission check for payment workflows
      if (workflowType === 'payment' && paymentDetails) {
        const userPermissions = req.user?.permissions || {};
        const hasPaymentPermission = userPermissions['*'] || 
          userPermissions['payments.create'] || 
          userPermissions['payments.update'];
        
        if (!hasPaymentPermission) {
          console.log('❌ [ERROR] Insufficient financial permissions for payment workflow');
          res.status(403).json({
            success: false,
            error: 'Insufficient financial permissions to update payment data'
          } as ApiResponse);
          return;
        }
      }

      console.log('🔍 [DATABASE] Searching for existing workflow instance...');
      
      // Find or create workflow instance
      let workflowInstance = await tenantDb.workflowInstance.findFirst({
        where: {
          entityType: 'vehicle',
          entityId: vehicleId,
          workflow: {
            workflowType: workflowType
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log('📋 [WORKFLOW INSTANCE]', workflowInstance ? {
        instanceId: workflowInstance.instanceId,
        currentStage: workflowInstance.currentStage,
        status: workflowInstance.status,
        stageHistory: workflowInstance.stageHistory
      } : 'No existing workflow instance found');

      if (!workflowInstance) {
        console.log('🆕 [CREATE] Creating new workflow instance...');
        
        // Create new workflow instance
        const workflow = await tenantDb.workflow.findFirst({
          where: { workflowType: workflowType }
        });

        console.log('🔧 [WORKFLOW TEMPLATE]', workflow ? {
          workflowId: workflow.workflowId,
          workflowName: workflow.workflowName,
          stages: workflow.stages
        } : 'No workflow template found');

        const newWorkflowData = {
          workflowId: workflow?.workflowId,
          entityType: 'vehicle',
          entityId: vehicleId,
          currentStage: stage,
          stageData: paymentDetails ? { paymentDetails } : {},
          stageHistory: [{
            stage: stage,
            timestamp: new Date().toISOString(),
            userId: req.user?.userId,
            notes: notes || `Workflow started at ${stage}`,
            metadata: paymentDetails ? { paymentDetails } : undefined
          }],
          status: 'in_progress',
          startedAt: new Date()
        };

        console.log('💾 [CREATE DATA]', newWorkflowData);

        workflowInstance = await tenantDb.workflowInstance.create({
          data: newWorkflowData
        });

        console.log('✅ [CREATED] New workflow instance created:', {
          instanceId: workflowInstance.instanceId,
          currentStage: workflowInstance.currentStage
        });
      } else {
        console.log('🔄 [UPDATE] Updating existing workflow instance...');
        console.log('📊 [CURRENT STATE]', {
          currentStage: workflowInstance.currentStage,
          newStage: stage,
          stageHistory: workflowInstance.stageHistory
        });
        
        // Update existing workflow instance
        const newHistoryEntry = {
          stage: stage,
          timestamp: new Date().toISOString(),
          userId: req.user?.userId,
          notes: notes || `Stage changed to ${stage}`,
          previousStage: workflowInstance.currentStage,
          metadata: paymentDetails ? { paymentDetails } : undefined
        };

        console.log('📝 [NEW HISTORY ENTRY]', newHistoryEntry);

        const updatedStageHistory = [
          ...(Array.isArray(workflowInstance.stageHistory) ? workflowInstance.stageHistory : []),
          newHistoryEntry
        ];

        const isCompleted = stage === 'delivered' || stage === 'payment';

        console.log('🏁 [COMPLETION CHECK]', { stage, isCompleted });

        const updateData = {
          currentStage: stage,
          stageData: paymentDetails ? { 
            ...workflowInstance.stageData, 
            paymentDetails: {
              ...((workflowInstance.stageData as any)?.paymentDetails || {}),
              ...paymentDetails
            }
          } : workflowInstance.stageData,
          stageHistory: updatedStageHistory,
          status: isCompleted ? 'completed' : workflowInstance.status,
          completedAt: isCompleted ? new Date() : workflowInstance.completedAt,
          updatedAt: new Date()
        };

        console.log('💾 [UPDATE DATA]', updateData);

        workflowInstance = await tenantDb.workflowInstance.update({
          where: { instanceId: workflowInstance.instanceId },
          data: updateData
        });

        console.log('✅ [UPDATED] Workflow instance updated:', {
          instanceId: workflowInstance.instanceId,
          oldStage: newHistoryEntry.previousStage,
          newStage: workflowInstance.currentStage,
          status: workflowInstance.status
        });
      }

      console.log('📡 [REAL-TIME] Emitting vehicle update event...');
      
      // Emit real-time update (in background, don't await)
      setImmediate(() => {
        try {
          emitVehicleUpdate(req.tenantId!, {
            vehicleId,
            updatedBy: req.user?.userId || 'system',
            changes: {
              type: 'workflow_updated',
              workflowType,
              stage
            },
            timestamp: new Date()
          });
          console.log('✅ [REAL-TIME] Vehicle update event emitted successfully');
        } catch (emitError) {
          console.error('❌ [REAL-TIME ERROR] Error emitting vehicle update:', emitError);
        }
      });

      const response: ApiResponse<typeof workflowInstance> = {
        success: true,
        data: workflowInstance,
        message: `${workflowType} workflow updated successfully`
      };

      console.log('🎉 [SUCCESS] Sending response:', {
        success: response.success,
        message: response.message,
        currentStage: workflowInstance.currentStage,
        instanceId: workflowInstance.instanceId
      });

      res.json(response);
      console.log('📤 [RESPONSE SENT] Workflow update response sent successfully');
      
    } catch (error) {
      console.error('❌ [FATAL ERROR] Update vehicle workflow stage error:', error);
      console.error('🔍 [ERROR DETAILS]', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      if (!res.headersSent) {
        console.log('📤 [ERROR RESPONSE] Sending error response...');
        res.status(500).json({
          success: false,
          error: 'Failed to update vehicle workflow stage'
        } as ApiResponse);
      } else {
        console.log('⚠️ [WARNING] Headers already sent, cannot send error response');
      }
    }
  }

  /**
   * Initialize missing workflow instances for an existing vehicle
   */
  static async initializeMissingWorkflows(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId || !req.user) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification and authentication required'
        } as ApiResponse);
        return;
      }

      const { vehicleId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      console.log('🔧 [INIT MISSING] Initializing missing workflows for vehicle:', vehicleId);

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

      // Initialize workflows
      await VehicleController.initializeDefaultWorkflows(tenantDb, vehicleId, req.user.userId);

      const response: ApiResponse = {
        success: true,
        message: 'Workflow instances initialized successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('❌ [INIT ERROR] Failed to initialize missing workflows:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize workflow instances'
      } as ApiResponse);
    }
  }

  /**
   * Initialize default workflow instances for a new vehicle
   */
  private static async initializeDefaultWorkflows(tenantDb: any, vehicleId: string, userId: string): Promise<void> {
    try {
      console.log('🔍 [INIT] Looking for workflow templates and existing instances...');

      // Get all available workflow templates and existing instances in parallel
      const [workflows, existingInstances] = await Promise.all([
        tenantDb.workflow.findMany({
          where: { status: 'active' }
        }),
        tenantDb.workflowInstance.findMany({
          where: {
            entityType: 'vehicle',
            entityId: vehicleId
          },
          include: {
            workflow: {
              select: {
                workflowType: true
              }
            }
          }
        })
      ]);

      const existingWorkflowTypes = new Set(
        existingInstances.map((inst: any) => inst.workflow.workflowType)
      );

      console.log('📋 [WORKFLOWS FOUND]', workflows.map((w: any) => ({
        id: w.workflowId,
        name: w.workflowName,
        type: w.workflowType
      })));
      
      console.log('✅ [EXISTING TYPES]', Array.from(existingWorkflowTypes));

      // Define default starting stages for each workflow type
      const defaultStartingStages = {
        installation: 'order_confirmed',
        payment: 'draft'
      };

      // Filter workflows that do not have an existing instance
      const workflowsToCreate = workflows.filter(
        (workflow: any) => !existingWorkflowTypes.has(workflow.workflowType)
      );

      if (workflowsToCreate.length === 0) {
        console.log('👍 [INIT] No new workflow instances to create. All are up to date.');
        return;
      }

      console.log('✨ [WORKFLOWS TO CREATE]', workflowsToCreate.map((w: any) => w.workflowType));

      // Create workflow instances for each missing workflow type
      for (const workflow of workflowsToCreate) {
        const startingStage = defaultStartingStages[workflow.workflowType as keyof typeof defaultStartingStages];
        
        if (startingStage) {
          console.log(`🆕 [CREATE INSTANCE] Creating ${workflow.workflowType} workflow instance with stage: ${startingStage}`);
          
          const workflowInstance = await tenantDb.workflowInstance.create({
            data: {
              workflowId: workflow.workflowId,
              entityType: 'vehicle',
              entityId: vehicleId,
              currentStage: startingStage,
              stageData: {},
              stageHistory: [{
                stage: startingStage,
                timestamp: new Date().toISOString(),
                userId: userId,
                notes: `${workflow.workflowType} workflow initialized for new vehicle`
              }],
              status: 'in_progress',
              startedAt: new Date()
            }
          });

          console.log(`✅ [CREATED] ${workflow.workflowType} workflow instance:`, {
            instanceId: workflowInstance.instanceId,
            currentStage: workflowInstance.currentStage
          });
        } else {
          console.log(`⚠️ [SKIP] No default starting stage defined for workflow type: ${workflow.workflowType}`);
        }
      }

      console.log('🎉 [INIT COMPLETE] All missing workflow instances initialized successfully');
    } catch (error) {
      console.error('❌ [INIT ERROR] Failed to initialize workflows:', error);
      // Don't throw error to avoid breaking vehicle creation
    }
  }

  /**
   * Get default stage structure for workflow types
   */
  private static getDefaultStages(workflowType: string): { [key: string]: boolean } {
    // For product workflows, use simplified structure
    switch (workflowType) {
      case 'installation':
        return {
          completed: false
        };
      
      case 'payment':
        return {
          completed: false
        };
      
      default:
        return {};
    }
  }

  /**
   * Get default workflow configuration for auto-creation
   */
  private static getDefaultWorkflowConfig(workflowType: string) {
    const baseConfig = {
      workflowName: '',
      workflowType,
      stages: [],
      rules: {
        allowSkipping: false,
        requireNotes: true,
        notifyOnCompletion: true
      },
      notifications: {
        onStart: true,
        onComplete: true,
        emailNotifications: false
      },
      status: 'active'
    };

    switch (workflowType) {
      case 'installation':
        return {
          ...baseConfig,
          workflowName: 'Vehicle Installation Process',
          stages: [
            { key: 'start_installation', label: 'Start Installation', order: 1, required: true },
            { key: 'quality_checked', label: 'Quality Checked', order: 2, required: true },
            { key: 'delivered', label: 'Delivered', order: 3, required: true }
          ]
        };
      
      case 'payment':
        return {
          ...baseConfig,
          workflowName: 'Vehicle Payment Process',
          stages: [
            { key: 'draft', label: 'Draft', order: 1, required: true },
            { key: 'invoice', label: 'Invoice', order: 2, required: true },
            { key: 'payment', label: 'Payment', order: 3, required: true }
          ],
          notifications: {
            ...baseConfig.notifications,
            emailNotifications: true
          },
          rules: {
            ...baseConfig.rules,
            requireApproval: true
          }
        };
      
      default:
        throw new Error(`Unsupported workflow type: ${workflowType}`);
    }
  }
}