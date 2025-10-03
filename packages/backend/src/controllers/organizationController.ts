import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantDb } from '../lib/database';
import { ApiResponse } from '@omsms/shared';
import { config } from '../config/environment';

// Validation schemas
const organizationSettingsSchema = z.object({
  companyName: z.string().max(255),
  logo: z.string().nullable().optional(),
  address: z.object({
    street: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
  }).optional(),
  contactInfo: z.object({
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    website: z.string().url().nullable().optional(),
  }).optional(),
  gstDetails: z.object({
    gstNumber: z.string().nullable().optional(),
    panNumber: z.string().nullable().optional(),
    registrationDate: z.string().nullable().optional(),
  }).optional(),
  bankDetails: z.array(z.object({
    id: z.string().optional(),
    bankName: z.string().min(1),
    accountNumber: z.string().min(1),
    ifscCode: z.string().min(1),
    accountHolderName: z.string().min(1),
    accountType: z.enum(['savings', 'current', 'cc', 'od']),
    branchName: z.string().nullable().optional(),
    isDefault: z.boolean().default(false),
  })).optional(),
  qrCodes: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    type: z.enum(['payment', 'contact', 'website', 'custom']),
    content: z.string().min(1),
    description: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
  })).optional(),
  branding: z.object({
    primaryColor: z.string().nullable().optional(),
    secondaryColor: z.string().nullable().optional(),
    accentColor: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    faviconUrl: z.string().nullable().optional(),
  }).optional(),
  businessSettings: z.object({
    businessType: z.string().nullable().optional(),
    establishedYear: z.number().nullable().optional(),
    licenseNumber: z.string().nullable().optional(),
    certifications: z.array(z.string()).optional(),
  }).optional(),
});

const updateOrganizationSchema = organizationSettingsSchema.partial();

