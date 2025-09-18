const { PrismaClient } = require('../generated/tenant-client');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file in project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function seedOrganizationData() {
  console.log('🏢 Seeding organization data...');

  // Use demo tenant database by default, or allow override
  const tenantDatabaseUrl = process.env.DEMO_TENANT_DATABASE_URL || 
    'postgresql://postgres:password@localhost:5432/omsms_tenant_demo';

  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: tenantDatabaseUrl
      }
    }
  });

  try {
    // Check if organization data already exists
    const existingConfig = await tenantPrisma.systemConfig.findUnique({
      where: {
        configCategory_configKey: {
          configCategory: 'organization',
          configKey: 'company_info'
        }
      }
    });

    // Check for existing logo files
    const logoDir = path.join(__dirname, '../../backend/uploads/logos/demo');
    let logoUrl = null;
    
    if (fs.existsSync(logoDir)) {
      const logoFiles = fs.readdirSync(logoDir).filter(file => 
        file.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );
      
      if (logoFiles.length > 0) {
        // Use the first logo file found
        logoUrl = `http://localhost:3001/uploads/logos/demo/${logoFiles[0]}`;
        console.log(`📸 Found existing logo: ${logoFiles[0]}`);
      }
    }

    const organizationData = {
      companyName: 'Sunkool',
      logo: logoUrl,
      address: {
        street: '123 Business Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400001'
      },
      contactInfo: {
        phone: '+91 98765 43210',
        email: 'contact@sunkool.com',
        website: 'https://www.sunkool.com'
      },
      gstDetails: {
        gstNumber: '27AAAAA0000A1Z5',
        panNumber: 'AAAAA0000A',
        registrationDate: '2020-01-01'
      },
      businessSettings: {
        businessType: 'Private Limited',
        establishedYear: 2020,
        licenseNumber: 'LIC123456789',
        certifications: ['ISO 9001:2015', 'ISO 14001:2015']
      }
    };

    if (existingConfig) {
      // Update existing configuration
      await tenantPrisma.systemConfig.update({
        where: {
          configCategory_configKey: {
            configCategory: 'organization',
            configKey: 'company_info'
          }
        },
        data: {
          configValue: organizationData,
          updatedAt: new Date()
        }
      });
      console.log('✅ Organization data updated successfully!');
    } else {
      // Create new configuration
      await tenantPrisma.systemConfig.create({
        data: {
          configCategory: 'organization',
          configKey: 'company_info',
          configValue: organizationData,
          description: 'Organization company information'
        }
      });
      console.log('✅ Organization data created successfully!');
    }

    // Also create branding configuration
    const brandingData = {
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b',
      accentColor: '#10b981',
      logoUrl: logoUrl,
      faviconUrl: null
    };

    const existingBranding = await tenantPrisma.systemConfig.findUnique({
      where: {
        configCategory_configKey: {
          configCategory: 'organization',
          configKey: 'branding'
        }
      }
    });

    if (existingBranding) {
      await tenantPrisma.systemConfig.update({
        where: {
          configCategory_configKey: {
            configCategory: 'organization',
            configKey: 'branding'
          }
        },
        data: {
          configValue: brandingData,
          updatedAt: new Date()
        }
      });
    } else {
      await tenantPrisma.systemConfig.create({
        data: {
          configCategory: 'organization',
          configKey: 'branding',
          configValue: brandingData,
          description: 'Organization branding settings'
        }
      });
    }

    console.log('✅ Branding data configured successfully!');
    console.log('');
    console.log('🎉 Organization data seeding completed!');
    console.log('');
    console.log('📋 Organization Details:');
    console.log(`  Company Name: ${organizationData.companyName}`);
    console.log(`  Logo: ${logoUrl || 'No logo set'}`);
    console.log(`  Address: ${organizationData.address.street}, ${organizationData.address.city}`);
    console.log(`  Contact: ${organizationData.contactInfo.email}`);
    console.log('');

  } catch (error) {
    console.error('❌ Organization data seeding failed:', error);
    throw error;
  } finally {
    await tenantPrisma.$disconnect();
  }
}

seedOrganizationData()
  .catch((e) => {
    console.error('❌ Organization seeding process failed:', e);
    process.exit(1);
  });
