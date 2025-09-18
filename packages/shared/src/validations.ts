import { z } from 'zod';
import type { UserRole, VehicleStatus } from './types.js';

// User role enum for validation
export const userRoleSchema = z.enum([
  'admin',
  'manager', 
  'coordinator',
  'supervisor',
  'salesperson',
  'installer'
]);

// Vehicle status enum for validation
export const vehicleStatusSchema = z.enum([
  'pending',
  'in_progress',
  'quality_check', 
  'delivered',
  'cancelled'
]);

// Tenant validation schemas
export const createTenantSchema = z.object({
  tenantName: z.string().min(1).max(255),
  subdomain: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Subdomain must contain only lowercase letters, numbers, and hyphens'),
  subscriptionTier: z.enum(['starter', 'professional', 'enterprise']),
  adminUser: z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    password: z.string().min(8)
  })
});

export const updateTenantSchema = z.object({
  tenantName: z.string().min(1).max(255).optional(),
  subscriptionTier: z.enum(['starter', 'professional', 'enterprise']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  settings: z.record(z.any()).optional(),
  features: z.record(z.any()).optional()
});

// User validation schemas
export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  mobileNumber: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  role: userRoleSchema,
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  mobileNumber: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  role: userRoleSchema.optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  permissions: z.record(z.any()).optional(),
  preferences: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8)
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Location validation schemas
export const createLocationSchema = z.object({
  locationName: z.string().min(1).max(255),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  contactPerson: z.string().max(255).optional(),
  contactMobile: z.string().max(20).optional(),
  contactEmail: z.string().email().optional()
});

export const updateLocationSchema = createLocationSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
  settings: z.record(z.any()).optional()
});

// Department validation schemas
export const createDepartmentSchema = z.object({
  departmentName: z.string().min(1).max(100),
  colorCode: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color code must be a valid hex color').optional(),
  description: z.string().max(500).optional(),
  headUserId: z.string().uuid().optional()
});

export const updateDepartmentSchema = createDepartmentSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
  config: z.record(z.any()).optional()
});

// Vehicle validation schemas
export const createVehicleSchema = z.object({
  carNumber: z.string().min(1).max(50),
  ownerName: z.string().min(1).max(255),
  ownerMobile: z.string().max(20).optional(),
  ownerEmail: z.string().email().optional(),
  ownerAddress: z.string().max(500).optional(),
  modelName: z.string().max(100).optional(),
  brandName: z.string().max(100).optional(),
  vehicleType: z.string().max(50).optional(),
  locationId: z.string().uuid().optional(),
  salespersonId: z.string().uuid().optional(),
  coordinatorId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional(),
  inwardDate: z.string().datetime().optional(),
  expectedDeliveryDate: z.string().datetime().optional(),
  vehicleDetails: z.record(z.any()).optional(),
  customFields: z.record(z.any()).optional()
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  status: vehicleStatusSchema.optional(),
  actualDeliveryDate: z.string().datetime().optional()
});

// Workflow validation schemas
export const createWorkflowInstanceSchema = z.object({
  workflowId: z.string().uuid().optional(),
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  currentStage: z.string().min(1),
  stageData: z.record(z.any()).optional(),
  assignedTo: z.string().uuid().optional()
});

export const updateWorkflowStageSchema = z.object({
  stage: z.string().min(1),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional()
});

// Media file validation schemas
export const uploadMediaSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  fileCategory: z.enum(['photo', 'video', 'document']),
  fileSubcategory: z.string().max(100).optional(),
  workflowStage: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).optional(),
  metadata: z.record(z.any()).optional()
});

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().max(255).optional()
});

// Query validation schemas
export const vehicleQuerySchema = paginationSchema.extend({
  status: vehicleStatusSchema.optional(),
  locationId: z.string().uuid().optional(),
  salespersonId: z.string().uuid().optional(),
  coordinatorId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

export const userQuerySchema = paginationSchema.extend({
  role: userRoleSchema.optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
});

// API response validation
export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number()
  }).optional()
});

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const tenantParamSchema = z.object({
  tenantId: z.string().uuid()
});

// Export types inferred from schemas
export type CreateTenantData = z.infer<typeof createTenantSchema>;
export type UpdateTenantData = z.infer<typeof updateTenantSchema>;
export type RegisterUserData = z.infer<typeof registerUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type CreateLocationData = z.infer<typeof createLocationSchema>;
export type UpdateLocationData = z.infer<typeof updateLocationSchema>;
export type CreateDepartmentData = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentData = z.infer<typeof updateDepartmentSchema>;
export type CreateVehicleData = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleData = z.infer<typeof updateVehicleSchema>;
export type CreateWorkflowInstanceData = z.infer<typeof createWorkflowInstanceSchema>;
export type UpdateWorkflowStageData = z.infer<typeof updateWorkflowStageSchema>;
export type UploadMediaData = z.infer<typeof uploadMediaSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type VehicleQuery = z.infer<typeof vehicleQuerySchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
