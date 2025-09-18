import { useAuthStore } from '@/store/authStore';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
}

// Prevent localhost in production
if (API_BASE_URL.includes('localhost') && process.env.NODE_ENV === 'production') {
  throw new Error('Localhost URL detected in production environment');
}

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// HTTP client class with tenant awareness
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const { token, tenant } = useAuthStore.getState();
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      if (tenant?.subdomain) {
        headers['X-Tenant-ID'] = tenant.subdomain;
      }
    } else {
      // For public endpoints (like login), still include tenant ID for localhost development
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        headers['X-Tenant-ID'] = 'demo'; // Use demo tenant for localhost development
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response, originalUrl: string, originalMethod: string, originalBody?: any): Promise<T> {
    // Handle 401 errors with automatic token refresh
    if (response.status === 401) {
      const { refreshToken, updateTokens, logout } = useAuthStore.getState();
      
      if (refreshToken) {
        try {
          // Attempt to refresh the token
          const refreshResponse = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.success && refreshData.data) {
              // Update tokens in store
              updateTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
              
              // Retry the original request with new token
              const retryResponse = await fetch(originalUrl, {
                method: originalMethod,
                headers: this.getHeaders(),
                body: originalBody ? JSON.stringify(originalBody) : undefined,
              });
              
              if (retryResponse.ok) {
                return retryResponse.json();
              }
            }
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
      
      // If refresh failed or no refresh token, logout
      logout();
      window.location.href = '/login';
      throw new ApiError('Authentication required', 401);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || 'An error occurred',
        response.status,
        data
      );
    }

    return data;
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      ...options,
    });

    return this.handleResponse<T>(response, url, 'GET');
  }

  async post<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    return this.handleResponse<T>(response, url, 'POST', data);
  }

  async put<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    return this.handleResponse<T>(response, url, 'PUT', data);
  }

  async patch<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    return this.handleResponse<T>(response, url, 'PATCH', data);
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
      ...options,
    });

    return this.handleResponse<T>(response, url, 'DELETE');
  }

  // Public endpoints (no auth required)
  async publicPost<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    return this.handleResponse<T>(response, url, 'POST', data);
  }

  async publicGet<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(false),
      ...options,
    });

    return this.handleResponse<T>(response, url, 'GET');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing or custom instances
export { ApiClient };