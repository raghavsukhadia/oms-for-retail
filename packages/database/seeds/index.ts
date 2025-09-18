import { PrismaClient } from '../generated/master-client';
import path from 'path';

// Load environment variables from .env file in project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const masterPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MASTER_DATABASE_URL
    }
  }
});

async function main() {
  console.log('🌱 Seeding master database...');

  try {
    // Create demo tenant
    const demoTenant = await masterPrisma.tenant.upsert({
      where: { subdomain: 'demo' },
      update: {},
      create: {
        tenantName: 'Demo Company Ltd',
        subdomain: 'demo',
        databaseUrl: process.env.DEMO_TENANT_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/omsms_tenant_demo',
        subscriptionTier: 'professional',
        status: 'active',
        settings: {
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          theme: 'light',
          language: 'en'
        },
        features: {
          maxVehicles: 1000,
          maxUsers: 50,
          storageGB: 100,
          customWorkflows: true,
          apiAccess: true,
          prioritySupport: true
        }
      }
    });

    console.log('✅ Demo tenant created:', {
      id: demoTenant.tenantId,
      name: demoTenant.tenantName,
      subdomain: demoTenant.subdomain,
      tier: demoTenant.subscriptionTier
    });

    // Create test tenant
    const testTenant = await masterPrisma.tenant.upsert({
      where: { subdomain: 'test' },
      update: {},
      create: {
        tenantName: 'Test Company',
        subdomain: 'test',
        databaseUrl: process.env.TEST_TENANT_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/omsms_tenant_test',
        subscriptionTier: 'starter',
        status: 'active',
        settings: {
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'DD/MM/YYYY',
          theme: 'light',
          language: 'en'
        },
        features: {
          maxVehicles: 100,
          maxUsers: 10,
          storageGB: 10,
          customWorkflows: false,
          apiAccess: false,
          prioritySupport: false
        }
      }
    });

    console.log('✅ Test tenant created:', {
      id: testTenant.tenantId,
      name: testTenant.tenantName,
      subdomain: testTenant.subdomain,
      tier: testTenant.subscriptionTier
    });

    // Create some sample analytics data
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    await masterPrisma.tenantAnalytics.createMany({
      data: [
        {
          tenantId: demoTenant.tenantId,
          datePeriod: today,
          totalVehicles: 25,
          totalUsers: 8,
          activeWorkflows: 12,
          storageUsedGb: 2.5,
          apiCallsCount: 1250,
          revenueAmount: 299.00,
          metrics: {
            completedWorkflows: 13,
            averageCompletionTime: 3.2,
            customerSatisfaction: 4.7
          }
        },
        {
          tenantId: testTenant.tenantId,
          datePeriod: today,
          totalVehicles: 5,
          totalUsers: 3,
          activeWorkflows: 2,
          storageUsedGb: 0.5,
          apiCallsCount: 150,
          revenueAmount: 99.00,
          metrics: {
            completedWorkflows: 3,
            averageCompletionTime: 2.8,
            customerSatisfaction: 4.2
          }
        }
      ],
      skipDuplicates: true
    });

    console.log('✅ Sample analytics data created');

    console.log('');
    console.log('📊 Seeding completed successfully!');
    console.log('');
    console.log('🎯 Demo tenant details:');
    console.log(`  - Access URL: http://demo.localhost:3000`);
    console.log(`  - Tenant ID: ${demoTenant.tenantId}`);
    console.log(`  - Database: ${demoTenant.databaseUrl}`);
    console.log('');
    console.log('🧪 Test tenant details:');
    console.log(`  - Access URL: http://test.localhost:3000`);
    console.log(`  - Tenant ID: ${testTenant.tenantId}`);
    console.log(`  - Database: ${testTenant.databaseUrl}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding process failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await masterPrisma.$disconnect();
  });