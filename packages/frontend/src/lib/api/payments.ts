import { apiClient } from './client';
import type { ApiResponse } from '@omsms/shared';

export interface CreatePaymentRequest {
  vehicleId: string;
  amount: number;
  paidAmount?: number;
  paymentMethod?: string;
  transactionId?: string;
  referenceNumber?: string;
  bankDetails?: any;
  paymentDate?: string;
  dueDate?: string;
  notes?: string;
  invoiceNumber?: string;
  workflowStage?: string;
}

export interface UpdatePaymentRequest {
  amount?: number;
  paidAmount?: number;
  paymentMethod?: string;
  transactionId?: string;
  referenceNumber?: string;
  bankDetails?: any;
  paymentDate?: string;
  dueDate?: string;
  status?: string;
  notes?: string;
  invoiceNumber?: string;
  workflowStage?: string;
}

export interface Payment {
  paymentId: string;
  vehicleId: string;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod?: string;
  transactionId?: string;
  referenceNumber?: string;
  bankDetails?: any;
  paymentDate?: string;
  dueDate?: string;
  status: string;
  notes?: string;
  invoiceNumber?: string;
  workflowStage?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  vehicle: {
    carNumber: string;
    ownerName: string;
    modelName?: string;
    brandName?: string;
  };
}

export interface PaymentSummary {
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  totalPayments: number;
  statusCounts: Record<string, number>;
}

export const paymentApi = {
  // Get all payments with optional filters
  getAllPayments: async (filters?: {
    status?: string;
    vehicleId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  }): Promise<Payment[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.vehicleId) params.append('vehicleId', filters.vehicleId);
    if (filters?.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
    if (filters?.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
    
    return apiClient.get<Payment[]>(`/payments${params.toString() ? `?${params.toString()}` : ''}`);
  },

  // Get outstanding payments
  getOutstandingPayments: async (): Promise<Payment[]> => {
    return apiClient.get<Payment[]>('/payments/outstanding');
  },

  // Get payment summary
  getPaymentSummary: async (): Promise<PaymentSummary> => {
    return apiClient.get<PaymentSummary>('/payments/summary');
  },

  // Get payments for specific vehicle
  getVehiclePayments: async (vehicleId: string): Promise<Payment[]> => {
    return apiClient.get<Payment[]>(`/payments/vehicle/${vehicleId}`);
  },

  // Create new payment
  createPayment: async (payment: CreatePaymentRequest): Promise<Payment> => {
    return apiClient.post<Payment>('/payments', payment);
  },

  // Update payment
  updatePayment: async (paymentId: string, payment: UpdatePaymentRequest): Promise<Payment> => {
    return apiClient.put<Payment>(`/payments/${paymentId}`, payment);
  },

  // Delete payment
  deletePayment: async (paymentId: string): Promise<void> => {
    await apiClient.delete(`/payments/${paymentId}`);
  },
};
