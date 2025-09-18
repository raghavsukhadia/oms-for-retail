import { Request, Response, NextFunction } from 'express';
import { AuthService, JWTPayload } from '../lib/auth';
import { UserRole } from '@omsms/shared';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      tenantId?: string;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT tokens
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    let token: string | null = null;
    try {
      token = AuthService.extractTokenFromHeader(authHeader);
    } catch (error) {
      console.error('Token extraction error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format',
        code: 'AUTH_HEADER_INVALID'
      });
      return;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING'
      });
      return;
    }

    let payload;
    try {
      payload = AuthService.verifyToken(token);
    } catch (error) {
      console.error('Token verification error:', error);
      const message = error instanceof Error ? error.message : 'Authentication failed';
      res.status(401).json({
        success: false,
        error: message,
        code: 'AUTH_TOKEN_INVALID'
      });
      return;
    }

    req.user = payload;
    req.tenantId = payload.tenantId;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    if (res.headersSent) return; // Prevent double sending
    res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Middleware to authorize requests based on user roles (legacy - kept for backward compatibility)
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      if (res.headersSent) return; // Prevent double sending
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!AuthService.hasRole(req.user.role, allowedRoles)) {
      if (res.headersSent) return; // Prevent double sending
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to authorize requests based on dynamic role names
 */
export const authorizeRoles = (allowedRoleNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      if (res.headersSent) return; // Prevent double sending
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Check if user's role name is in the allowed roles
    const userRoleName = req.user.roleName || req.user.role; // Support both old and new format
    const hasRequiredRole = allowedRoleNames.includes(userRoleName);

    if (!hasRequiredRole) {
      if (res.headersSent) return; // Prevent double sending
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoleNames,
        current: userRoleName
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check specific permissions
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      if (res.headersSent) return; // Prevent double sending
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Admin role with '*' permission has access to everything
    const hasAdminAccess = req.user.permissions['*'] === true;
    const hasSpecificPermission = AuthService.hasPermission(req.user.permissions, permission);

    if (!hasAdminAccess && !hasSpecificPermission) {
      if (res.headersSent) return; // Prevent double sending
      res.status(403).json({
        success: false,
        error: 'Permission denied',
        code: 'PERMISSION_DENIED',
        required: permission
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - sets user if token is valid, but doesn't require it
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthService.extractTokenFromHeader(authHeader);

    if (token) {
      const payload = AuthService.verifyToken(token);
      req.user = payload;
      req.tenantId = payload.tenantId;
    }
  } catch (error) {
    // Ignore authentication errors in optional auth
  }
  
  next();
};

/**
 * Middleware to extract tenant from subdomain or header
 */
export const extractTenant = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Try to get tenant from authenticated user first
  if (req.user?.tenantId) {
    req.tenantId = req.user.tenantId;
    next();
    return;
  }

  // Try to extract from X-Tenant-ID header
  const tenantHeader = req.headers['x-tenant-id'] as string;
  if (tenantHeader) {
    req.tenantId = tenantHeader;
    next();
    return;
  }

  // Try to extract from subdomain
  const host = req.headers.host;
  if (host) {
    // Extract hostname without port (e.g., "localhost:3001" -> "localhost")
    const hostname = host.split(':')[0];
    
    // For localhost development, use the demo tenant
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      req.tenantId = 'demo'; // Use demo tenant for localhost development
      next();
      return;
    }
    
    // Extract subdomain for production domains (e.g., "demo.example.com" -> "demo")
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'www') {
      req.tenantId = subdomain;
      next();
      return;
    }
  }

  // No tenant found
  if (res.headersSent) return; // Prevent double sending
  res.status(400).json({
    success: false,
    error: 'Tenant identification required',
    code: 'TENANT_REQUIRED'
  });
};