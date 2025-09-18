import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '@omsms/shared';

// Report data types
export interface VehicleInwardReportData {
  vehicleId: string;
  inwardDate: string;
  ownerName: string;
  mobileNo: string;
  modelName: string;
  carNumber: string;
  expDeliveredDate: string;
  deliveredDate: string;
  location: string;
  salesperson: string;
  installation: string;
  payment: string;
}

export interface VehicleInstallationReportData {
  vehicleId: string;
  inwardDate: string;
  ownerName: string;
  mobileNo: string;
  carNumber: string;
  brandName: string;
  categoryName: string;
  productName: string;
  amount: number;
}

export interface VehicleDetailedReportData {
  vehicleId: string;
  carNumber: string;
  ownerName: string;
  ownerMobile: string;
  ownerEmail: string;
  modelName: string;
  brandName: string;
  vehicleType: string;
  inwardDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate: string;
  status: string;
  location: string;
  salesperson: string;
  coordinator: string;
  supervisor: string;
  installations: Array<{
    productName: string;
    brandName: string;
    categoryName: string;
    installationDate: string;
    installer: string;
    amount: number;
    status: string;
  }>;
  totalAmount: number;
  payments: Array<{
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    transactionId: string;
    status: string;
  }>;
  totalPaid: number;
  balance: number;
}

export interface AccountReportData {
  period: string;
  totalRevenue: number;
  totalVehicles: number;
  totalInstallations: number;
  averageOrderValue: number;
  revenueByLocation: Array<{
    locationName: string;
    revenue: number;
    vehicleCount: number;
  }>;
  revenueByProduct: Array<{
    productName: string;
    brandName: string;
    revenue: number;
    quantity: number;
  }>;
  revenueBySalesperson: Array<{
    salespersonName: string;
    revenue: number;
    vehicleCount: number;
    commission: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    vehicleCount: number;
    installationCount: number;
  }>;
  topCustomers: Array<{
    ownerName: string;
    ownerMobile: string;
    totalSpent: number;
    vehicleCount: number;
  }>;
}

export interface ReportFilters {
  fromDate?: string;
  tillDate?: string;
  locationId?: string;
  salespersonId?: string;
  vehicleStatus?: string;
  vehicleNumber?: string;
  page?: number;
  limit?: number;
}

/**
 * Reports API service
 */
export const reportsApi = {
  /**
   * Get Vehicle Inward Report
   */
  async getVehicleInwardReport(filters?: ReportFilters): Promise<PaginatedResponse<VehicleInwardReportData[]>> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/reports/vehicle-inward${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<VehicleInwardReportData[]>>(endpoint);
  },

  /**
   * Get Vehicle Installation Report
   */
  async getVehicleInstallationReport(filters?: ReportFilters): Promise<PaginatedResponse<VehicleInstallationReportData[]>> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/reports/vehicle-installation${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<VehicleInstallationReportData[]>>(endpoint);
  },

  /**
   * Get Vehicle Detailed Report
   */
  async getVehicleDetailedReport(vehicleNumber?: string): Promise<ApiResponse<VehicleDetailedReportData[]>> {
    const queryParams = new URLSearchParams();
    
    if (vehicleNumber && vehicleNumber.trim() !== '') {
      queryParams.append('vehicleNumber', vehicleNumber.trim());
    }

    const endpoint = `/reports/vehicle-detailed${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<ApiResponse<VehicleDetailedReportData[]>>(endpoint);
  },

  /**
   * Get Account Reports
   */
  async getAccountReports(filters?: ReportFilters): Promise<ApiResponse<AccountReportData>> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/reports/accounts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<ApiResponse<AccountReportData>>(endpoint);
  },

  /**
   * Export report to Excel/CSV
   */
  async exportReport(
    reportType: 'vehicle-inward' | 'vehicle-installation' | 'vehicle-detailed' | 'accounts',
    format: 'excel' | 'csv',
    filters?: ReportFilters
  ): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/reports/${reportType}/export?${queryParams.toString()}`;
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'X-Tenant-ID': localStorage.getItem('tenant_id') || '',
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }
};
