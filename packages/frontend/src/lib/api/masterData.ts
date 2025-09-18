import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse, Location, Department, User, UserRole } from '@omsms/shared';

// Master Data API types
export interface LocationListParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  search?: string;
}

export interface DepartmentListParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  search?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  role?: UserRole;
  departmentId?: string;
  locationId?: string;
  search?: string;
}

export interface LocationWithCount extends Location {
  _count?: {
    users: number;
    vehicles: number;
  };
}

export interface CreateDepartmentRequest {
  departmentName: string;
  colorCode?: string;
  description?: string;
  headUserId?: string;
}

export interface UpdateDepartmentRequest {
  departmentName?: string;
  colorCode?: string;
  description?: string;
  headUserId?: string;
}

export interface DepartmentWithRelations extends Department {
  headUser?: {
    userId: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  _count?: {
    users: number;
  };
}

export interface UserWithRelations extends User {
  department?: {
    departmentId: string;
    departmentName: string;
    colorCode?: string;
  };
  location?: {
    locationId: string;
    locationName: string;
    city?: string;
    state?: string;
  };
}

// Product types (these should be added to shared types later)
export interface Product {
  productId: string;
  productName: string;
  brandName?: string;
  categoryId?: string;
  price?: number;
  installationTimeHours?: number;
  specifications: Record<string, any>;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface ProductCategory {
  categoryId: string;
  categoryName: string;
  parentCategoryId?: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface ProductWithCategory extends Product {
  category?: ProductCategory;
}

/**
 * Location API service
 */
export const locationApi = {
  /**
   * Get all locations
   */
  async getLocations(params?: LocationListParams): Promise<PaginatedResponse<LocationWithCount[]>> {
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
   * Get active locations for dropdowns
   */
  async getActiveLocations(): Promise<ApiResponse<LocationWithCount[]>> {
    return apiClient.get<ApiResponse<LocationWithCount[]>>('/locations?status=active&limit=100');
  }
};

/**
 * Department API service
 */
export const departmentApi = {
  /**
   * Get all departments
   */
  async getDepartments(params?: DepartmentListParams): Promise<PaginatedResponse<DepartmentWithRelations[]>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/departments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<DepartmentWithRelations[]>>(endpoint);
  },

  /**
   * Get department by ID
   */
  async getDepartmentById(departmentId: string): Promise<ApiResponse<DepartmentWithRelations>> {
    return apiClient.get<ApiResponse<DepartmentWithRelations>>(`/departments/${departmentId}`);
  },

  /**
   * Create new department
   */
  async createDepartment(data: CreateDepartmentRequest): Promise<ApiResponse<DepartmentWithRelations>> {
    return apiClient.post<ApiResponse<DepartmentWithRelations>>('/departments', data);
  },

  /**
   * Update department
   */
  async updateDepartment(departmentId: string, data: UpdateDepartmentRequest): Promise<ApiResponse<DepartmentWithRelations>> {
    return apiClient.put<ApiResponse<DepartmentWithRelations>>(`/departments/${departmentId}`, data);
  },

  /**
   * Delete department
   */
  async deleteDepartment(departmentId: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/departments/${departmentId}`);
  },

  /**
   * Get active departments for dropdowns
   */
  async getActiveDepartments(): Promise<ApiResponse<DepartmentWithRelations[]>> {
    return apiClient.get<ApiResponse<DepartmentWithRelations[]>>('/departments?status=active&limit=100');
  }
};

/**
 * User API service
 */
export const userApi = {
  /**
   * Get all users
   */
  async getUsers(params?: UserListParams): Promise<PaginatedResponse<UserWithRelations[]>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<UserWithRelations[]>>(endpoint);
  },

  /**
   * Get users by role for dropdowns
   */
  async getUsersByRole(role: UserRole): Promise<ApiResponse<UserWithRelations[]>> {
    return apiClient.get<ApiResponse<UserWithRelations[]>>(`/users?role=${role}&status=active&limit=100`);
  },

  /**
   * Get salespeople for dropdowns
   */
  async getSalespeople(): Promise<ApiResponse<UserWithRelations[]>> {
    return this.getUsersByRole('salesperson');
  },

  /**
   * Get coordinators for dropdowns
   */
  async getCoordinators(): Promise<ApiResponse<UserWithRelations[]>> {
    return this.getUsersByRole('coordinator');
  },

  /**
   * Get supervisors for dropdowns
   */
  async getSupervisors(): Promise<ApiResponse<UserWithRelations[]>> {
    return this.getUsersByRole('supervisor');
  }
};

/**
 * Product API service
 */
export const productApi = {
  /**
   * Get all products
   */
  async getProducts(): Promise<ApiResponse<ProductWithCategory[]>> {
    return apiClient.get<ApiResponse<ProductWithCategory[]>>('/products?status=active&limit=1000');
  },

  /**
   * Get product categories
   */
  async getProductCategories(): Promise<ApiResponse<ProductCategory[]>> {
    return apiClient.get<ApiResponse<ProductCategory[]>>('/product-categories?status=active&limit=1000');
  },

  /**
   * Get unique brand names for dropdown
   */
  async getBrands(): Promise<ApiResponse<string[]>> {
    return apiClient.get<ApiResponse<string[]>>('/products/brands');
  }
};