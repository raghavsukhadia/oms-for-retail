import { apiClient } from './client';
import type { PaginatedResponse } from './client';
import type { ApiResponse, Vehicle, VehicleStatus } from '@omsms/shared';

// Vehicle API types
export interface CreateVehicleRequest {
  carNumber: string;
  ownerName: string;
  ownerMobile?: string;
  ownerEmail?: string;
  ownerAddress?: string;
  modelName?: string;
  brandName?: string;
  vehicleType?: string;
  locationId?: string;
  salespersonId?: string;
  coordinatorId?: string;
  supervisorId?: string;
  inwardDate?: string;
  expectedDeliveryDate?: string;
  vehicleDetails?: Record<string, any>;
  customFields?: Record<string, any>;
}

export interface UpdateVehicleRequest extends Partial<CreateVehicleRequest> {
  actualDeliveryDate?: string;
  status?: VehicleStatus;
}

export interface VehicleFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: VehicleStatus;
  locationId?: string;
  salespersonId?: string;
  coordinatorId?: string;
  supervisorId?: string;
  brandName?: string;
  vehicleType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface VehicleWithRelations extends Vehicle {
  location?: {
    locationId: string;
    locationName: string;
    city?: string;
    state?: string;
  };
  salesperson?: {
    userId: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  coordinator?: {
    userId: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  supervisor?: {
    userId: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  creator?: {
    userId: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  _count?: {
    installations: number;
    mediaFiles: number;
  };
}

export interface VehicleStats {
  overview: {
    total: number;
    overdue: number;
  };
  byStatus: Array<{
    status: string;
    _count: { status: number };
  }>;
  byLocation: Array<{
    locationId: string;
    _count: { locationId: number };
  }>;
  byBrand: Array<{
    brandName: string;
    _count: { brandName: number };
  }>;
  recent: Array<{
    vehicleId: string;
    carNumber: string;
    ownerName: string;
    status: string;
    createdAt: Date;
  }>;
}

/**
 * Vehicle API service
 */

export const vehicleApi = {
  /**
   * Get all vehicles with filtering and pagination
   */
  async getVehicles(params?: VehicleFilterParams): Promise<PaginatedResponse<VehicleWithRelations[]>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/vehicles${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<VehicleWithRelations[]>>(endpoint);
  },

  /**
   * Get vehicle by ID
   */
  async getVehicleById(vehicleId: string, include?: string): Promise<ApiResponse<VehicleWithRelations>> {
    // Always include salesperson data unless overridden
    const defaultIncludes = 'salesperson,coordinator,supervisor,location';
    const finalIncludes = include ? `${include},${defaultIncludes}` : defaultIncludes;
    const queryString = `?include=${encodeURIComponent(finalIncludes)}`;
    return apiClient.get<ApiResponse<VehicleWithRelations>>(`/vehicles/${vehicleId}${queryString}`);
  },

  /**
   * Create new vehicle
   */
  async createVehicle(data: CreateVehicleRequest): Promise<ApiResponse<VehicleWithRelations>> {
    return apiClient.post<ApiResponse<VehicleWithRelations>>('/vehicles', data);
  },

  /**
   * Update vehicle
   */
  async updateVehicle(vehicleId: string, data: UpdateVehicleRequest): Promise<ApiResponse<VehicleWithRelations>> {
    return apiClient.put<ApiResponse<VehicleWithRelations>>(`/vehicles/${vehicleId}`, data);
  },

  /**
   * Update vehicle status
   */
  async updateVehicleStatus(
    vehicleId: string, 
    status: VehicleStatus, 
    notes?: string,
    actualDeliveryDate?: string
  ): Promise<ApiResponse<Vehicle>> {
    return apiClient.put<ApiResponse<Vehicle>>(`/vehicles/${vehicleId}/status`, {
      status,
      notes,
      actualDeliveryDate
    });
  },

  /**
   * Update vehicle assignments
   */
  async updateVehicleAssignments(
    vehicleId: string,
    assignments: {
      salespersonId?: string;
      coordinatorId?: string;
      supervisorId?: string;
    }
  ): Promise<ApiResponse<VehicleWithRelations>> {
    return apiClient.put<ApiResponse<VehicleWithRelations>>(`/vehicles/${vehicleId}/assignments`, assignments);
  },

  /**
   * Delete vehicle
   */
  async deleteVehicle(vehicleId: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vehicles/${vehicleId}`);
  },

  /**
   * Get vehicle statistics
   */
  async getVehicleStats(): Promise<ApiResponse<VehicleStats>> {
    return apiClient.get<ApiResponse<VehicleStats>>('/vehicles/stats');
  },

  /**
   * Get product workflow stage
   */
  async getProductWorkflowStage(vehicleId: string, productName: string, workflowType: string): Promise<ApiResponse<any>> {
    return apiClient.get<ApiResponse<any>>(`/vehicles/${vehicleId}/products/${encodeURIComponent(productName)}/workflows/${workflowType}`);
  },

  /**
   * Update product workflow stage
   */
  async updateProductWorkflowStage(vehicleId: string, productName: string, workflowType: string, data: { stages: Record<string, boolean>; notes?: string }): Promise<ApiResponse<any>> {
    return apiClient.patch<ApiResponse<any>>(`/vehicles/${vehicleId}/products/${encodeURIComponent(productName)}/workflows/${workflowType}`, data);
  },

  /**
   * Update vehicle workflow stage
   */
  async updateVehicleWorkflowStage(vehicleId: string, workflowType: string, data: { stage: string; notes?: string; paymentDetails?: Record<string, any> }): Promise<ApiResponse<any>> {
    return apiClient.patch<ApiResponse<any>>(`/vehicles/${vehicleId}/workflows/${workflowType}`, data);
  },

  /**
   * Initialize missing workflow instances for a vehicle
   */
  async initializeMissingWorkflows(vehicleId: string): Promise<ApiResponse<any>> {
    return apiClient.post<ApiResponse<any>>(`/vehicles/${vehicleId}/workflows/initialize`, {});
  }
};