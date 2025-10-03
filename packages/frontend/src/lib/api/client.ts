import { useAuthStore } from '@/store/authStore';

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omsms-backend-610250363653.asia-south1.run.app/api';

// Check if we should use mock responses
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

// HTTP client class with tenant awareness
class ApiClient {
  private _baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this._baseUrl = baseUrl;
  }

  get baseUrl(): string {
    return this._baseUrl;
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
      } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        // For localhost development, always include demo tenant ID
        headers['X-Tenant-ID'] = 'demo';
      }
    } else {
      // For public endpoints (like login), still include tenant ID for localhost development
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        headers['X-Tenant-ID'] = 'demo'; // Use demo tenant for localhost development
      }
    }

    return headers;
  }

  private async mockResponse<T>(endpoint: string, method: string, data?: any): Promise<T> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock responses for different endpoints
    if (endpoint === '/public/plans') {
      return {
        success: true,
        data: {
          plans: [
            {
              id: 'starter',
              name: 'Starter',
              price: 29,
              description: 'Perfect for small businesses',
              currency: 'USD',
              interval: 'month',
              features: [
                'Up to 100 vehicles',
                'Up to 10 users',
                '10GB storage',
                'Basic support',
                'Standard workflows'
              ],
              limits: {
                vehicles: 100,
                users: 10,
                storage: '10GB'
              }
            },
            {
              id: 'professional',
              name: 'Professional',
              price: 99,
              description: 'Ideal for growing companies',
              currency: 'USD',
              interval: 'month',
              features: [
                'Up to 1,000 vehicles',
                'Up to 50 users',
                '100GB storage',
                'Priority support',
                'Custom workflows',
                'API access'
              ],
              limits: {
                vehicles: 1000,
                users: 50,
                storage: '100GB'
              }
            },
            {
              id: 'enterprise',
              name: 'Enterprise',
              price: 299,
              description: 'For large organizations',
              currency: 'USD',
              interval: 'month',
              features: [
                'Unlimited vehicles',
                'Unlimited users',
                '1TB storage',
                '24/7 support',
                'Custom integrations',
                'Advanced analytics',
                'White-label options'
              ],
              limits: {
                vehicles: -1,
                users: -1,
                storage: '1TB'
              }
            }
          ]
        }
      } as T;
    }

    if (endpoint === '/public/check-subdomain') {
      const { subdomain } = data || {};
      const unavailableSubdomains = ['admin', 'api', 'www', 'app', 'dashboard'];
      const available = !unavailableSubdomains.includes(subdomain?.toLowerCase());
      
      return {
        success: true,
        data: {
          subdomain: subdomain,
          available: available,
          url: available ? `https://${subdomain}.omsms.com` : undefined
        }
      } as T;
    }

    if (endpoint === '/public/signup') {
      const { organizationName, subdomain, firstName, lastName, email, adminPassword, subscriptionTier } = data || {};
      
      return {
        success: true,
        data: {
          organization: {
            organizationId: 'org_' + Math.random().toString(36).substr(2, 9),
            organizationName: organizationName,
            subdomain: subdomain,
            subscriptionTier: subscriptionTier || 'starter',
            status: 'active',
            createdAt: new Date().toISOString()
          },
          user: {
            userId: 'user_' + Math.random().toString(36).substr(2, 9),
            email: email,
            firstName: firstName,
            lastName: lastName,
            role: 'admin',
            status: 'active'
          },
          tokens: {
            accessToken: 'mock_jwt_token_' + Math.random().toString(36).substr(2, 9),
            refreshToken: 'mock_refresh_token_' + Math.random().toString(36).substr(2, 9)
          }
        }
      } as T;
    }

    if (endpoint === '/auth/login') {
      const { email, subdomain } = data || {};
      
      return {
        success: true,
        data: {
          user: {
            userId: 'user_' + Math.random().toString(36).substr(2, 9),
            email: email,
            firstName: 'Demo',
            lastName: 'User',
            role: 'admin',
            status: 'active'
          },
          tenant: {
            tenantId: 'tenant_' + Math.random().toString(36).substr(2, 9),
            tenantName: 'Demo Organization',
            subdomain: subdomain || 'demo',
            status: 'active'
          },
          tokens: {
            accessToken: 'mock_jwt_token_' + Math.random().toString(36).substr(2, 9),
            refreshToken: 'mock_refresh_token_' + Math.random().toString(36).substr(2, 9)
          }
        }
      } as T;
    }

    // Vehicles endpoints
    if (endpoint.startsWith('/vehicles')) {
      if (endpoint === '/vehicles' || endpoint.startsWith('/vehicles?')) {
        return {
          success: true,
          data: []
        } as T;
      }
    }

    // Departments endpoints
    if (endpoint.startsWith('/departments')) {
      if (endpoint === '/departments' || endpoint.startsWith('/departments?')) {
        return {
          success: true,
          data: []
        } as T;
      }
    }

    // Locations endpoints
    if (endpoint.startsWith('/locations')) {
      if (endpoint === '/locations' || endpoint.startsWith('/locations?')) {
        return {
          success: true,
          data: []
        } as T;
      }
    }

    // Users endpoints
    if (endpoint.startsWith('/users')) {
      if (endpoint === '/users' || endpoint.startsWith('/users?')) {
        return {
          success: true,
          data: []
        } as T;
      }
    }

    // Products endpoints
    if (endpoint.startsWith('/products')) {
      if (endpoint === '/products' || endpoint.startsWith('/products?')) {
        return {
          success: true,
          data: []
        } as T;
      }
      
      if (endpoint === '/products/brands') {
        return {
          success: true,
          data: []
        } as T;
      }
    }

    // Roles endpoints
    if (endpoint.startsWith('/roles')) {
      if (endpoint === '/roles' || endpoint.startsWith('/roles?')) {
        return {
          success: true,
          data: []
        } as T;
      }
      
      if (endpoint.startsWith('/roles/permission-options')) {
        return {
          success: true,
          data: {}
        } as T;
      }
    }

    // Tracker endpoints
    if (endpoint.startsWith('/tracker')) {
      if (endpoint.startsWith('/tracker/vehicle')) {
        return {
          success: true,
          data: []
        } as T;
      }

      if (endpoint.startsWith('/tracker/service')) {
        return {
          success: true,
          data: []
        } as T;
      }

      if (endpoint.startsWith('/tracker/requirements')) {
        return {
          success: true,
          data: []
        } as T;
      }
    }

    // Reports endpoints
    if (endpoint.startsWith('/reports')) {
      if (endpoint.startsWith('/reports/vehicle-inward')) {
        return {
          success: true,
          data: []
        } as T;
      }

      if (endpoint.startsWith('/reports/vehicle-installation')) {
        return {
          success: true,
          data: []
        } as T;
      }

      if (endpoint.startsWith('/reports/vehicle-detailed')) {
        return {
          success: true,
          data: []
        } as T;
      }

      if (endpoint.startsWith('/reports/accounts')) {
        return {
          success: true,
          data: []
        } as T;
      }
    }

    // Organization endpoints
    if (endpoint.startsWith('/organization')) {
      if (endpoint === '/organization/settings') {
        return {
          success: true,
          data: {
            organizationId: 'org_001',
            organizationName: 'Demo Organization',
            subdomain: 'demo',
            logo: null,
            primaryColor: '#3b82f6',
            secondaryColor: '#10b981',
            timezone: 'Asia/Kolkata',
            currency: 'INR',
            language: 'en',
            features: {
              vehicles: true,
              users: true,
              reports: true,
              workflows: true,
              analytics: true
            },
            limits: {
              vehicles: 100,
              users: 10,
              storage: '10GB'
            },
            subscription: {
              tier: 'starter',
              status: 'active',
              startDate: '2024-01-01T00:00:00Z',
              endDate: '2024-12-31T23:59:59Z'
            },
            contact: {
              email: 'admin@demoorganization.com',
              phone: '+91-9876543210',
              address: '123 Business District, Mumbai'
            },
            preferences: {
              emailNotifications: true,
              smsNotifications: false,
              weeklyReports: true,
              monthlyReports: true
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-15T10:30:00Z'
          }
        } as T;
      }
    }

    // Default mock response
    return {
      success: true,
      message: 'Mock response',
      data: {}
    } as T;
  }

  private async handleResponse<T>(response: Response, originalUrl: string, originalMethod: string, originalBody?: any): Promise<T> {
    // Handle 401 errors with automatic token refresh
    if (response.status === 401) {
      const authStore = useAuthStore.getState();
      
      if (authStore.refreshToken) {
        try {
          // Attempt to refresh the token
          const refreshResponse = await fetch(`${this._baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authStore.refreshToken}`
            }
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            
            if (refreshData.success && refreshData.data?.tokens) {
              // Update tokens in store
              authStore.updateTokens(
                refreshData.data.tokens.accessToken,
                refreshData.data.tokens.refreshToken
              );

              // Retry original request with new token
              const retryResponse = await fetch(originalUrl, {
                method: originalMethod,
                headers: {
                  ...this.getHeaders(),
                  'Authorization': `Bearer ${refreshData.data.tokens.accessToken}`
                },
                body: originalBody
              });

              return this.handleResponse(retryResponse, originalUrl, originalMethod, originalBody);
            }
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }

      // If refresh fails, redirect to login
      authStore.logout();
      window.location.href = '/login';
      throw new Error('Authentication failed');
    }

    // Handle other HTTP errors
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }

      throw new Error(errorMessage);
    }

    // Parse successful response
    try {
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error('Invalid JSON response');
    }
  }

  async get<T>(endpoint: string, includeAuth = true): Promise<T> {
    if (USE_MOCKS) {
      return this.mockResponse<T>(endpoint, 'GET');
    }

    const url = `${this._baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(includeAuth)
    });

    return this.handleResponse<T>(response, url, 'GET');
  }

  async post<T>(endpoint: string, data?: any, includeAuth = true): Promise<T> {
    if (USE_MOCKS) {
      return this.mockResponse<T>(endpoint, 'POST', data);
    }

    const url = `${this._baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(includeAuth),
      body: data ? JSON.stringify(data) : undefined
    });

    return this.handleResponse<T>(response, url, 'POST', data ? JSON.stringify(data) : undefined);
  }

  async put<T>(endpoint: string, data?: any, includeAuth = true): Promise<T> {
    if (USE_MOCKS) {
      return this.mockResponse<T>(endpoint, 'PUT', data);
    }

    const url = `${this._baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(includeAuth),
      body: data ? JSON.stringify(data) : undefined
    });

    return this.handleResponse<T>(response, url, 'PUT', data ? JSON.stringify(data) : undefined);
  }

  async patch<T>(endpoint: string, data?: any, includeAuth = true): Promise<T> {
    if (USE_MOCKS) {
      return this.mockResponse<T>(endpoint, 'PATCH', data);
    }

    const url = `${this._baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(includeAuth),
      body: data ? JSON.stringify(data) : undefined
    });

    return this.handleResponse<T>(response, url, 'PATCH', data ? JSON.stringify(data) : undefined);
  }

  async delete<T>(endpoint: string, includeAuth = true): Promise<T> {
    if (USE_MOCKS) {
      return this.mockResponse<T>(endpoint, 'DELETE');
    }

    const url = `${this._baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(includeAuth)
    });

    return this.handleResponse<T>(response, url, 'DELETE');
  }

  // Public methods (no authentication required)
  async publicGet<T>(endpoint: string): Promise<T> {
    return this.get<T>(endpoint, false);
  }

  async publicPost<T>(endpoint: string, data?: any): Promise<T> {
    return this.post<T>(endpoint, data, false);
  }

  async publicPut<T>(endpoint: string, data?: any): Promise<T> {
    return this.put<T>(endpoint, data, false);
  }

  async publicPatch<T>(endpoint: string, data?: any): Promise<T> {
    return this.patch<T>(endpoint, data, false);
  }

  async publicDelete<T>(endpoint: string): Promise<T> {
    return this.delete<T>(endpoint, false);
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient();