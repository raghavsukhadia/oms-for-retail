const { PrismaClient } = require('../generated/tenant-client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function cleanupPayments() {
  // Use the demo tenant database URL
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:password@localhost:5432/omsms_tenant_demo'
      }
    }
  });
  
  try {
    console.log('🧹 Starting payment cleanup...');
    
    // 1. Get all payments with vehicle details
    const allPayments = await prisma.payment.findMany({
      include: {
        vehicle: {
          select: {
            vehicleId: true,
            carNumber: true,
            ownerName: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`📊 Found ${allPayments.length} total payment records`);
    
    // 2. Group payments by vehicleId
    const paymentsByVehicle = {};
    allPayments.forEach(payment => {
      const vehicleId = payment.vehicleId;
      if (!paymentsByVehicle[vehicleId]) {
        paymentsByVehicle[vehicleId] = [];
      }
      paymentsByVehicle[vehicleId].push(payment);
    });
    
    console.log(`🚗 Found payments for ${Object.keys(paymentsByVehicle).length} vehicles`);
    
    // 3. Identify and remove duplicates (keep the latest one for each vehicle)
    let deletedCount = 0;
    let updatedCount = 0;
    
    for (const [vehicleId, payments] of Object.entries(paymentsByVehicle)) {
      if (payments.length > 1) {
        console.log(`⚠️  Vehicle ${payments[0].vehicle.carNumber} has ${payments.length} payment records`);
        
        // Sort by creation date, keep the latest
        payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latestPayment = payments[0];
        const duplicates = payments.slice(1);
        
        // Delete duplicates
        for (const duplicate of duplicates) {
          await prisma.payment.delete({
            where: { paymentId: duplicate.paymentId }
          });
          deletedCount++;
          console.log(`🗑️  Deleted duplicate payment ${duplicate.paymentId} for vehicle ${duplicate.vehicle.carNumber}`);
        }
        
        // Update the latest payment to ensure consistency
        const outstandingAmount = Math.max(0, Number(latestPayment.amount) - Number(latestPayment.paidAmount));
        let status = 'pending';
        
        if (Number(latestPayment.paidAmount) >= Number(latestPayment.amount) && Number(latestPayment.amount) > 0) {
          status = 'paid';
        } else if (Number(latestPayment.paidAmount) > 0) {
          status = 'partial';
        }
        
        await prisma.payment.update({
          where: { paymentId: latestPayment.paymentId },
          data: {
            outstandingAmount: outstandingAmount,
            status: status
          }
        });
        updatedCount++;
        console.log(`✅ Updated payment ${latestPayment.paymentId} - Status: ${status}, Outstanding: ₹${outstandingAmount}`);
      }
    }
    
    // 4. Fix any remaining payments with incorrect calculations
    const remainingPayments = await prisma.payment.findMany();
    
    for (const payment of remainingPayments) {
      const amount = Number(payment.amount);
      const paidAmount = Number(payment.paidAmount);
      const outstandingAmount = Math.max(0, amount - paidAmount);
      
      let status = 'pending';
      if (paidAmount >= amount && amount > 0) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      }
      
      // Only update if values are different
      if (
        Number(payment.outstandingAmount) !== outstandingAmount ||
        payment.status !== status
      ) {
        await prisma.payment.update({
          where: { paymentId: payment.paymentId },
          data: {
            outstandingAmount: outstandingAmount,
            status: status
          }
        });
        updatedCount++;
        console.log(`🔧 Fixed payment ${payment.paymentId} - Status: ${status}, Outstanding: ₹${outstandingAmount}`);
      }
    }
    
    // 5. Show final summary
    const finalPayments = await prisma.payment.findMany({
      include: {
        vehicle: {
          select: {
            carNumber: true,
            ownerName: true
          }
        }
      }
    });
    
    console.log('\n📈 CLEANUP SUMMARY:');
    console.log(`🗑️  Deleted ${deletedCount} duplicate payment records`);
    console.log(`🔧 Updated ${updatedCount} payment records`);
    console.log(`📊 Final payment count: ${finalPayments.length}`);
    
    console.log('\n📋 FINAL PAYMENT RECORDS:');
    for (const payment of finalPayments) {
      console.log(`  ${payment.vehicle.carNumber} (${payment.vehicle.ownerName}): ₹${payment.amount} total, ₹${payment.paidAmount} paid, ₹${payment.outstandingAmount} outstanding [${payment.status}]`);
    }
    
    console.log('\n✅ Payment cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during payment cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupPayments()
  .catch((error) => {
    console.error('❌ Payment cleanup failed:', error);
    process.exit(1);
  });
