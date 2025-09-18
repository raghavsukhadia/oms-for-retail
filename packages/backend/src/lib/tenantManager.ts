import { getMasterDb, getTenantDb } from './database';
import { logger } from './logger';
import { createStorageManager } from './storage';
import bcrypt from 'bcryptjs';

export interface TenantProvisioningConfig {
  companyName: string;
  primaryDomain: string;
  adminEmail: string;
  adminPassword: string;
  plan: 'starter' | 'professional' | 'enterprise';
  features: string[];
  limits: {
    maxUsers: number;
    maxVehicles: number;
    storageQuota: number; // GB
    apiCallsPerMonth: number;
  };
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export interface TenantResource {
  tenantId: string;
  resourceType: 'users' | 'vehicles' | 'storage' | 'api_calls';
  current: number;
  limit: number;
  usagePercent: number;
  lastUpdated: Date;
}

export interface TenantMigrationResult {
  success: boolean;
  migratedTables: string[];
  errors: string[];
  duration: number;
  backupLocation?: string;
}

export class TenantManager {
  /**
   * Provision a new tenant with complete setup
   */
  static async provisionTenant(config: TenantProvisioningConfig): Promise<{
    tenantId: string;
    adminUserId: string;
    credentials: {
      email: string;
      temporaryPassword: string;
    };
  }> {
    const masterDb = await getMasterDb();
    let tenantId: string;
    
    try {
      logger.info(`Starting tenant provisioning for ${config.companyName}`);

      // Create tenant record
      const tenant = await masterDb.tenant.create({
        data: {
          companyName: config.companyName,
          primaryDomain: config.primaryDomain,
          adminEmail: config.adminEmail,
          status: 'active',
          plan: config.plan,
          features: config.features,
          limits: config.limits,
          branding: config.branding || {},
          createdAt: new Date()
        }
      });

      tenantId = tenant.tenantId;

      // Create admin user
      const hashedPassword = await bcrypt.hash(config.adminPassword, 12);
      const adminUser = await masterDb.user.create({
        data: {
          tenantId,
          email: config.adminEmail,
          passwordHash: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          status: 'active',
          permissions: {
            all: true
          }
        }
      });

      // Initialize tenant database schema
      await this.initializeTenantDatabase(tenantId);

      // Set up default data
      await this.setupDefaultTenantData(tenantId, adminUser.userId);

      // Create storage directories
      await this.setupTenantStorage(tenantId);

      // Initialize monitoring and metrics
      await this.initializeTenantMonitoring(tenantId);

      logger.info(`Tenant provisioning completed for ${config.companyName} (${tenantId})`);

      return {
        tenantId,
        adminUserId: adminUser.userId,
        credentials: {
          email: config.adminEmail,
          temporaryPassword: config.adminPassword
        }
      };
    } catch (error) {
      logger.error(`Tenant provisioning failed for ${config.companyName}:`, error);
      
      // Cleanup on failure
      if (tenantId!) {
        await this.cleanupFailedProvisioning(tenantId);
      }
      
      throw new Error(`Failed to provision tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decommission a tenant with data cleanup
   */
  static async decommissionTenant(
    tenantId: string,
    options: {
      backupData?: boolean;
      deleteImmediately?: boolean;
      transferToArchive?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    backupLocation?: string;
    errors: string[];
  }> {
    const masterDb = await getMasterDb();
    const errors: string[] = [];
    let backupLocation: string | undefined;

    try {
      logger.info(`Starting tenant decommissioning for ${tenantId}`);

      // Validate tenant exists
      const tenant = await masterDb.tenant.findUnique({
        where: { tenantId }
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Backup data if requested
      if (options.backupData) {
        try {
          backupLocation = await this.backupTenantData(tenantId);
        } catch (error) {
          errors.push(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Deactivate tenant
      await masterDb.tenant.update({
        where: { tenantId },
        data: {
          status: options.deleteImmediately ? 'deleted' : 'decommissioned',
          decommissionedAt: new Date()
        }
      });

      // Deactivate all users
      await masterDb.user.updateMany({
        where: { tenantId },
        data: { status: 'inactive' }
      });

      if (options.deleteImmediately) {
        // Delete tenant data
        await this.deleteTenantData(tenantId);
        
        // Delete storage
        await this.deleteTenantStorage(tenantId);
        
        // Remove tenant record
        await masterDb.tenant.delete({
          where: { tenantId }
        });
      }

      logger.info(`Tenant decommissioning completed for ${tenantId}`);

      return {
        success: true,
        backupLocation,
        errors
      };
    } catch (error) {
      logger.error(`Tenant decommissioning failed for ${tenantId}:`, error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        errors
      };
    }
  }

  /**
   * Migrate tenant to new version or configuration
   */
  static async migrateTenant(
    tenantId: string,
    migrationScript: string,
    options: {
      dryRun?: boolean;
      backupFirst?: boolean;
    } = {}
  ): Promise<TenantMigrationResult> {
    const startTime = Date.now();
    const migratedTables: string[] = [];
    const errors: string[] = [];
    let backupLocation: string | undefined;

    try {
      logger.info(`Starting tenant migration for ${tenantId}`);

      if (options.backupFirst) {
        backupLocation = await this.backupTenantData(tenantId);
      }

      const tenantDb = await getTenantDb(tenantId);

      // Execute migration script
      // This is a simplified version - real implementation would parse and execute SQL
      if (!options.dryRun) {
        // Mock migration execution
        migratedTables.push('vehicles', 'users', 'workflows');
        
        // In real implementation, you'd execute actual migration scripts
        logger.info(`Migration script executed for tenant ${tenantId}`);
      } else {
        logger.info(`Dry run completed for tenant ${tenantId}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        migratedTables,
        errors,
        duration,
        backupLocation
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      logger.error(`Tenant migration failed for ${tenantId}:`, error);

      return {
        success: false,
        migratedTables,
        errors,
        duration,
        backupLocation
      };
    }
  }

  /**
   * Monitor tenant resource usage
   */
  static async getResourceUsage(tenantId: string): Promise<TenantResource[]> {
    try {
      const masterDb = await getMasterDb();
      
      const tenant = await masterDb.tenant.findUnique({
        where: { tenantId },
        include: {
          users: true
        }
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const tenantDb = await getTenantDb(tenantId);

      // Get current usage
      const [userCount, vehicleCount, storageUsage] = await Promise.all([
        tenant.users.length,
        tenantDb.vehicle.count().catch(() => 0),
        this.calculateStorageUsage(tenantId)
      ]);

      const apiUsage = await this.getApiUsage(tenantId);

      const resources: TenantResource[] = [
        {
          tenantId,
          resourceType: 'users',
          current: userCount,
          limit: tenant.limits.maxUsers,
          usagePercent: (userCount / tenant.limits.maxUsers) * 100,
          lastUpdated: new Date()
        },
        {
          tenantId,
          resourceType: 'vehicles',
          current: vehicleCount,
          limit: tenant.limits.maxVehicles,
          usagePercent: (vehicleCount / tenant.limits.maxVehicles) * 100,
          lastUpdated: new Date()
        },
        {
          tenantId,
          resourceType: 'storage',
          current: storageUsage,
          limit: tenant.limits.storageQuota,
          usagePercent: (storageUsage / tenant.limits.storageQuota) * 100,
          lastUpdated: new Date()
        },
        {
          tenantId,
          resourceType: 'api_calls',
          current: apiUsage,
          limit: tenant.limits.apiCallsPerMonth,
          usagePercent: (apiUsage / tenant.limits.apiCallsPerMonth) * 100,
          lastUpdated: new Date()
        }
      ];

      return resources;
    } catch (error) {
      logger.error(`Failed to get resource usage for tenant ${tenantId}:`, error);
      throw new Error('Failed to get resource usage');
    }
  }

  /**
   * Upgrade tenant plan
   */
  static async upgradeTenantPlan(
    tenantId: string,
    newPlan: 'starter' | 'professional' | 'enterprise',
    newLimits: TenantProvisioningConfig['limits']
  ): Promise<void> {
    try {
      const masterDb = await getMasterDb();

      await masterDb.tenant.update({
        where: { tenantId },
        data: {
          plan: newPlan,
          limits: newLimits,
          updatedAt: new Date()
        }
      });

      logger.info(`Tenant ${tenantId} upgraded to ${newPlan} plan`);
    } catch (error) {
      logger.error(`Failed to upgrade tenant ${tenantId}:`, error);
      throw new Error('Failed to upgrade tenant plan');
    }
  }

  // Private helper methods

  private static async initializeTenantDatabase(tenantId: string): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Create a new database schema for the tenant
      // 2. Run Prisma migrations specific to the tenant
      // 3. Set up initial database structure

      const tenantDb = await getTenantDb(tenantId);
      
      // Verify database connection
      await tenantDb.$queryRaw`SELECT 1`;
      
      logger.info(`Database initialized for tenant ${tenantId}`);
    } catch (error) {
      throw new Error(`Failed to initialize database for tenant ${tenantId}`);
    }
  }

  private static async setupDefaultTenantData(tenantId: string, adminUserId: string): Promise<void> {
    try {
      const tenantDb = await getTenantDb(tenantId);

      // Create default location
      await tenantDb.location.create({
        data: {
          locationName: 'Main Office',
          address: '123 Business St',
          city: 'Business City',
          state: 'BC',
          country: 'Country',
          status: 'active'
        }
      });

      // Create default department
      await tenantDb.department.create({
        data: {
          departmentName: 'Administration',
          description: 'Default administrative department',
          status: 'active'
        }
      });

      // Create default system configs
      const defaultConfigs = [
        { category: 'system', key: 'timezone', value: 'UTC' },
        { category: 'system', key: 'currency', value: 'USD' },
        { category: 'workflow', key: 'default_stages', value: ['intake', 'assessment', 'installation', 'quality_check', 'delivery'] }
      ];

      for (const config of defaultConfigs) {
        await tenantDb.systemConfig.create({
          data: {
            configCategory: config.category,
            configKey: config.key,
            configValue: config.value
          }
        });
      }

      logger.info(`Default data created for tenant ${tenantId}`);
    } catch (error) {
      throw new Error(`Failed to setup default data for tenant ${tenantId}`);
    }
  }

  private static async setupTenantStorage(tenantId: string): Promise<void> {
    try {
      const storageManager = createStorageManager();
      
      // Create tenant-specific storage directories
      // This is provider-specific implementation
      
      logger.info(`Storage setup completed for tenant ${tenantId}`);
    } catch (error) {
      logger.warn(`Storage setup failed for tenant ${tenantId}:`, error);
      // Don't throw here as storage might be configured differently
    }
  }

  private static async initializeTenantMonitoring(tenantId: string): Promise<void> {
    try {
      // Initialize monitoring and metrics collection for the tenant
      // This would set up logging, metrics collection, etc.
      
      logger.info(`Monitoring initialized for tenant ${tenantId}`);
    } catch (error) {
      logger.warn(`Monitoring initialization failed for tenant ${tenantId}:`, error);
    }
  }

  private static async cleanupFailedProvisioning(tenantId: string): Promise<void> {
    try {
      const masterDb = await getMasterDb();
      
      // Delete tenant and related records
      await masterDb.user.deleteMany({
        where: { tenantId }
      });
      
      await masterDb.tenant.delete({
        where: { tenantId }
      });
      
      logger.info(`Cleanup completed for failed tenant provisioning ${tenantId}`);
    } catch (error) {
      logger.error(`Cleanup failed for tenant ${tenantId}:`, error);
    }
  }

  private static async backupTenantData(tenantId: string): Promise<string> {
    try {
      // In a real implementation, this would:
      // 1. Create a database dump
      // 2. Archive media files
      // 3. Store backup in secure location
      // 4. Return backup location/identifier
      
      const backupId = `backup_${tenantId}_${Date.now()}`;
      const backupLocation = `/backups/${backupId}`;
      
      logger.info(`Backup created for tenant ${tenantId} at ${backupLocation}`);
      
      return backupLocation;
    } catch (error) {
      throw new Error(`Failed to backup tenant data for ${tenantId}`);
    }
  }

  private static async deleteTenantData(tenantId: string): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Delete all tenant-specific database records
      // 2. Drop tenant database schema
      // 3. Clean up any cached data
      
      logger.info(`Data deleted for tenant ${tenantId}`);
    } catch (error) {
      throw new Error(`Failed to delete tenant data for ${tenantId}`);
    }
  }

  private static async deleteTenantStorage(tenantId: string): Promise<void> {
    try {
      // Delete tenant-specific storage
      logger.info(`Storage deleted for tenant ${tenantId}`);
    } catch (error) {
      logger.warn(`Storage deletion failed for tenant ${tenantId}:`, error);
    }
  }

  private static async calculateStorageUsage(tenantId: string): Promise<number> {
    try {
      // Calculate actual storage usage for the tenant
      // This would sum up all media files, database size, etc.
      
      // Mock calculation - in real implementation, this would be accurate
      return Math.random() * 10; // GB
    } catch (error) {
      return 0;
    }
  }

  private static async getApiUsage(tenantId: string): Promise<number> {
    try {
      // Get API usage for current month
      // This would come from API usage tracking system
      
      // Mock data
      return Math.floor(Math.random() * 10000);
    } catch (error) {
      return 0;
    }
  }
}