import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRole } from '@omsms/shared';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole; // Legacy field for backward compatibility
  roleId: string; // New dynamic role ID
  roleName: string; // New dynamic role name
  tenantId: string;
  permissions: Record<string, boolean>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';
  private static readonly SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT tokens (access + refresh)
   */
  static generateTokens(payload: JWTPayload): AuthTokens {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const accessToken = jwt.sign(payload, secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'omsms',
      subject: payload.userId,
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId, tenantId: payload.tenantId },
      secret,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
        issuer: 'omsms',
        subject: payload.userId,
      }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): JWTPayload {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(userPermissions: Record<string, boolean>, permission: string): boolean {
    return userPermissions[permission] === true;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(userRole);
  }

  /**
   * Generate default permissions based on user role
   */
  static getDefaultPermissions(role: UserRole): Record<string, boolean> {
    const permissions: Record<string, boolean> = {};

    switch (role) {
      case 'admin':
        permissions['*'] = true; // Admin has all permissions
        break;
      
      case 'manager':
        permissions['users.read'] = true;
        permissions['users.create'] = true;
        permissions['users.update'] = true;
        permissions['vehicles.read'] = true;
        permissions['vehicles.create'] = true;
        permissions['vehicles.update'] = true;
        permissions['vehicles.delete'] = true;
        permissions['reports.read'] = true;
        permissions['workflows.manage'] = true;
        break;
      
      case 'coordinator':
        permissions['vehicles.read'] = true;
        permissions['vehicles.update'] = true;
        permissions['installations.read'] = true;
        permissions['installations.create'] = true;
        permissions['installations.update'] = true;
        permissions['workflows.execute'] = true;
        break;
      
      case 'supervisor':
        permissions['vehicles.read'] = true;
        permissions['installations.read'] = true;
        permissions['quality.check'] = true;
        permissions['workflows.execute'] = true;
        break;
      
      case 'salesperson':
        permissions['vehicles.read'] = true;
        permissions['vehicles.create'] = true;
        permissions['customers.read'] = true;
        permissions['customers.create'] = true;
        permissions['customers.update'] = true;
        break;
      
      case 'installer':
        permissions['vehicles.read'] = true;
        permissions['vehicles.update'] = true;
        permissions['users.read'] = true;
        permissions['locations.read'] = true;
        permissions['departments.read'] = true;
        permissions['workflows.read'] = true;
        permissions['workflows.update'] = true;
        permissions['media.create'] = true;
        permissions['media.read'] = true;
        permissions['media.update'] = true;
        permissions['settings.read'] = true;
        permissions['organization.read'] = true; // Added for organization settings
        permissions['installations.read'] = true;
        permissions['installations.update'] = true;
        permissions['media.upload'] = true;
        break;
      
      default:
        // No permissions for unknown roles
        break;
    }

    return permissions;
  }
}