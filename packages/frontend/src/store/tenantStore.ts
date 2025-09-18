import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tenant } from '@/types';

interface TenantState {
  // Current tenant context
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoadingTenants: boolean;
  
  // Tenant switching state
  isSwitchingTenant: boolean;
  isHydrated: boolean;
  
  // Actions
  setCurrentTenant: (tenant: Tenant | null) => void;
  setAvailableTenants: (tenants: Tenant[]) => void;
  setLoadingTenants: (loading: boolean) => void;
  setSwitchingTenant: (switching: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  addTenant: (tenant: Tenant) => void;
  removeTenant: (tenantId: string) => void;
  updateTenant: (tenantId: string, updates: Partial<Tenant>) => void;
  
  // Utilities
  getTenantById: (tenantId: string) => Tenant | null;
  hasTenant: (tenantId: string) => boolean;
  canSwitchTenant: () => boolean;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
  // Initial state
  currentTenant: null,
  availableTenants: [],
  isLoadingTenants: false,
  isSwitchingTenant: false,
  isHydrated: false,

  // Actions
  setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
  
  setAvailableTenants: (tenants) => set({ availableTenants: tenants }),
  
  setLoadingTenants: (loading) => set({ isLoadingTenants: loading }),
  
  setSwitchingTenant: (switching) => set({ isSwitchingTenant: switching }),

  setHydrated: (hydrated) => set({ isHydrated: hydrated }),

  addTenant: (tenant) => {
    const { availableTenants } = get();
    if (!availableTenants.find(t => t.tenantId === tenant.tenantId)) {
      set({ availableTenants: [...availableTenants, tenant] });
    }
  },

  removeTenant: (tenantId) => {
    const { availableTenants } = get();
    set({
      availableTenants: availableTenants.filter(t => t.tenantId !== tenantId)
    });
  },

  updateTenant: (tenantId, updates) => {
    const { availableTenants, currentTenant } = get();
    
    // Update in available tenants list
    const updatedTenants = availableTenants.map(tenant =>
      tenant.tenantId === tenantId ? { ...tenant, ...updates } : tenant
    );
    
    // Update current tenant if it's the one being updated
    const updatedCurrentTenant = currentTenant?.tenantId === tenantId
      ? { ...currentTenant, ...updates }
      : currentTenant;

    set({
      availableTenants: updatedTenants,
      currentTenant: updatedCurrentTenant,
    });
  },

  // Utilities
  getTenantById: (tenantId) => {
    const { availableTenants } = get();
    return availableTenants.find(t => t.tenantId === tenantId) || null;
  },

  hasTenant: (tenantId) => {
    const { availableTenants } = get();
    return availableTenants.some(t => t.tenantId === tenantId);
  },

  canSwitchTenant: () => {
    const { availableTenants } = get();
    return availableTenants.length > 1;
  },
}),
{
  name: 'omsms-tenant-storage',
  // Only persist essential tenant data
  partialize: (state) => ({
    currentTenant: state.currentTenant,
    availableTenants: state.availableTenants,
  }),
  // Handle rehydration to mark store as hydrated
  onRehydrateStorage: () => (state) => {
    if (state) {
      state.setHydrated(true);
    }
  },
}
)
);