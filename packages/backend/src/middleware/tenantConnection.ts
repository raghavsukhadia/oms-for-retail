import { Request, Response, NextFunction } from 'express';
import { getTenantDb, masterDb } from '../lib/database';
import { logger } from '../lib/logger';

declare global {
  namespace Express {
    interface Request {
      tenantDb?: any;
      masterDb?: any;
      tenantId?: string;
      tenantInfo?: {
        tenantId: string;
        tenantName: string;
        subdomain: string;
        status: string;
        subscriptionTier: string;
        features: Record<string, any>;
      };
    }
  }
}

/**
 * Middleware to establish tenant-specific database connection
 * This should be applied to all routes that require tenant context
 */
export const tenantConnectionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Always attach master database
    req.masterDb = masterDb;

    // Extract tenant identifier from headers or subdomain
    let tenantIdentifier = req.headers['x-tenant-id'] as string;
    
    // If no header, try to extract from subdomain (for subdomain-based routing)
    if (!tenantIdentifier && req.hostname) {
      const hostParts = req.hostname.split('.');
      if (hostParts.length > 2) {
        tenantIdentifier = hostParts[0]; // Extract subdomain
      }
    }

    if (!tenantIdentifier) {
      res.status(400).json({
        success: false,
        error: 'Tenant identification required',
        code: 'MISSING_TENANT_ID'
      });
      return;
    }

    // Get tenant information from master database
    const tenant = await masterDb.tenant.findUnique({
      where: { subdomain: tenantIdentifier },
      select: {
        tenantId: true,
        tenantName: true,
        subdomain: true,
        status: true,
        subscriptionTier: true,
        features: true,
        databaseUrl: true
      }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: `Tenant '${tenantIdentifier}' not found`,
        code: 'TENANT_NOT_FOUND'
      });
      return;
    }

    if (tenant.status !== 'active') {
      res.status(403).json({
        success: false,
        error: `Tenant '${tenantIdentifier}' is not active`,
        code: 'TENANT_INACTIVE'
      });
      return;
    }

    // Establish connection to tenant database
    try {
      const tenantDb = await getTenantDb(tenantIdentifier);
      
      // Attach to request object
      req.tenantDb = tenantDb;
      req.tenantId = tenantIdentifier;
      req.tenantInfo = {
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        subdomain: tenant.subdomain,
        status: tenant.status,
        subscriptionTier: tenant.subscriptionTier,
        features: tenant.features as Record<string, any>
      };

      logger.debug(`Tenant connection established for: ${tenantIdentifier}`);
      next();
    } catch (dbError) {
      logger.error(`Failed to connect to tenant database for ${tenantIdentifier}:`, {
        error: dbError,
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined,
        tenantIdentifier,
        tenantDatabaseUrl: tenant.databaseUrl
      });
      
      res.status(500).json({
        success: false,
        error: `Cannot connect to tenant database. Please contact support.`,
        code: 'TENANT_DB_CONNECTION_ERROR',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      });
      return;
    }
  } catch (error) {
    logger.error('Tenant connection middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'MIDDLEWARE_ERROR'
    });
    return;
  }
};

/**
 * Optional middleware to check tenant features/limits
 */
export const checkTenantFeatures = (requiredFeatures: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenantInfo) {
      res.status(500).json({
        success: false,
        error: 'Tenant information not available',
        code: 'MISSING_TENANT_INFO'
      });
      return;
    }

    const { features } = req.tenantInfo;
    const missingFeatures = requiredFeatures.filter(feature => !features[feature]);

    if (missingFeatures.length > 0) {
      res.status(403).json({
        success: false,
        error: `Feature not available: ${missingFeatures.join(', ')}`,
        code: 'FEATURE_NOT_AVAILABLE',
        missingFeatures
      });
      return;
    }

    next();
  };
};
