const { PrismaClient } = require('../generated/tenant-client');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function addPaymentsTable() {
  console.log('🔧 Adding payments table to existing tenant database...');
  
  // Connect to the rscars7 tenant database
  const tenantClient = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:password@localhost:5432/omsms_tenant_rscars7'
      }
    }
  });

  try {
    // Check if payments table already exists
    const tableExists = await tenantClient.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payments'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log('✅ Payments table already exists');
      return;
    }

    console.log('📋 Creating payments table...');
    
    // Create payments table
    await tenantClient.$executeRawUnsafe(`
      CREATE TABLE "payments" (
        "payment_id" TEXT NOT NULL,
        "vehicle_id" TEXT NOT NULL,
        "amount" DECIMAL(10,2) NOT NULL,
        "payment_method" TEXT NOT NULL DEFAULT 'cash',
        "payment_date" TIMESTAMP(3) NOT NULL,
        "invoice_number" TEXT,
        "invoice_date" TIMESTAMP(3),
        "payment_status" TEXT NOT NULL DEFAULT 'pending',
        "notes" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        "created_by" TEXT,
        "updated_by" TEXT,
        CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
      )
    `);

    console.log('🔗 Adding foreign key constraints...');
    
    // Add foreign key constraints
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "payments" ADD CONSTRAINT "payments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await tenantClient.$executeRawUnsafe(`ALTER TABLE "payments" ADD CONSTRAINT "payments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);

    console.log('✅ Payments table created successfully!');
    console.log('🎉 Tenant rscars7 now has complete schema with payments support');
    
  } catch (error) {
    console.error('❌ Error adding payments table:', error.message);
    throw error;
  } finally {
    await tenantClient.$disconnect();
  }
}

// Run the script
addPaymentsTable()
  .then(() => {
    console.log('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
