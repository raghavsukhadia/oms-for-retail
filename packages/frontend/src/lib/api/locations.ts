import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse, Location } from '@omsms/shared';

// Location API types
export interface CreateLocationRequest {
  locationName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  contactPerson?: string;
  contactMobile?: string;
  contactEmail?: string;
  settings?: Record<string, any>;
}

export interface UpdateLocationRequest extends Partial<CreateLocationRequest> {
  status?: 'active' | 'inactive';
}

export interface LocationFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: 'active' | 'inactive';
  city?: string;
  state?: string;
  country?: string;
}

export interface LocationWithCount extends Location {
  _count?: {
    vehicles: number;
    users: number;
  };
}

export interface LocationStats {
  overview: {
    total: number;
    active: number;
    inactive: number;
  };
  distribution: {
    byCountry: Array<{
      country: string;
      _count: { country: number };
    }>;
    byState: Array<{
      state: string;
      _count: { state: number };
    }>;
  };
  topLocations: Array<{
    locationId: string;
    locationName: string;
    city?: string;
    state?: string;
    _count: {
      vehicles: number;
      users: number;
    };
  }>;
}

/**
 * Location API service
 */
export const locationApi = {
  /**
   * Get all locations with filtering and pagination
   */
  async getLocations(params?: LocationFilterParams): Promise<PaginatedResponse<LocationWithCount[]>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/locations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<LocationWithCount[]>>(endpoint);
  },

  /**
   * Get location by ID
   */
  async getLocationById(locationId: string): Promise<ApiResponse<LocationWithCount>> {
    return apiClient.get<ApiResponse<LocationWithCount>>(`/locations/${locationId}`);
  },

  /**
   * Create new location
   */
  async createLocation(data: CreateLocationRequest): Promise<ApiResponse<LocationWithCount>> {
    return apiClient.post<ApiResponse<LocationWithCount>>('/locations', data);
  },

  /**
   * Update location
   */
  async updateLocation(locationId: string, data: UpdateLocationRequest): Promise<ApiResponse<LocationWithCount>> {
    return apiClient.put<ApiResponse<LocationWithCount>>(`/locations/${locationId}`, data);
  },

  /**
   * Delete location
   */
  async deleteLocation(locationId: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/locations/${locationId}`);
  },

  /**
   * Get location statistics
   */
  async getLocationStats(): Promise<ApiResponse<LocationStats>> {
    return apiClient.get<ApiResponse<LocationStats>>('/locations/stats');
  },

  /**
   * Get active locations for dropdowns
   */
  async getActiveLocations(): Promise<ApiResponse<LocationWithCount[]>> {
    return apiClient.get<ApiResponse<LocationWithCount[]>>('/locations?status=active&limit=100');
  }
};