import { apiClient, type ApiResponse, type PaginatedResponse } from './client';
import type { User } from '@/types';

export const userApi = {
  async getUsers(params?: any): Promise<PaginatedResponse<User[]>> {
    return apiClient.get('/users', { params });
  },

  async getUser(userId: string): Promise<ApiResponse<User>> {
    return apiClient.get(`/users/${userId}`);
  },

  async createUser(data: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.post('/users', data);
  },

  async updateUser(userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.put(`/users/${userId}`, data);
  },

  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/users/${userId}`);
  },
};
