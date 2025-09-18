import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse,
  PaginationParams
} from '@omsms/shared';

// Product-related types (temporary until they're added to shared)
export interface Product {
  productId: string;
  productName: string;
  brandName?: string;
  categoryId?: string;
  price?: number;
  installationTimeHours?: number;
  specifications: Record<string, any>;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  categoryId: string;
  categoryName: string;
  parentCategoryId?: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Validation schemas
const createProductSchema = z.object({
  productName: z.string().min(1).max(255),
  brandName: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  price: z.number().positive().optional(),
  installationTimeHours: z.number().positive().optional(),
  specifications: z.record(z.any()).optional().default({})
});

const updateProductSchema = z.object({
  productName: z.string().min(1).max(255).optional(),
  brandName: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  price: z.number().positive().optional(),
  installationTimeHours: z.number().positive().optional(),
  specifications: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive']).optional()
});

const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(1000)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  categoryId: z.string().uuid().optional(),
  brandName: z.string().optional()
});

export class ProductController {
  /**
   * Get all products with pagination and filtering
   */
  static async getProducts(req: Request, res: Response): Promise<void> {
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
          { productName: { contains: query.search, mode: 'insensitive' } },
          { brandName: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      if (query.status) where.status = query.status;
      if (query.categoryId) where.categoryId = query.categoryId;
      if (query.brandName) where.brandName = { contains: query.brandName, mode: 'insensitive' };

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 1000; // Default to 1000 to match frontend expectation
      const skip = (page - 1) * limit;

      // Sorting
      const orderBy: any = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'asc';
      } else {
        orderBy.productName = 'asc';
      }

      // Get products with category relations from database
      const [products, total] = await Promise.all([
        tenantDb.product.findMany({
          where,
          include: {
            category: true
          },
          skip,
          take: limit,
          orderBy
        }),
        tenantDb.product.count({ where })
      ]);

      const response: ApiResponse<typeof products> = {
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get products error:', error);
      
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
        error: 'Failed to get products'
      } as ApiResponse);
    }
  }

  /**
   * Get unique brand names for dropdown
   */
  static async getBrands(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);

      // Get unique brand names from products
      const brands = await tenantDb.product.findMany({
        where: {
          status: 'active',
          brandName: {
            not: null
          }
        },
        select: {
          brandName: true
        },
        distinct: ['brandName'],
        orderBy: {
          brandName: 'asc'
        }
      });

      // Extract just the brand names
      const brandNames = brands
        .map(product => product.brandName)
        .filter(Boolean) // Remove any null/undefined values
        .sort();

      const response: ApiResponse<string[]> = {
        success: true,
        data: brandNames
      };

      res.json(response);
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get brands'
      } as ApiResponse);
    }
  }

  /**
   * Get product categories
   */
  static async getProductCategories(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      // Get product categories from database
      const categories = await tenantDb.productCategory.findMany({
        where: {
          status: 'active'
        },
        orderBy: {
          categoryName: 'asc'
        }
      });

      const response: ApiResponse<typeof categories> = {
        success: true,
        data: categories
      };

      res.json(response);
    } catch (error) {
      console.error('Get product categories error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get product categories'
      } as ApiResponse);
    }
  }

  /**
   * Get product statistics
   */
  static async getProductStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      // Mock stats for now
      const stats = {
        totalProducts: 3,
        activeProducts: 3,
        inactiveProducts: 0,
        totalCategories: 3,
        averagePrice: 316.67
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Get product stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get product statistics'
      } as ApiResponse);
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { productId } = req.params;

      // Mock response for now
      const mockProduct = {
        productId: productId,
        productName: 'Window Tinting Film',
        brandName: 'Premium Films',
        categoryId: '1',
        price: 150.00,
        installationTimeHours: 2,
        specifications: { material: 'Ceramic', transparency: '70%' },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const response: ApiResponse<typeof mockProduct> = {
        success: true,
        data: mockProduct
      };

      res.json(response);
    } catch (error) {
      console.error('Get product by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get product'
      } as ApiResponse);
    }
  }

  /**
   * Create new product
   */
  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const data = createProductSchema.parse(req.body);

      // Mock response for now
      const newProduct = {
        productId: Date.now().toString(),
        ...data,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const response: ApiResponse<typeof newProduct> = {
        success: true,
        data: newProduct,
        message: 'Product created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create product error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid product data',
          details: error.errors
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create product'
      } as ApiResponse);
    }
  }

  /**
   * Update product
   */
  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { productId } = req.params;
      const data = updateProductSchema.parse(req.body);

      // Mock response for now
      const updatedProduct = {
        productId,
        productName: 'Updated Product Name',
        ...data,
        updatedAt: new Date()
      };

      const response: ApiResponse<typeof updatedProduct> = {
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update product error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid product data',
          details: error.errors
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update product'
      } as ApiResponse);
    }
  }

  /**
   * Delete product
   */
  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { productId } = req.params;

      // Mock response for now
      const response: ApiResponse<{ productId: string }> = {
        success: true,
        data: { productId },
        message: 'Product deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete product'
      } as ApiResponse);
    }
  }
}