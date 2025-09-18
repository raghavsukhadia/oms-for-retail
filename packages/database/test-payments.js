const { PrismaClient } = require('./generated/tenant-client');

async function testPaymentsTable() {
  console.log('🔍 Testing payments table access...');
  
  const client = new PrismaClient({
    datasources: { 
      db: { 
        url: 'postgresql://postgres:password@localhost:5432/omsms_tenant_rscars7' 
      } 
    }
  });

  try {
    // Test if we can query the payments table
    const payments = await client.payment.findMany({ take: 1 });
    console.log('✅ Payments table accessible, found:', payments.length, 'records');
    
    // Test if we can check table structure
    const tableInfo = await client.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Payments table structure:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Error accessing payments table:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.$disconnect();
  }
}

testPaymentsTable();
