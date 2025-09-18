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