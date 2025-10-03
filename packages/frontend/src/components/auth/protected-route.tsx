'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = [],
  redirectTo = '/login',
  fallback
}: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const { isAuthenticated, user, token, isHydrated: authHydrated } = useAuthStore();
  const { currentTenant, isHydrated: tenantHydrated } = useTenantStore();

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for both stores to be hydrated from localStorage
      if (!authHydrated || !tenantHydrated) {
        return; // Wait for hydration before checking auth
      }

      // Check if user is authenticated
      if (!isAuthenticated || !token) {
        // Auto-login for development
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          try {
            await useAuthStore.getState().autoLogin();
            // After auto-login, check again
            const { isAuthenticated: newAuth, token: newToken } = useAuthStore.getState();
            if (!newAuth || !newToken) {
              router.push(redirectTo);
              return;
            }
          } catch (error) {
            console.warn('Auto-login failed:', error);
            router.push(redirectTo);
            return;
          }
        } else {
          router.push(redirectTo);
          return;
        }
      }

      // Check if user object exists
      if (!user) {
        router.push(redirectTo);
        return;
      }

      // Check if tenant is required and exists
      if (!currentTenant) {
        // For multi-tenant apps, tenant is required
        router.push('/tenant-login');
        return;
      }

      // Check role-based access
      if (requiredRole.length > 0 && user.role) {
        if (!requiredRole.includes(user.role)) {
          router.push('/unauthorized');
          return;
        }
      }

      // Check if user account is active
      if (user.status !== 'active') {
        router.push('/account-suspended');
        return;
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, user, token, currentTenant, requiredRole, redirectTo, router, authHydrated, tenantHydrated]);

  // Show loading state while checking
  if (isChecking) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            {(!authHydrated || !tenantHydrated) ? 'Loading authentication state...' : 'Verifying access...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component for protecting pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredRole?: string[];
    redirectTo?: string;
  }
) {
  const WrappedComponent = (props: P) => {
    return (
      <ProtectedRoute 
        requiredRole={options?.requiredRole}
        redirectTo={options?.redirectTo}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Role-based protection utilities
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  COORDINATOR: 'coordinator',
  SUPERVISOR: 'supervisor',
  SALESPERSON: 'salesperson',
  INSTALLER: 'installer',
} as const;

export const ROLE_HIERARCHIES: Record<string, string[]> = {
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.MANAGER, ROLES.COORDINATOR, ROLES.SUPERVISOR, ROLES.SALESPERSON, ROLES.INSTALLER],
  [ROLES.MANAGER]: [ROLES.MANAGER, ROLES.COORDINATOR, ROLES.SUPERVISOR, ROLES.SALESPERSON, ROLES.INSTALLER],
  [ROLES.COORDINATOR]: [ROLES.COORDINATOR, ROLES.SUPERVISOR, ROLES.SALESPERSON, ROLES.INSTALLER],
  [ROLES.SUPERVISOR]: [ROLES.SUPERVISOR, ROLES.SALESPERSON, ROLES.INSTALLER],
  [ROLES.SALESPERSON]: [ROLES.SALESPERSON],
  [ROLES.INSTALLER]: [ROLES.INSTALLER],
};

// Helper function to check if user has required access level
export function hasRequiredRole(userRole: string | any, requiredRole: string): boolean {
  // Handle both old string format and new object format
  const roleName = typeof userRole === 'string' ? userRole : userRole?.roleName || userRole?.role?.roleName;
  
  if (!roleName) return false;
  
  const userHierarchy = ROLE_HIERARCHIES[roleName];
  return userHierarchy ? userHierarchy.includes(requiredRole) : false;
}