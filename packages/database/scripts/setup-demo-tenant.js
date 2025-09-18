const { PrismaClient } = require('../generated/master-client');
const path = require('path');

// Load environment variables from .env file in project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function setupDemoTenant() {
  console.log('🏢 Setting up demo tenant in master database...');

  const masterPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.MASTER_DATABASE_URL
      }
    }
  });

  try {
    // Demo tenant database URL (same as used in seed-tenant-data.js)
    const demoTenantDatabaseUrl = process.env.DEMO_TENANT_DATABASE_URL || 
      'postgresql://postgres:password@localhost:5432/omsms_tenant_demo';

    // Check if demo tenant already exists
    let demoTenant = await masterPrisma.tenant.findUnique({
      where: { subdomain: 'demo' }
    });

    if (demoTenant) {
      console.log('✅ Demo tenant already exists in master database');
      console.log(`   Tenant ID: ${demoTenant.tenantId}`);
      console.log(`   Subdomain: ${demoTenant.subdomain}`);
      console.log(`   Status: ${demoTenant.status}`);
    } else {
      // Create demo tenant record in master database
      demoTenant = await masterPrisma.tenant.create({
        data: {
          tenantName: 'Demo Organization',
          subdomain: 'demo',
          databaseUrl: demoTenantDatabaseUrl,
          subscriptionTier: 'enterprise',
          status: 'active',
          settings: {
            timezone: 'Asia/Kolkata',
            currency: 'INR',
            language: 'en',
            features: {
              analytics: true,
              reports: true,
              workflows: true,
              notifications: true
            }
          },
          features: {
            maxUsers: 100,
            maxVehicles: 1000,
            storageGb: 50,
            apiCallsPerMonth: 100000
          }
        }
      });

      console.log('✅ Demo tenant created successfully in master database!');
      console.log(`   Tenant ID: ${demoTenant.tenantId}`);
      console.log(`   Subdomain: ${demoTenant.subdomain}`);
      console.log(`   Database URL: ${demoTenant.databaseUrl}`);
    }

    console.log('');
    console.log('🎉 Demo tenant setup completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('  1. Make sure tenant database is seeded: npm run seed:tenant');
    console.log('  2. Start development server: npm run dev');
    console.log('  3. Access: http://localhost:3000 or http://demo.localhost:3000');
    console.log('  4. Login with: admin@demo.com / admin123');
    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('  - If you still get "Tenant not found" errors, check:');
    console.log('    * MASTER_DATABASE_URL is set correctly in .env');
    console.log('    * PostgreSQL is running');
    console.log('    * Master database schema is up to date');

  } catch (error) {
    console.error('❌ Demo tenant setup failed:', error);
    
    if (error.code === 'P2002') {
      console.log('💡 Subdomain "demo" might already exist. Try deleting it first or use a different subdomain.');
    } else if (error.message.includes('connect')) {
      console.log('💡 Cannot connect to master database. Check your MASTER_DATABASE_URL and ensure PostgreSQL is running.');
    }
    
    throw error;
  } finally {
    await masterPrisma.$disconnect();
  }
}

setupDemoTenant()
  .catch((e) => {
    console.error('❌ Demo tenant setup process failed:', e);
    process.exit(1);
  });