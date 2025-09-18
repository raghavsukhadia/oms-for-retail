const { PrismaClient } = require('./generated/tenant-client');

async function fixPaymentsTable() {
  console.log('🔧 Fixing payments table to match Prisma schema...');
  
  const client = new PrismaClient({
    datasources: { 
      db: { 
        url: 'postgresql://postgres:password@localhost:5432/omsms_tenant_rscars7' 
      } 
    }
  });

  try {
    // Drop the incorrectly created payments table
    console.log('🗑️ Dropping existing payments table...');
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS "payments" CASCADE`);
    
    // Create the payments table with the correct schema
    console.log('📋 Creating payments table with correct schema...');
    await client.$executeRawUnsafe(`
      CREATE TABLE "payments" (
        "payment_id" TEXT NOT NULL,
        "vehicle_id" TEXT NOT NULL,
        "amount" DECIMAL(10,2) NOT NULL,
        "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "outstanding_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "payment_method" TEXT,
        "transaction_id" TEXT,
        "reference_number" TEXT,
        "bank_details" JSONB DEFAULT '{}',
        "payment_date" TIMESTAMP(3),
        "due_date" TIMESTAMP(3),
        "status" TEXT NOT NULL DEFAULT 'pending',
        "notes" TEXT,
        "invoice_number" TEXT,
        "workflow_stage" TEXT,
        "created_by" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
      )
    `);

    // Create indexes
    console.log('📊 Creating indexes...');
    await client.$executeRawUnsafe(`CREATE INDEX "idx_payments_vehicle" ON "payments"("vehicle_id")`);
    await client.$executeRawUnsafe(`CREATE INDEX "idx_payments_status" ON "payments"("status")`);

    // Add foreign key constraints
    console.log('🔗 Adding foreign key constraints...');
    await client.$executeRawUnsafe(`ALTER TABLE "payments" ADD CONSTRAINT "payments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await client.$executeRawUnsafe(`ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE`);
    
    console.log('✅ Payments table fixed successfully!');
    
    // Test the table
    console.log('🧪 Testing payments table...');
    const payments = await client.payment.findMany({ take: 1 });
    console.log('✅ Payments table working! Found:', payments.length, 'records');
    
  } catch (error) {
    console.error('❌ Error fixing payments table:', error.message);
    throw error;
  } finally {
    await client.$disconnect();
  }
}

fixPaymentsTable();
