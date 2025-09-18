import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import {
  ApiResponse
} from '@omsms/shared';

// Validation schemas
const configSchema = z.object({
  configCategory: z.string().min(1),
  configKey: z.string().min(1),
  configValue: z.any(),
  description: z.string().optional()
});

const bulkConfigSchema = z.array(configSchema);

const updateConfigSchema = z.object({
  configValue: z.any(),
  description: z.string().optional()
});

// Predefined configuration categories and their schemas
const CONFIG_SCHEMAS = {
  general: z.object({
    companyName: z.string().optional(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.string().optional(),
    language: z.string().optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional()
  }),
  
  workflow: z.object({
    autoAssignVehicles: z.boolean().optional(),
    defaultVehicleStatus: z.string().optional(),
    enableQualityCheck: z.boolean().optional(),
    requireSupervisorApproval: z.boolean().optional(),
    notificationChannels: z.array(z.string()).optional()
  }),
  
  notification: z.object({
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    webhookUrl: z.string().url().optional(),
    notifyOnStatusChange: z.boolean().optional(),
    notifyOnDelayedDelivery: z.boolean().optional()
  }),
  
  integration: z.object({
    enableApiAccess: z.boolean().optional(),
    webhookSecretKey: z.string().optional(),
    externalSystemUrl: z.string().url().optional(),
    syncEnabled: z.boolean().optional(),
    syncInterval: z.number().min(5).optional()
  }),
  
  security: z.object({
    sessionTimeout: z.number().min(5).max(1440).optional(), // 5 min to 24 hours
    passwordMinLength: z.number().min(6).max(128).optional(),
    enableTwoFactor: z.boolean().optional(),
    allowedFileTypes: z.array(z.string()).optional(),
    maxFileSize: z.number().min(1).optional()
  }),
  
  business: z.object({
    defaultMarkup: z.number().min(0).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    invoicePrefix: z.string().optional(),
    invoiceNumbering: z.enum(['sequential', 'random']).optional(),
    paymentTerms: z.string().optional()
  })
};

export class ConfigController {
  /**
   * Get all configurations
   */
  static async getConfigurations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { category } = req.query;
      const tenantDb = await getTenantDb(req.tenantId);

      const where: any = {};
      if (category) where.configCategory = category;

      const configs = await tenantDb.systemConfig.findMany({
        where,
        orderBy: [
          { configCategory: 'asc' },
          { configKey: 'asc' }
        ]
      });

      // Group configurations by category
      const groupedConfigs = configs.reduce((acc, config) => {
        if (!acc[config.configCategory]) {
          acc[config.configCategory] = {};
        }
        acc[config.configCategory][config.configKey] = {
          value: config.configValue,
          description: config.description,
          updatedAt: config.updatedAt
        };
        return acc;
      }, {} as Record<string, any>);

      const response: ApiResponse<typeof groupedConfigs> = {
        success: true,
        data: groupedConfigs
      };

      res.json(response);
    } catch (error) {
      console.error('Get configurations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configurations'
      } as ApiResponse);
    }
  }

  /**
   * Get configuration by category and key
   */
  static async getConfiguration(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { category, key } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      const config = await tenantDb.systemConfig.findUnique({
        where: {
          configCategory_configKey: {
            configCategory: category,
            configKey: key
          }
        }
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'Configuration not found'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<typeof config> = {
        success: true,
        data: config
      };

      res.json(response);
    } catch (error) {
      console.error('Get configuration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration'
      } as ApiResponse);
    }
  }

  /**
   * Set configuration value
   */
  static async setConfiguration(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { category, key } = req.params;
      const body = updateConfigSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Validate configuration value against schema if available
      if (CONFIG_SCHEMAS[category as keyof typeof CONFIG_SCHEMAS]) {
        const categorySchema = CONFIG_SCHEMAS[category as keyof typeof CONFIG_SCHEMAS];
        const validationResult = categorySchema.safeParse({ [key]: body.configValue });
        
        if (!validationResult.success) {
          res.status(400).json({
            success: false,
            error: 'Invalid configuration value',
            details: validationResult.error.errors
          } as ApiResponse);
          return;
        }
      }

      // Upsert configuration
      const config = await tenantDb.systemConfig.upsert({
        where: {
          configCategory_configKey: {
            configCategory: category,
            configKey: key
          }
        },
        update: {
          configValue: body.configValue,
          description: body.description
        },
        create: {
          configCategory: category,
          configKey: key,
          configValue: body.configValue,
          description: body.description
        }
      });

      const response: ApiResponse<typeof config> = {
        success: true,
        data: config,
        message: 'Configuration updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Set configuration error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to set configuration'
      } as ApiResponse);
    }
  }

  /**
   * Bulk update configurations
   */
  static async bulkUpdateConfigurations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = bulkConfigSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      // Validate all configurations
      for (const config of body) {
        if (CONFIG_SCHEMAS[config.configCategory as keyof typeof CONFIG_SCHEMAS]) {
          const categorySchema = CONFIG_SCHEMAS[config.configCategory as keyof typeof CONFIG_SCHEMAS];
          const validationResult = categorySchema.safeParse({ [config.configKey]: config.configValue });
          
          if (!validationResult.success) {
            res.status(400).json({
              success: false,
              error: `Invalid value for ${config.configCategory}.${config.configKey}`,
              details: validationResult.error.errors
            } as ApiResponse);
            return;
          }
        }
      }

      // Update all configurations in a transaction
      const results = await tenantDb.$transaction(
        body.map(config => 
          tenantDb.systemConfig.upsert({
            where: {
              configCategory_configKey: {
                configCategory: config.configCategory,
                configKey: config.configKey
              }
            },
            update: {
              configValue: config.configValue,
              description: config.description
            },
            create: {
              configCategory: config.configCategory,
              configKey: config.configKey,
              configValue: config.configValue,
              description: config.description
            }
          })
        )
      );

      const response: ApiResponse<typeof results> = {
        success: true,
        data: results,
        message: 'Configurations updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Bulk update configurations error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update configurations'
      } as ApiResponse);
    }
  }

  /**
   * Delete configuration
   */
  static async deleteConfiguration(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { category, key } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      await tenantDb.systemConfig.delete({
        where: {
          configCategory_configKey: {
            configCategory: category,
            configKey: key
          }
        }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Configuration deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete configuration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete configuration'
      } as ApiResponse);
    }
  }

  /**
   * Get configuration schema for a category
   */
  static async getConfigurationSchema(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      
      const schema = CONFIG_SCHEMAS[category as keyof typeof CONFIG_SCHEMAS];
      
      if (!schema) {
        res.status(404).json({
          success: false,
          error: 'Configuration category not found'
        } as ApiResponse);
        return;
      }

      // Convert Zod schema to JSON schema format for frontend
      const jsonSchema = {
        type: 'object',
        properties: {},
        category: category
      };

      const response: ApiResponse<typeof jsonSchema> = {
        success: true,
        data: jsonSchema
      };

      res.json(response);
    } catch (error) {
      console.error('Get configuration schema error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration schema'
      } as ApiResponse);
    }
  }

  /**
   * Reset configuration category to defaults
   */
  static async resetCategoryToDefaults(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { category } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Get default values for the category
      const defaults = getDefaultConfigurations(category);

      if (!defaults || Object.keys(defaults).length === 0) {
        res.status(400).json({
          success: false,
          error: 'No default configurations available for this category'
        } as ApiResponse);
        return;
      }

      // Delete existing configurations for the category
      await tenantDb.systemConfig.deleteMany({
        where: { configCategory: category }
      });

      // Create default configurations
      const defaultConfigs = Object.entries(defaults).map(([key, value]) => ({
        configCategory: category,
        configKey: key,
        configValue: value,
        description: `Default ${key} configuration`
      }));

      await tenantDb.systemConfig.createMany({
        data: defaultConfigs
      });

      const response: ApiResponse = {
        success: true,
        message: 'Configuration category reset to defaults'
      };

      res.json(response);
    } catch (error) {
      console.error('Reset category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset configuration category'
      } as ApiResponse);
    }
  }
}

/**
 * Get default configurations for a category
 */
function getDefaultConfigurations(category: string): Record<string, any> | null {
  const defaults: Record<string, Record<string, any>> = {
    general: {
      timezone: 'UTC',
      currency: 'USD',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      language: 'en',
      theme: 'light'
    },
    
    workflow: {
      autoAssignVehicles: false,
      defaultVehicleStatus: 'pending',
      enableQualityCheck: true,
      requireSupervisorApproval: false,
      notificationChannels: ['email']
    },
    
    notification: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      notifyOnStatusChange: true,
      notifyOnDelayedDelivery: true
    },
    
    integration: {
      enableApiAccess: false,
      syncEnabled: false,
      syncInterval: 60
    },
    
    security: {
      sessionTimeout: 480, // 8 hours
      passwordMinLength: 8,
      enableTwoFactor: false,
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      maxFileSize: 10485760 // 10MB
    },
    
    business: {
      defaultMarkup: 0,
      taxRate: 0,
      invoicePrefix: 'INV',
      invoiceNumbering: 'sequential',
      paymentTerms: 'Net 30'
    }
  };

  return defaults[category] || null;
}