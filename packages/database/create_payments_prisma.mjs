import { PrismaClient as TenantPrismaClient } from './generated/tenant-client/index.js';

async function createPaymentsTable() {
  const prisma = new TenantPrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:password@localhost:5432/omsms_tenant_demo'
      }
    }
  });

  try {
    console.log('Creating payments table...');
    
    // Create the payments table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        vehicle_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        outstanding_amount DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        reference_number VARCHAR(255),
        bank_details JSONB DEFAULT '{}',
        payment_date TIMESTAMP,
        due_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        invoice_number VARCHAR(255),
        workflow_stage VARCHAR(50),
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_payments_vehicle ON payments(vehicle_id);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);`;

    console.log('✅ Payments table created successfully');
    
    // Test if we can query the table
    const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM payments`;
    console.log('✅ Payments table is accessible, count:', result);
    
  } catch (error) {
    console.error('Error creating payments table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPaymentsTable();
