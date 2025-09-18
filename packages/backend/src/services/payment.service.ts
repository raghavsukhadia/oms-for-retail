import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreatePaymentRequest {
  vehicleId: string;
  amount: number;
  paidAmount?: number;
  paymentMethod?: string;
  transactionId?: string;
  referenceNumber?: string;
  bankDetails?: any;
  paymentDate?: Date;
  dueDate?: Date;
  notes?: string;
  invoiceNumber?: string;
  workflowStage?: string;
  createdBy?: string;
}

export interface UpdatePaymentRequest {
  amount?: number;
  paidAmount?: number;
  paymentMethod?: string;
  transactionId?: string;
  referenceNumber?: string;
  bankDetails?: any;
  paymentDate?: Date;
  dueDate?: Date;
  status?: string;
  notes?: string;
  invoiceNumber?: string;
  workflowStage?: string;
}

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  async createPayment(data: CreatePaymentRequest) {
    const amount = new Decimal(data.amount);
    const paidAmount = new Decimal(data.paidAmount || 0);
    const outstandingAmount = amount.minus(paidAmount);
    
    let status = 'pending';
    if (paidAmount.equals(0)) {
      status = 'pending';
    } else if (paidAmount.greaterThanOrEqualTo(amount)) {
      status = 'paid';
    } else {
      status = 'partial';
    }

    // Prepare create data with proper date handling
    const createData: any = {
      vehicleId: data.vehicleId,
      amount,
      paidAmount,
      outstandingAmount,
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      referenceNumber: data.referenceNumber,
      bankDetails: data.bankDetails || {},
      status,
      notes: data.notes,
      invoiceNumber: data.invoiceNumber,
      workflowStage: data.workflowStage,
      createdBy: data.createdBy,
    };

    // Handle date fields - convert string dates to DateTime if provided
    if (data.paymentDate) {
      createData.paymentDate = new Date(data.paymentDate + (data.paymentDate.includes('T') ? '' : 'T00:00:00.000Z'));
    }
    if (data.dueDate) {
      createData.dueDate = new Date(data.dueDate + (data.dueDate.includes('T') ? '' : 'T00:00:00.000Z'));
    }

    return await this.prisma.payment.create({
      data: createData,
      include: {
        vehicle: {
          select: {
            carNumber: true,
            ownerName: true,
            modelName: true,
            brandName: true,
          }
        }
      }
    });
  }

  async updatePayment(paymentId: string, data: UpdatePaymentRequest) {
    // Get current payment
    const currentPayment = await this.prisma.payment.findUnique({
      where: { paymentId }
    });

    if (!currentPayment) {
      throw new Error('Payment not found');
    }

    const amount = data.amount !== undefined ? new Decimal(data.amount) : currentPayment.amount;
    const paidAmount = data.paidAmount !== undefined ? new Decimal(data.paidAmount) : currentPayment.paidAmount;
    const outstandingAmount = amount.minus(paidAmount);
    
    let status = data.status;
    if (!status) {
      if (paidAmount.equals(0)) {
        status = 'pending';
      } else if (paidAmount.greaterThanOrEqualTo(amount)) {
        status = 'paid';
      } else {
        status = 'partial';
      }
    }

    // Prepare update data with proper date handling
    const updateData: any = {
      amount,
      paidAmount,
      outstandingAmount,
      status,
    };

    // Handle optional fields
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.transactionId !== undefined) updateData.transactionId = data.transactionId;
    if (data.referenceNumber !== undefined) updateData.referenceNumber = data.referenceNumber;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.workflowStage !== undefined) updateData.workflowStage = data.workflowStage;

    // Handle date fields - convert string dates to DateTime
    if (data.paymentDate) {
      updateData.paymentDate = new Date(data.paymentDate + 'T00:00:00.000Z');
    }
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate + 'T00:00:00.000Z');
    }

    return await this.prisma.payment.update({
      where: { paymentId },
      data: updateData,
      include: {
        vehicle: {
          select: {
            carNumber: true,
            ownerName: true,
            modelName: true,
            brandName: true,
          }
        }
      }
    });
  }

  async getPaymentsByVehicle(vehicleId: string) {
    return await this.prisma.payment.findMany({
      where: { vehicleId },
      include: {
        vehicle: {
          select: {
            carNumber: true,
            ownerName: true,
            modelName: true,
            brandName: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllPayments(filters?: {
    status?: string;
    vehicleId?: string;
    dueDate?: { gte?: Date; lte?: Date };
  }) {
    return await this.prisma.payment.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.vehicleId && { vehicleId: filters.vehicleId }),
        ...(filters?.dueDate && { dueDate: filters.dueDate }),
      },
      include: {
        vehicle: {
          select: {
            carNumber: true,
            ownerName: true,
            modelName: true,
            brandName: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getOutstandingPayments() {
    return await this.prisma.payment.findMany({
      where: {
        OR: [
          { status: 'pending' },
          { status: 'partial' },
          { status: 'overdue' }
        ]
      },
      include: {
        vehicle: {
          select: {
            carNumber: true,
            ownerName: true,
            modelName: true,
            brandName: true,
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  async getPaymentSummary() {
    const result = await this.prisma.payment.aggregate({
      _sum: {
        amount: true,
        paidAmount: true,
        outstandingAmount: true,
      },
      _count: {
        paymentId: true,
      }
    });

    const statusCounts = await this.prisma.payment.groupBy({
      by: ['status'],
      _count: {
        paymentId: true,
      }
    });

    return {
      totalAmount: result._sum.amount || 0,
      totalPaid: result._sum.paidAmount || 0,
      totalOutstanding: result._sum.outstandingAmount || 0,
      totalPayments: result._count.paymentId || 0,
      statusCounts: statusCounts.reduce((acc: Record<string, number>, item: any) => {
        acc[item.status] = item._count.paymentId;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  async deletePayment(paymentId: string) {
    return await this.prisma.payment.delete({
      where: { paymentId }
    });
  }
}