export class OrganizationController {
  /**
   * Get organization settings
   */
  static async getOrganizationSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);

      // Get organization settings from system config
      const orgSettings = await tenantDb.systemConfig.findMany({
        where: {
          configCategory: 'organization'
        }
      });

      // Transform the config entries into a structured object
      const settings: any = {
        companyName: '',
        logo: null,
        address: {},
        contactInfo: {},
        gstDetails: {},
        bankDetails: [],
        qrCodes: [],
        branding: {},
        businessSettings: {},
      };

      orgSettings.forEach(config => {
        if (config.configKey === 'company_info') {
          const companyInfo = config.configValue as any;
          settings.companyName = companyInfo.companyName || '';
          settings.logo = companyInfo.logo || null;
          settings.address = companyInfo.address || {};
          settings.contactInfo = companyInfo.contactInfo || {};
          settings.gstDetails = companyInfo.gstDetails || {};
          settings.businessSettings = companyInfo.businessSettings || {};
        } else if (config.configKey === 'bank_details') {
          settings.bankDetails = config.configValue as any[] || [];
        } else if (config.configKey === 'qr_codes') {
          settings.qrCodes = config.configValue as any[] || [];
        } else if (config.configKey === 'branding') {
          settings.branding = config.configValue as any || {};
        }
      });

      const response: ApiResponse<typeof settings> = {
        success: true,
        data: settings
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching organization settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch organization settings'
      } as ApiResponse);
    }
  }

  /**
   * Update organization settings
   */
  static async updateOrganizationSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const body = updateOrganizationSchema.parse(req.body);
      const tenantDb = await getTenantDb(req.tenantId);

      console.log('Updating organization settings for tenant:', req.tenantId);
      console.log('Request body:', JSON.stringify(body, null, 2));

      // Prepare company info object
      const companyInfo: any = {};
      if (body.companyName !== undefined) companyInfo.companyName = body.companyName;
      if (body.logo !== undefined) companyInfo.logo = body.logo;
      if (body.address !== undefined) companyInfo.address = body.address;
      if (body.contactInfo !== undefined) companyInfo.contactInfo = body.contactInfo;
      if (body.gstDetails !== undefined) companyInfo.gstDetails = body.gstDetails;
      if (body.businessSettings !== undefined) companyInfo.businessSettings = body.businessSettings;

      // Update or create company info config
      if (Object.keys(companyInfo).length > 0) {
        console.log('Updating company info:', companyInfo);
        try {
          await tenantDb.systemConfig.upsert({
            where: {
              configCategory_configKey: {
                configCategory: 'organization',
                configKey: 'company_info'
              }
            },
            update: {
              configValue: companyInfo,
              updatedAt: new Date()
            },
            create: {
              configCategory: 'organization',
              configKey: 'company_info',
              configValue: companyInfo,
              description: 'Organization company information'
            }
          });
          console.log('Company info updated successfully');
        } catch (dbError) {
          console.error('Error updating company info:', dbError);
          throw dbError;
        }
      }

      // Update bank details if provided
      if (body.bankDetails !== undefined) {
        console.log('Updating bank details:', body.bankDetails);
        try {
          // Generate IDs for new bank details
          const bankDetailsWithIds = body.bankDetails.map(bank => ({
            ...bank,
            id: bank.id || `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }));

          await tenantDb.systemConfig.upsert({
            where: {
              configCategory_configKey: {
                configCategory: 'organization',
                configKey: 'bank_details'
              }
            },
            update: {
              configValue: bankDetailsWithIds,
              updatedAt: new Date()
            },
            create: {
              configCategory: 'organization',
              configKey: 'bank_details',
              configValue: bankDetailsWithIds,
              description: 'Organization bank account details'
            }
          });
          console.log('Bank details updated successfully');
        } catch (dbError) {
          console.error('Error updating bank details:', dbError);
          throw dbError;
        }
      }

      // Update QR codes if provided
      if (body.qrCodes !== undefined) {
        console.log('Updating QR codes:', body.qrCodes);
        try {
          // Generate IDs for new QR codes
          const qrCodesWithIds = body.qrCodes.map(qr => ({
            ...qr,
            id: qr.id || `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }));

          await tenantDb.systemConfig.upsert({
            where: {
              configCategory_configKey: {
                configCategory: 'organization',
                configKey: 'qr_codes'
              }
            },
            update: {
              configValue: qrCodesWithIds,
              updatedAt: new Date()
            },
            create: {
              configCategory: 'organization',
              configKey: 'qr_codes',
              configValue: qrCodesWithIds,
              description: 'Organization QR codes'
            }
          });
          console.log('QR codes updated successfully');
        } catch (dbError) {
          console.error('Error updating QR codes:', dbError);
          throw dbError;
        }
      }

      // Update branding if provided
      if (body.branding !== undefined) {
        console.log('Updating branding:', body.branding);
        try {
          await tenantDb.systemConfig.upsert({
            where: {
              configCategory_configKey: {
                configCategory: 'organization',
                configKey: 'branding'
              }
            },
            update: {
              configValue: body.branding,
              updatedAt: new Date()
            },
            create: {
              configCategory: 'organization',
              configKey: 'branding',
              configValue: body.branding,
              description: 'Organization branding settings'
            }
          });
          console.log('Branding updated successfully');
        } catch (dbError) {
          console.error('Error updating branding:', dbError);
          throw dbError;
        }
      }

      console.log('All organization settings updated successfully');

      const response: ApiResponse = {
        success: true,
        message: 'Organization settings updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error in updateOrganizationSettings:', error);
      
      // Make sure we haven't already sent a response
      if (res.headersSent) {
        console.error('Headers already sent, cannot send error response');
        return;
      }

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update organization settings',
        message: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * Upload organization logo
   */
  static async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      console.log('Upload logo controller called');
      console.log('Tenant ID:', req.tenantId);
      console.log('File:', req.file);
      
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No logo file provided'
        } as ApiResponse);
        return;
      }

      const tenantDb = await getTenantDb(req.tenantId);
      
      // Generate logo URL based on environment
      let logoUrl: string;
      if (config.nodeEnv === 'production' || process.env.NODE_ENV === 'production') {
        // In production/Cloud Run, use the Cloud Run URL
        const cloudRunUrl = process.env.CLOUD_RUN_URL || 'https://omsms-backend-610250363653.asia-south1.run.app';
        logoUrl = `${cloudRunUrl}/uploads/logos/${req.tenantId}/${req.file.filename}`;
      } else {
        // In development, use local URL
        logoUrl = `${config.storage.local!.baseUrl}/logos/${req.tenantId}/${req.file.filename}`;
      }

      console.log('Generated logo URL:', logoUrl);

      // Get existing company info first
      const existingConfig = await tenantDb.systemConfig.findUnique({
        where: {
          configCategory_configKey: {
            configCategory: 'organization',
            configKey: 'company_info'
          }
        }
      });

      const existingData = existingConfig?.configValue as any || {};
      const updatedData = {
        ...existingData,
        logo: logoUrl
      };

      console.log('Updating company info with:', updatedData);

      // Update the organization settings with the new logo URL
      await tenantDb.systemConfig.upsert({
        where: {
          configCategory_configKey: {
            configCategory: 'organization',
            configKey: 'company_info'
          }
        },
        update: {
          configValue: updatedData,
          updatedAt: new Date()
        },
        create: {
          configCategory: 'organization',
          configKey: 'company_info',
          configValue: updatedData,
          description: 'Organization company information'
        }
      });

      const response: ApiResponse<{ logoUrl: string }> = {
        success: true,
        data: { logoUrl },
        message: 'Logo uploaded successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload logo'
      } as ApiResponse);
    }
  }

  /**
   * Delete bank details
   */
  static async deleteBankDetails(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { bankId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Get current bank details
      const config = await tenantDb.systemConfig.findUnique({
        where: {
          configCategory_configKey: {
            configCategory: 'organization',
            configKey: 'bank_details'
          }
        }
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'Bank details not found'
        } as ApiResponse);
        return;
      }

      const bankDetails = config.configValue as any[];
      const updatedBankDetails = bankDetails.filter(bank => bank.id !== bankId);

      await tenantDb.systemConfig.update({
        where: {
          configCategory_configKey: {
            configCategory: 'organization',
            configKey: 'bank_details'
          }
        },
        data: {
          configValue: updatedBankDetails,
          updatedAt: new Date()
        }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Bank details deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error deleting bank details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete bank details'
      } as ApiResponse);
    }
  }

  /**
   * Delete QR code
   */
  static async deleteQRCode(req: Request, res: Response): Promise<void> {
    try {
      if (!req.tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant identification required'
        } as ApiResponse);
        return;
      }

      const { qrId } = req.params;
      const tenantDb = await getTenantDb(req.tenantId);

      // Get current QR codes
      const config = await tenantDb.systemConfig.findUnique({
        where: {
          configCategory_configKey: {
            configCategory: 'organization',
            configKey: 'qr_codes'
          }
        }
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'QR codes not found'
        } as ApiResponse);
        return;
      }

      const qrCodes = config.configValue as any[];
      const updatedQRCodes = qrCodes.filter(qr => qr.id !== qrId);

      await tenantDb.systemConfig.update({
        where: {
          configCategory_configKey: {
            configCategory: 'organization',
            configKey: 'qr_codes'
          }
        },
        data: {
          configValue: updatedQRCodes,
          updatedAt: new Date()
        }
      });

      const response: ApiResponse = {
        success: true,
        message: 'QR code deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error deleting QR code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete QR code'
      } as ApiResponse);
    }
  }
}
