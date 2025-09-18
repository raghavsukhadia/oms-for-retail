import { apiClient, type ApiResponse } from './client';
import type { User, Tenant } from '@/types';
import type {
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  TenantLoginFormData,
} from '@/lib/validations/auth';

// Authentication API response types
export interface AuthResponse {
  user: User;
  tenant: Tenant;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface TenantRegistrationData {
  tenantName: string;
  subdomain: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
}

export interface TenantRegistrationResponse {
  tenant: Tenant;
  adminUser: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface SubdomainCheckResponse {
  subdomain: string;
  available: boolean;
  url?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  limits: Record<string, any>;
}

export interface TenantListResponse {
  tenants: Tenant[];
}

export interface PasswordResetResponse {
  message: string;
}

// Authentication API functions
export const authApi = {
  // Standard login
  async login(data: LoginFormData): Promise<ApiResponse<AuthResponse>> {
    return apiClient.publicPost('/auth/login', data);
  },

  // Tenant-aware login
  async tenantLogin(data: TenantLoginFormData): Promise<ApiResponse<AuthResponse>> {
    return apiClient.publicPost('/auth/tenant-login', data);
  },

  // User registration
  async register(data: RegisterFormData): Promise<ApiResponse<AuthResponse>> {
    return apiClient.publicPost('/auth/register', data);
  },

  // Tenant registration (SaaS signup)
  async registerTenant(data: TenantRegistrationData): Promise<ApiResponse<TenantRegistrationResponse>> {
    return apiClient.publicPost('/public/signup', data);
  },

  // Check subdomain availability
  async checkSubdomain(subdomain: string): Promise<ApiResponse<SubdomainCheckResponse>> {
    return apiClient.publicPost('/public/check-subdomain', { subdomain });
  },

  // Get subscription plans
  async getSubscriptionPlans(): Promise<ApiResponse<{ plans: SubscriptionPlan[] }>> {
    return apiClient.publicGet('/public/plans');
  },

  // Logout
  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post('/auth/logout');
  },

  // Forgot password
  async forgotPassword(data: ForgotPasswordFormData): Promise<ApiResponse<PasswordResetResponse>> {
    return apiClient.publicPost('/auth/forgot-password', data);
  },

  // Reset password
  async resetPassword(data: ResetPasswordFormData): Promise<ApiResponse<PasswordResetResponse>> {
    return apiClient.publicPost('/auth/reset-password', data);
  },

  // Get current user profile
  async getProfile(): Promise<ApiResponse<User>> {
    return apiClient.get('/auth/profile');
  },

  // Refresh token
  async refreshToken(): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return apiClient.post('/auth/refresh');
  },

  // Get available tenants for user
  async getTenants(): Promise<ApiResponse<TenantListResponse>> {
    return apiClient.get('/auth/tenants');
  },

  // Switch tenant
  async switchTenant(tenantId: string): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post('/auth/switch-tenant', { tenantId });
  },

  // Verify email
  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    return apiClient.publicPost('/auth/verify-email', { token });
  },

  // Resend verification email
  async resendVerification(email: string): Promise<ApiResponse<void>> {
    return apiClient.publicPost('/auth/resend-verification', { email });
  },
};