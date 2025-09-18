import { z } from 'zod';

// Vehicle form validation schema
export const vehicleInwardSchema = z.object({
  // Basic vehicle information
  carNumber: z
    .string()
    .min(1, 'Car number is required')
    .max(50, 'Car number must be less than 50 characters')
    .transform((val) => val.toUpperCase().trim()),
  
  ownerName: z
    .string()
    .min(1, 'Owner name is required')
    .max(255, 'Owner name must be less than 255 characters')
    .transform((val) => val.trim()),
  
  ownerMobile: z
    .string()
    .optional()
    .refine((val) => !val || /^[+]?[\d\s\-()]{10,15}$/.test(val), {
      message: 'Please enter a valid mobile number'
    }),
  
  ownerEmail: z
    .union([
      z.string().email('Please enter a valid email address'),
      z.literal(''),
      z.undefined()
    ])
    .optional(),
  
  ownerAddress: z
    .string()
    .optional(),
  
  modelName: z
    .string()
    .optional(),
  
  brandName: z
    .string()
    .optional(),
  
  vehicleType: z
    .string()
    .optional(),
  
  // Assignment fields
  locationId: z
    .union([
      z.string().uuid('Please select a valid location'),
      z.literal(''),
      z.undefined()
    ])
    .optional(),
  
  salespersonId: z
    .union([
      z.string().uuid('Please select a valid salesperson'),
      z.literal(''),
      z.undefined()
    ])
    .optional(),
  
  coordinatorId: z
    .union([
      z.string().uuid('Please select a valid coordinator'),
      z.literal(''),
      z.undefined()
    ])
    .optional(),
  
  supervisorId: z
    .union([
      z.string().uuid('Please select a valid supervisor'),
      z.literal(''),
      z.undefined()
    ])
    .optional(),
  
  // Date fields
  inwardDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Please enter a valid inward date'
    }),
  
  expectedDeliveryDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Please enter a valid expected delivery date'
    }),
  
  // Remarks
  vehicleRemarks: z
    .string()
    .optional(),
  
  accountsRemarks: z
    .string()
    .optional(),
  
  // Products array (required, defaults to empty array)
  products: z
    .array(
      z.object({
        productName: z.string().optional(),
        brandName: z.string().optional(),
        price: z
          .number()
          .min(0, 'Price must be positive')
          .optional(),
        quantity: z
          .number()
          .min(1, 'Quantity must be at least 1')
          .optional(),
        departmentName: z.string().optional(),
        amount: z
          .number()
          .min(0, 'Amount must be positive')
          .optional()
      })
    )
});

// Product form validation schema
export const productItemSchema = z.object({
  productName: z.string().min(1, 'Product name is required').optional(),
  brandName: z.string().optional(),
  price: z
    .number()
    .min(0, 'Price must be positive')
    .optional(),
  quantity: z
    .number()
    .min(1, 'Quantity must be at least 1')
    .optional(),
  departmentName: z.string().optional(),
  amount: z
    .number()
    .min(0, 'Amount must be positive')
    .optional()
});

// Vehicle search/filter schema
export const vehicleFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'quality_check', 'delivered', 'cancelled']).optional(),
  locationId: z.string().uuid().optional(),
  salespersonId: z.string().uuid().optional(),
  coordinatorId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional(),
  brandName: z.string().optional(),
  vehicleType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

// Type exports
export type VehicleInwardFormData = z.infer<typeof vehicleInwardSchema>;
export type ProductItemFormData = z.infer<typeof productItemSchema>;
export type VehicleFilterFormData = z.infer<typeof vehicleFilterSchema>;