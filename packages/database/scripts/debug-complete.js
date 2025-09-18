const { PrismaClient: MasterClient } = require('../generated/master-client');
const { PrismaClient: TenantClient } = require('../generated/tenant-client');
const path = require('path');

// Load environment variables from .env file in project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function debugComplete() {
  console.log('🔍 COMPLETE DEBUG ANALYSIS');
  console.log('='.repeat(50));
  
  // 1. Check Master Database
  console.log('\n1️⃣ MASTER DATABASE CHECK');
  console.log('Master DB URL:', process.env.MASTER_DATABASE_URL);
  
  const masterPrisma = new MasterClient({
    datasources: {
      db: { url: process.env.MASTER_DATABASE_URL }
    }
  });

  try {
    // List all tenants
    const tenants = await masterPrisma.tenant.findMany();
    console.log(`   Found ${tenants.length} tenants:`);
    
    tenants.forEach((tenant, index) => {
      console.log(`   ${index + 1}. Name: ${tenant.tenantName}`);
      console.log(`      ID: ${tenant.tenantId}`);
      console.log(`      Subdomain: "${tenant.subdomain}"`);
      console.log(`      Status: ${tenant.status}`);
      console.log(`      Database: ${tenant.databaseUrl}`);
      console.log('');
    });

    // Specifically check for "demo" subdomain
    console.log('\n2️⃣ DEMO TENANT LOOKUP TEST');
    const demoTenant = await masterPrisma.tenant.findUnique({
      where: { subdomain: 'demo' }
    });
    
    if (demoTenant) {
      console.log('   ✅ Found demo tenant:');
      console.log(`      ID: ${demoTenant.tenantId}`);
      console.log(`      Name: ${demoTenant.tenantName}`);
      console.log(`      Database: ${demoTenant.databaseUrl}`);
      console.log(`      Status: ${demoTenant.status}`);
      
      // 3. Check Demo Tenant Database
      console.log('\n3️⃣ DEMO TENANT DATABASE CHECK');
      const tenantPrisma = new TenantClient({
        datasources: {
          db: { url: demoTenant.databaseUrl }
        }
      });
      
      try {
        await tenantPrisma.$connect();
        console.log('   ✅ Successfully connected to demo tenant database');
        
        // Check for admin user
        const adminUser = await tenantPrisma.user.findUnique({
          where: { email: 'admin@demo.com' },
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true
          }
        });
        
        if (adminUser) {
          console.log('   ✅ Found admin user:');
          console.log(`      ID: ${adminUser.userId}`);
          console.log(`      Email: ${adminUser.email}`);
          console.log(`      Name: ${adminUser.firstName} ${adminUser.lastName}`);
          console.log(`      Role: ${adminUser.role}`);
          console.log(`      Status: ${adminUser.status}`);
        } else {
          console.log('   ❌ Admin user not found in demo tenant database');
        }
        
        // Count total users
        const userCount = await tenantPrisma.user.count();
        console.log(`   📊 Total users in demo tenant: ${userCount}`);
        
        await tenantPrisma.$disconnect();
        
      } catch (error) {
        console.log('   ❌ Failed to connect to demo tenant database:', error.message);
      }
      
    } else {
      console.log('   ❌ Demo tenant NOT found with subdomain "demo"');
    }

    // 4. Test all possible tenant lookups
    console.log('\n4️⃣ TENANT LOOKUP TESTS');
    const testSubdomains = ['demo', 'localhost:3001', 'localhost', 'test'];
    
    for (const subdomain of testSubdomains) {
      const tenant = await masterPrisma.tenant.findUnique({
        where: { subdomain }
      });
      
      if (tenant) {
        console.log(`   ✅ Found tenant for subdomain "${subdomain}": ${tenant.tenantName}`);
      } else {
        console.log(`   ❌ No tenant found for subdomain "${subdomain}"`);
      }
    }

  } catch (error) {
    console.error('❌ Master database error:', error);
  } finally {
    await masterPrisma.$disconnect();
  }
  
  console.log('\n5️⃣ ENVIRONMENT CHECK');
  console.log('   MASTER_DATABASE_URL:', process.env.MASTER_DATABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('   DEMO_TENANT_DATABASE_URL:', process.env.DEMO_TENANT_DATABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
  
  console.log('\n🎯 SUMMARY');
  console.log('If the demo tenant exists and admin user exists, the issue is likely in:');
  console.log('1. Tenant extraction middleware not setting req.tenantId correctly');
  console.log('2. getTenantDb function receiving wrong tenantId');
  console.log('3. Cached tenant clients with wrong keys');
}

debugComplete()
  .catch(e => {
    console.error('❌ Debug failed:', e);
    process.exit(1);
  });