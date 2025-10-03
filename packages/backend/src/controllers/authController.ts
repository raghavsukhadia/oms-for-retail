import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../lib/auth';
import { masterDb, getTenantDb, createTenantDatabase } from '../lib/database';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  TenantRegistrationRequest,
  TenantRegistrationResponse,
  ApiResponse,
  UserRole
} from '@omsms/shared';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1), // Use min(1) to match shared schema
  subdomain: z.string().optional()
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mobileNumber: z.string().optional(),
  role: z.enum(['admin', 'manager', 'coordinator', 'supervisor', 'salesperson', 'installer']).optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional()
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
});

const tenantRegistrationSchema = z.object({
  tenantName: z.string().min(1),
  subdomain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  subscriptionTier: z.enum(['starter', 'professional', 'enterprise'])
});

export class AuthController {
  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const body = loginSchema.parse(req.body) as LoginRequest;
      
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      // Get tenant database
      const tenantDb = await getTenantDb(req.tenantId);

      // Find user by email
      const user = await tenantDb.user.findUnique({
        where: { email: body.email },
        include: {
          department: true,
          location: true,
          role: {
            include: {
              rolePermissions: {
                select: {
                  resource: true,
                  action: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        } as ApiResponse);
        return;
      }

      // Verify password
      const isPasswordValid = await AuthService.verifyPassword(body.password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        } as ApiResponse);
        return;
      }

      // Check user status
      if (user.status !== 'active') {
        res.status(401).json({
          success: false,
          error: 'Account is not active'
        } as ApiResponse);
        return;
      }

      // Get tenant info
      const tenant = await masterDb.tenant.findUnique({
        where: { subdomain: req.tenantId }, // req.tenantId is actually the subdomain
        select: {
          tenantId: true,
          tenantName: true,
          subdomain: true,
          features: true
        }
      });

      if (!tenant) {
        res.status(500).json({
          success: false,
          error: 'Tenant configuration error'
        } as ApiResponse);
        return;
      }

      // Build permissions from role permissions
      const permissions: Record<string, boolean> = {};
      
      // Add admin wildcard if user is admin
      if (user.role.roleName === 'admin') {
        permissions['*'] = true;
      } else {
        // Convert role permissions to the expected format
        user.role.rolePermissions.forEach(permission => {
          const permissionKey = `${permission.resource}.${permission.action}`;
          permissions[permissionKey] = true;
        });
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.userId,
        email: user.email,
        role: user.role.roleName as UserRole, // Legacy compatibility
        roleId: user.roleId,
        roleName: user.role.roleName,
        tenantId: req.tenantId,
        permissions: permissions
      };

      const tokens = AuthService.generateTokens(tokenPayload);

      // Update last login
      await tenantDb.user.update({
        where: { userId: user.userId },
        data: { lastLoginAt: new Date() }
      });

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      const response: ApiResponse<LoginResponse> = {
        success: true,
        data: {
          user: {
            ...userWithoutPassword,
            firstName: userWithoutPassword.firstName || undefined,
            lastName: userWithoutPassword.lastName || undefined,
          },
          tokens,
          tenant: {
            ...tenant,
            settings: tenant.settings as Record<string, any>,
            features: tenant.features as Record<string, any>,
          }
        }
      };

      if (res.headersSent) return; // Prevent double sending
      res.json(response);
      return; // ✅ Prevent function from continuing after successful response
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof z.ZodError) {
        if (res.headersSent) return; // Prevent double sending
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.issues
        } as ApiResponse);
        return;
      }

      if (res.headersSent) return; // Prevent double sending
      res.status(500).json({
        success: false,
        error: 'Login failed'
      } as ApiResponse);
    }
  }

  /**
   * Register new user (within existing tenant)
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const body = registerSchema.parse(req.body) as RegisterRequest;
      
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      // Get tenant database
      const tenantDb = await getTenantDb(req.tenantId);

      // Check if user already exists
      const existingUser = await tenantDb.user.findUnique({
        where: { email: body.email }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        } as ApiResponse);
        return;
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(body.password);

      // Determine role and permissions
      const role = body.role || 'installer';
      const permissions = AuthService.getDefaultPermissions(role);

      // Create user
      const newUser = await tenantDb.user.create({
        data: {
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          mobileNumber: body.mobileNumber,
          role,
          departmentId: body.departmentId,
          locationId: body.locationId,
          permissions,
          preferences: {},
          status: 'active'
        },
        include: {
          department: true,
          location: true
        }
      });

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = newUser;

      const response: ApiResponse<typeof userWithoutPassword> = {
        success: true,
        data: userWithoutPassword,
        message: 'User registered successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);
      
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
        error: 'Registration failed'
      } as ApiResponse);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const body = refreshTokenSchema.parse(req.body) as RefreshTokenRequest;

      // Verify refresh token
      const payload = AuthService.verifyToken(body.refreshToken);

      // Get user to ensure they still exist and are active
      const tenantDb = await getTenantDb(payload.tenantId);
      const user = await tenantDb.user.findUnique({
        where: { userId: payload.userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                select: {
                  resource: true,
                  action: true
                }
              }
            }
          }
        }
      });

      if (!user || user.status !== 'active') {
        res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        } as ApiResponse);
        return;
      }

      // Build permissions from role permissions
      const permissions: Record<string, boolean> = {};
      
      // Add admin wildcard if user is admin
      if (user.role.roleName === 'admin') {
        permissions['*'] = true;
      } else {
        // Convert role permissions to the expected format
        user.role.rolePermissions.forEach(permission => {
          const permissionKey = `${permission.resource}.${permission.action}`;
          permissions[permissionKey] = true;
        });
      }

      // Generate new tokens
      const newTokenPayload = {
        userId: user.userId,
        email: user.email,
        role: user.role.roleName as UserRole, // Legacy compatibility
        roleId: user.roleId,
        roleName: user.role.roleName,
        tenantId: payload.tenantId,
        permissions: permissions
      };

      const tokens = AuthService.generateTokens(newTokenPayload);

      const response: ApiResponse<RefreshTokenResponse> = {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      };

      res.json(response);
      return; // ✅ Prevent function from continuing after successful response
    } catch (error) {
      console.error('Token refresh error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data'
        } as ApiResponse);
        return;
      }

      res.status(401).json({
        success: false,
        error: 'Token refresh failed'
      } as ApiResponse);
    }
  }

  /**
   * Register new tenant and admin user
   */
  static async registerTenant(req: Request, res: Response): Promise<void> {
    try {
      const body = tenantRegistrationSchema.parse(req.body) as TenantRegistrationRequest;

      // Check if subdomain is available
      const existingTenant = await masterDb.tenant.findUnique({
        where: { subdomain: body.subdomain }
      });

      if (existingTenant) {
        res.status(409).json({
          success: false,
          error: 'Subdomain is already taken'
        } as ApiResponse);
        return;
      }

      // Create tenant database
      const databaseUrl = await createTenantDatabase(body.subdomain, body.subdomain);

      // Create tenant record
      const tenant = await masterDb.tenant.create({
        data: {
          tenantName: body.tenantName,
          subdomain: body.subdomain,
          databaseUrl,
          subscriptionTier: body.subscriptionTier,
          status: 'active',
          settings: {
            timezone: 'UTC',
            currency: 'USD',
            dateFormat: 'YYYY-MM-DD',
            theme: 'light',
            language: 'en'
          },
          features: getTenantFeatures(body.subscriptionTier)
        }
      });

      // Get tenant database client
      const tenantDb = await getTenantDb(tenant.subdomain);

      // Hash admin password
      const passwordHash = await AuthService.hashPassword(body.adminPassword);

      // Create or get admin role
      let adminRole;
      try {
        adminRole = await tenantDb.role.findUnique({
          where: { roleName: 'admin' }
        });
        
        if (!adminRole) {
          // Create admin role if it doesn't exist
          adminRole = await tenantDb.role.create({
            data: {
              roleName: 'admin',
              roleDescription: 'System Administrator - Full Access',
              roleLevel: 0,
              isSystemRole: true,
              status: 'active'
            }
          });
          console.log('Created admin role for tenant:', body.subdomain);
        }
      } catch (error) {
        console.error('Error with admin role setup:', error);
        throw new Error('Failed to setup admin role');
      }

      // Create admin user
      const adminUser = await tenantDb.user.create({
        data: {
          email: body.adminEmail,
          passwordHash,
          firstName: body.adminFirstName,
          lastName: body.adminLastName,
          roleId: adminRole.roleId, // Use roleId instead of role string
          permissions: AuthService.getDefaultPermissions('admin'),
          preferences: {},
          status: 'active'
        },
        include: {
          role: true
        }
      });

      // Generate tokens for admin user
      const tokenPayload = {
        userId: adminUser.userId,
        email: adminUser.email,
        role: (adminUser.role?.roleName || 'admin') as UserRole, // Legacy compatibility
        roleId: adminUser.roleId || 'admin', // Fallback for initial setup
        roleName: adminUser.role?.roleName || 'admin',
        tenantId: tenant.subdomain, // Use subdomain for tenant identification
        permissions: { '*': true } // Admin has all permissions
      };

      const tokens = AuthService.generateTokens(tokenPayload);

      // Remove password hash from response
      const { passwordHash: _, ...adminUserWithoutPassword } = adminUser;

      const response: ApiResponse<TenantRegistrationResponse> = {
        success: true,
        data: {
          tenant: {
            ...tenant,
            subscriptionTier: tenant.subscriptionTier as 'starter' | 'professional' | 'enterprise',
            status: tenant.status as 'active' | 'inactive' | 'suspended',
            settings: tenant.settings as Record<string, any>,
            features: tenant.features as Record<string, any>,
          },
          adminUser: {
            ...adminUserWithoutPassword,
            firstName: adminUserWithoutPassword.firstName || undefined,
            lastName: adminUserWithoutPassword.lastName || undefined,
            mobileNumber: adminUserWithoutPassword.mobileNumber || undefined,
          },
          tokens
        },
        message: 'Tenant registered successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Tenant registration error:', error);
      
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
        error: 'Tenant registration failed'
      } as ApiResponse);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);
      const user = await tenantDb.user.findUnique({
        where: { userId: req.user.userId },
        include: {
          department: true,
          location: true
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
        return;
      }

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      const response: ApiResponse<typeof userWithoutPassword> = {
        success: true,
        data: userWithoutPassword
      };

      res.json(response);
      return; // ✅ Prevent function from continuing after successful response
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile'
      } as ApiResponse);
    }
  }

  /**
   * Logout user (client-side token removal)
   */
  static async logout(req: Request, res: Response): Promise<void> {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the tokens from storage
    
    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully'
    };

    res.json(response);
  }

  /**
   * Check subdomain availability
   */
  static async checkSubdomainAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { subdomain } = req.body;

      if (!subdomain) {
        res.status(400).json({
          success: false,
          error: 'Subdomain is required'
        } as ApiResponse);
        return;
      }

      // Validate subdomain format
      if (!/^[a-z0-9-]+$/.test(subdomain) || subdomain.length < 3 || subdomain.length > 63) {
        res.status(400).json({
          success: false,
          error: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens (3-63 characters)'
        } as ApiResponse);
        return;
      }

      // Check if subdomain exists
      const existingTenant = await masterDb.tenant.findUnique({
        where: { subdomain }
      });

      const isAvailable = !existingTenant;

      res.json({
        success: true,
        data: {
          subdomain,
          available: isAvailable,
          url: isAvailable ? `https://${subdomain}.omsms.com` : null
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Subdomain availability check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check subdomain availability'
      } as ApiResponse);
    }
  }

  /**
   * Get subscription plans
   */
  static async getSubscriptionPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = [
        {
          id: 'starter',
          name: 'Starter',
          description: 'Perfect for small businesses getting started',
          price: 29,
          currency: 'USD',
          interval: 'month',
          features: [
            'Up to 100 vehicles',
            'Up to 10 users',
            '10GB storage',
            'Basic support',
            'Standard workflows'
          ],
          limits: getTenantFeatures('starter')
        },
        {
          id: 'professional',
          name: 'Professional',
          description: 'Ideal for growing businesses',
          price: 99,
          currency: 'USD',
          interval: 'month',
          features: [
            'Up to 1,000 vehicles',
            'Up to 50 users',
            '100GB storage',
            'Priority support',
            'Custom workflows',
            'API access'
          ],
          limits: getTenantFeatures('professional')
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'For large organizations with advanced needs',
          price: 299,
          currency: 'USD',
          interval: 'month',
          features: [
            'Unlimited vehicles',
            'Unlimited users',
            '1TB storage',
            'Premium support',
            'Custom workflows',
            'API access',
            'SSO integration',
            'Custom branding'
          ],
          limits: getTenantFeatures('enterprise')
        }
      ];

      res.json({
        success: true,
        data: { plans }
      } as ApiResponse);
    } catch (error) {
      console.error('Get subscription plans error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription plans'
      } as ApiResponse);
    }
  }
}

/**
 * Get tenant features based on subscription tier
 */
function getTenantFeatures(tier: string): Record<string, any> {
  const features = {
    starter: {
      maxVehicles: 100,
      maxUsers: 10,
      storageGB: 10,
      customWorkflows: false,
      apiAccess: false,
      prioritySupport: false
    },
    professional: {
      maxVehicles: 1000,
      maxUsers: 50,
      storageGB: 100,
      customWorkflows: true,
      apiAccess: true,
      prioritySupport: true
    },
    enterprise: {
      maxVehicles: -1, // unlimited
      maxUsers: -1, // unlimited
      storageGB: 1000,
      customWorkflows: true,
      apiAccess: true,
      prioritySupport: true,
      sso: true,
      customBranding: true
    }
  };

  return features[tier as keyof typeof features] || features.starter;
}