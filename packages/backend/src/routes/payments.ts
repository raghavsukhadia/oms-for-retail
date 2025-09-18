import { Router } from 'express';
import { PaymentService } from '../services/payment.service';
import { getTenantDb } from '../lib/database';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/payments - Get all payments with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, vehicleId, dueDateFrom, dueDateTo } = req.query;
    
    const filters: any = {};
    if (status) filters.status = status as string;
    if (vehicleId) filters.vehicleId = vehicleId as string;
    if (dueDateFrom || dueDateTo) {
      filters.dueDate = {};
      if (dueDateFrom) filters.dueDate.gte = new Date(dueDateFrom as string);
      if (dueDateTo) filters.dueDate.lte = new Date(dueDateTo as string);
    }

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const prisma = await getTenantDb(tenantId);
    const paymentService = new PaymentService(prisma);
    
    const payments = await paymentService.getAllPayments(filters);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/payments/outstanding - Get outstanding payments
router.get('/outstanding', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const prisma = await getTenantDb(tenantId);
    const paymentService = new PaymentService(prisma);
    
    const payments = await paymentService.getOutstandingPayments();
    res.json(payments);
  } catch (error) {
    console.error('Error fetching outstanding payments:', error);
    res.status(500).json({ error: 'Failed to fetch outstanding payments' });
  }
});

// GET /api/payments/summary - Get payment summary
router.get('/summary', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const prisma = await getTenantDb(tenantId);
    const paymentService = new PaymentService(prisma);
    
    const summary = await paymentService.getPaymentSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({ error: 'Failed to fetch payment summary' });
  }
});

// GET /api/payments/vehicle/:vehicleId - Get payments for specific vehicle
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const prisma = await getTenantDb(tenantId);
    const paymentService = new PaymentService(prisma);
    
    const payments = await paymentService.getPaymentsByVehicle(vehicleId);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching vehicle payments:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle payments' });
  }
});

// POST /api/payments - Create new payment
router.post('/', async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      createdBy: req.user?.userId,
    };

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const prisma = await getTenantDb(tenantId);
    const paymentService = new PaymentService(prisma);
    
    const payment = await paymentService.createPayment(paymentData);
    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// PUT /api/payments/:paymentId - Update payment
router.put('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const updateData = req.body;

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const prisma = await getTenantDb(tenantId);
    const paymentService = new PaymentService(prisma);
    
    const payment = await paymentService.updatePayment(paymentId, updateData);
    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    if (error instanceof Error && error.message === 'Payment not found') {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// DELETE /api/payments/:paymentId - Delete payment
router.delete('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const prisma = await getTenantDb(tenantId);
    const paymentService = new PaymentService(prisma);
    
    await paymentService.deletePayment(paymentId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

export default router;
