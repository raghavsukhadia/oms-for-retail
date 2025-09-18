import { apiClient, type ApiResponse, type PaginatedResponse } from './client';

export interface Role {
  roleId: string;
  roleName: string;
  roleDescription?: string;
  roleColor?: string;
  roleLevel: number;
  isSystemRole: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  rolePermissions?: RolePermission[];
  _count?: {
    users: number;
  };
}

export interface RolePermission {
  rolePermissionId: string;
  resource: string;
  action: string;
  conditions: Record<string, any>;
}

export interface CreateRoleRequest {
  roleName: string;
  roleDescription?: string;
  roleColor?: string;
  roleLevel?: number;
  permissions?: {
    resource: string;
    action: string;
    conditions?: Record<string, any>;
  }[];
}

export interface UpdateRoleRequest {
  roleName?: string;
  roleDescription?: string;
  roleColor?: string;
  roleLevel?: number;
  status?: 'active' | 'inactive';
  permissions?: {
    resource: string;
    action: string;
    conditions?: Record<string, any>;
  }[];
}

export interface RoleListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  includeSystemRoles?: boolean;
}

export interface PermissionOptions {
  [resource: string]: string[];
}

/**
 * Role API service
 */
export const roleApi = {
  /**
   * Get all roles with filtering and pagination
   */
  async getRoles(params?: RoleListParams): Promise<PaginatedResponse<Role[]>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/roles${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<Role[]>>(endpoint);
  },

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<ApiResponse<Role>> {
    return apiClient.get<ApiResponse<Role>>(`/roles/${roleId}`);
  },

  /**
   * Create new role
   */
  async createRole(data: CreateRoleRequest): Promise<ApiResponse<Role>> {
    return apiClient.post<ApiResponse<Role>>('/roles', data);
  },

  /**
   * Update role
   */
  async updateRole(roleId: string, data: UpdateRoleRequest): Promise<ApiResponse<Role>> {
    return apiClient.put<ApiResponse<Role>>(`/roles/${roleId}`, data);
  },

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/roles/${roleId}`);
  },

  /**
   * Get available permission options
   */
  async getPermissionOptions(): Promise<ApiResponse<PermissionOptions>> {
    return apiClient.get<ApiResponse<PermissionOptions>>('/roles/permission-options');
  },

  /**
   * Get active roles for dropdowns
   */
  async getActiveRoles(): Promise<ApiResponse<Role[]>> {
    return apiClient.get<ApiResponse<Role[]>>('/roles?status=active&limit=100');
  },

  /**
   * Get roles by level for hierarchy
   */
  async getRolesByLevel(maxLevel?: number): Promise<ApiResponse<Role[]>> {
    const params = new URLSearchParams({ status: 'active' });
    if (maxLevel !== undefined) {
      params.append('maxLevel', maxLevel.toString());
    }
    return apiClient.get<ApiResponse<Role[]>>(`/roles?${params.toString()}`);
  }
};