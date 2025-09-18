const { PrismaClient } = require('../generated/tenant-client');

async function fixCorruptedPayment() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:password@localhost:5432/omsms_tenant_demo'
      }
    }
  });
  
  try {
    console.log('🔧 Fixing corrupted payment record...');
    
    // Find the corrupted payment (₹0 total, ₹8000 paid)
    const corruptedPayment = await prisma.payment.findFirst({
      where: {
        AND: [
          { amount: 0 },
          { paidAmount: { gt: 0 } }
        ]
      },
      include: {
        vehicle: {
          select: {
            carNumber: true,
            ownerName: true
          }
        }
      }
    });
    
    if (corruptedPayment) {
      console.log(`📋 Found corrupted payment: ${corruptedPayment.vehicle.carNumber} - ₹${corruptedPayment.amount} total, ₹${corruptedPayment.paidAmount} paid`);
      
      // Option 1: Set the total amount to match paid amount (assuming this was a full payment)
      const updatedPayment = await prisma.payment.update({
        where: { paymentId: corruptedPayment.paymentId },
        data: {
          amount: corruptedPayment.paidAmount, // Set total = paid amount
          status: 'paid' // Mark as fully paid
        }
      });
      
      console.log(`✅ Fixed payment: ${corruptedPayment.vehicle.carNumber} - Now ₹${updatedPayment.amount} total, ₹${updatedPayment.paidAmount} paid, status: ${updatedPayment.status}`);
    } else {
      console.log('✅ No corrupted payments found');
    }
    
    // Show final summary
    const allPayments = await prisma.payment.findMany({
      include: {
        vehicle: {
          select: {
            carNumber: true,
            ownerName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('\n📋 FINAL PAYMENT RECORDS:');
    allPayments.forEach(payment => {
      const outstanding = Number(payment.amount) - Number(payment.paidAmount);
      console.log(`  ${payment.vehicle.carNumber} (${payment.vehicle.ownerName}): ₹${payment.amount} total, ₹${payment.paidAmount} paid, ₹${outstanding} outstanding [${payment.status}]`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing payment:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCorruptedPayment();
