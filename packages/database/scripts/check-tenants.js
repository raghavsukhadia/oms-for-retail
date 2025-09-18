const { PrismaClient } = require('../generated/master-client');
const path = require('path');

// Load environment variables from .env file in project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function checkTenants() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.MASTER_DATABASE_URL
      }
    }
  });

  try {
    console.log('🔍 Checking tenants in master database...');
    const tenants = await prisma.tenant.findMany();
    
    if (tenants.length === 0) {
      console.log('❌ No tenants found in master database');
    } else {
      console.log(`✅ Found ${tenants.length} tenant(s):`);
      tenants.forEach((tenant, index) => {
        console.log(`${index + 1}. ${tenant.tenantName}`);
        console.log(`   - ID: ${tenant.tenantId}`);
        console.log(`   - Subdomain: ${tenant.subdomain}`);
        console.log(`   - Status: ${tenant.status}`);
        console.log(`   - Database URL: ${tenant.databaseUrl}`);
        console.log('');
      });
    }
    
    // Check specifically for demo tenant
    const demoTenant = await prisma.tenant.findUnique({
      where: { subdomain: 'demo' }
    });
    
    if (demoTenant) {
      console.log('✅ Demo tenant found with subdomain "demo"');
    } else {
      console.log('❌ Demo tenant NOT found with subdomain "demo"');
    }
    
  } catch (error) {
    console.error('❌ Error checking tenants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenants();