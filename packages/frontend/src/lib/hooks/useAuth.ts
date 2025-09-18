'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import type { 
  LoginFormData, 
  RegisterFormData, 
  ForgotPasswordFormData,
  ResetPasswordFormData,
  TenantLoginFormData 
} from '@/lib/validations/auth';

// Auth query keys
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
  tenants: () => [...authKeys.all, 'tenants'] as const,
};

// Use auth profile query
export function useAuthProfile() {
  const { isAuthenticated, token } = useAuthStore();
  
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: authApi.getProfile,
    enabled: isAuthenticated && !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

// Use available tenants query
export function useAuthTenants() {
  const { isAuthenticated, token } = useAuthStore();
  
  return useQuery({
    queryKey: authKeys.tenants(),
    queryFn: authApi.getTenants,
    enabled: isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Login mutation
export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { login } = useAuthStore();
  const { setCurrentTenant, setAvailableTenants } = useTenantStore();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { user, tenant, token } = response.data;
        login(user, tenant, token);
        setCurrentTenant(tenant);
        setAvailableTenants([tenant]);
        
        // Invalidate auth queries
        queryClient.invalidateQueries({ queryKey: authKeys.all });
        
        router.push('/dashboard');
      }
    },
  });
}

// Tenant login mutation
export function useTenantLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { login } = useAuthStore();
  const { setCurrentTenant, setAvailableTenants } = useTenantStore();

  return useMutation({
    mutationFn: authApi.tenantLogin,
    onSuccess: async (response) => {
      if (response.success && response.data) {
        const { user, tenant, token } = response.data;
        login(user, tenant, token);
        setCurrentTenant(tenant);
        
        // Fetch additional tenants
        try {
          const tenantsResponse = await authApi.getTenants();
          if (tenantsResponse.success && tenantsResponse.data) {
            setAvailableTenants(tenantsResponse.data.tenants);
          }
        } catch (err) {
          setAvailableTenants([tenant]);
        }
        
        // Invalidate auth queries
        queryClient.invalidateQueries({ queryKey: authKeys.all });
        
        router.push('/dashboard');
      }
    },
  });
}

// Register mutation
export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { login } = useAuthStore();
  const { setCurrentTenant, setAvailableTenants } = useTenantStore();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { user, tenant, token } = response.data;
        login(user, tenant, token);
        setCurrentTenant(tenant);
        setAvailableTenants([tenant]);
        
        // Invalidate auth queries
        queryClient.invalidateQueries({ queryKey: authKeys.all });
        
        router.push('/dashboard');
      }
    },
  });
}

// Logout mutation
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const { setCurrentTenant, setAvailableTenants } = useTenantStore();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Clear all state regardless of API response
      logout();
      setCurrentTenant(null);
      setAvailableTenants([]);
      
      // Clear all queries
      queryClient.clear();
      
      router.push('/login');
    },
  });
}

// Forgot password mutation
export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
  });
}

// Reset password mutation
export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: (response) => {
      if (response.success) {
        // Redirect to login after successful reset
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    },
  });
}

// Switch tenant mutation
export function useSwitchTenant() {
  const queryClient = useQueryClient();
  const { switchTenant } = useAuthStore();
  const { setCurrentTenant, setSwitchingTenant, getTenantById } = useTenantStore();

  return useMutation({
    mutationFn: authApi.switchTenant,
    onMutate: (tenantId) => {
      setSwitchingTenant(true);
    },
    onSuccess: (response, tenantId) => {
      if (response.success && response.data) {
        const { tenant, token } = response.data;
        switchTenant(tenant, token);
        setCurrentTenant(tenant);
        
        // Invalidate all queries for new tenant context
        queryClient.invalidateQueries();
      }
    },
    onSettled: () => {
      setSwitchingTenant(false);
    },
  });
}

// Check if user is authenticated
export function useIsAuthenticated() {
  const { isAuthenticated, token } = useAuthStore();
  return isAuthenticated && !!token;
}