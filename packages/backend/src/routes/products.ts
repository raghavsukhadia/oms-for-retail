import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticate, authorizeRoles, requirePermission, extractTenant } from '../middleware/authMiddleware';
import { attachDatabases } from '../lib/database';

export const productRoutes = Router();

// Apply authentication and database middleware to all routes
productRoutes.use(authenticate);
productRoutes.use(extractTenant);
productRoutes.use(attachDatabases());

/**
 * GET /api/products
 * Get all products with pagination and filtering
 * Requires: authenticated user (accessible to all roles for vehicle inward form)
 */
productRoutes.get('/', 
  ProductController.getProducts
);

/**
 * GET /api/products/brands
 * Get unique brand names for dropdown
 * Requires: authenticated user
 */
productRoutes.get('/brands',
  ProductController.getBrands
);

/**
 * GET /api/products/stats
 * Get product statistics
 * Requires: products.read permission or manager+ role
 */
productRoutes.get('/stats', 
  authorizeRoles(['admin', 'manager']),
  ProductController.getProductStats
);

/**
 * GET /api/products/:productId
 * Get product by ID
 * Requires: products.read permission or coordinator+ role
 */
productRoutes.get('/:productId', 
  authorizeRoles(['admin', 'manager', 'coordinator']),
  ProductController.getProductById
);

/**
 * POST /api/products
 * Create new product
 * Requires: admin or manager role
 */
productRoutes.post('/', 
  authorizeRoles(['admin', 'manager']),
  ProductController.createProduct
);

/**
 * PUT /api/products/:productId
 * Update product
 * Requires: admin or manager role
 */
productRoutes.put('/:productId', 
  authorizeRoles(['admin', 'manager']),
  ProductController.updateProduct
);

/**
 * DELETE /api/products/:productId
 * Delete product
 * Requires: admin role
 */
productRoutes.delete('/:productId', 
  authorizeRoles(['admin']),
  ProductController.deleteProduct
);

/**
 * GET /api/product-categories
 * Get all product categories
 * Requires: products.read permission or coordinator+ role
 */
productRoutes.get('/categories', 
  authorizeRoles(['admin', 'manager', 'coordinator']),
  ProductController.getProductCategories
);