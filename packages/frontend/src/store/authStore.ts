import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant } from '@/types';

interface AuthState {
  // Authentication state
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  login: (user: User, tenant: Tenant, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  
  // Tenant switching for multi-tenant users
  switchTenant: (tenant: Tenant, token: string) => void;
  
  // Auto-login for development
  autoLogin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
      refreshToken: null,
      isHydrated: false,

      // Actions
      setUser: (user) => set({ user }),
      setTenant: (tenant) => set({ tenant }),
      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setLoading: (loading) => set({ isLoading: loading }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      // Auto-login for development
      autoLogin: async () => {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          try {
            // Import authApi dynamically to avoid circular imports
            const { authApi } = await import('@/lib/api/auth');
            
            // Attempt to login with demo credentials
            const response = await authApi.tenantLogin({
              subdomain: 'demo',
              email: 'admin@demo.com',
              password: 'admin123'
            });
            
            if (response.success && response.data) {
              const { user, tenant, tokens } = response.data;
              set({
                user,
                tenant,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                isAuthenticated: true,
                isLoading: false
              });
            }
          } catch (error) {
            console.warn('Auto-login failed:', error);
            // Fallback to demo data if login fails
            const demoUser = {
              userId: 'demo-user',
              email: 'admin@demo.com',
              firstName: 'Admin',
              lastName: 'User',
              role: 'admin',
              status: 'active',
              departmentId: null,
              locationId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            const demoTenant = {
              tenantId: 'demo-tenant',
              tenantName: 'Demo Organization',
              subdomain: 'demo',
              status: 'active',
              subscriptionTier: 'professional',
              features: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            set({
              user: demoUser,
              tenant: demoTenant,
              token: 'demo-token',
              refreshToken: 'demo-refresh-token',
              isAuthenticated: true,
              isLoading: false
            });
          }
        }
      },

      login: (user, tenant, accessToken, refreshToken) => set({
        user,
        tenant,
        token: accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      }),

      logout: () => set({
        user: null,
        tenant: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      }),

      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      updateTokens: (accessToken, refreshToken) => set({
        token: accessToken,
        refreshToken,
      }),

      switchTenant: (tenant, token) => set({
        tenant,
        token,
        isLoading: false,
      }),
    }),
    {
      name: 'omsms-auth-storage',
      // Only persist essential auth data
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // Handle rehydration to mark store as hydrated
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
          // Ensure isAuthenticated is properly set based on token existence
          if (state.token && state.user) {
            state.isAuthenticated = true;
          }
        }
      },
    }
  )
);