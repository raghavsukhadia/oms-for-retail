'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { organizationApi } from '@/lib/api/organization';
import type { OrganizationSettings } from '@/lib/api/organization';
import { useAuthStore } from '@/store/authStore';

interface OrganizationContextType {
  organization: OrganizationSettings | null;
  loading: boolean;
  error: string | null;
  refreshOrganization: () => Promise<void>;
  updateOrganization: (settings: Partial<OrganizationSettings>) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const refreshOrganization = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await organizationApi.getSettings();
      console.log('Organization data loaded:', data);
      setOrganization(data);
    } catch (err) {
      console.error('Error loading organization settings:', err);
      setError('Failed to load organization settings');
      // Set default organization data if loading fails
      setOrganization({
        companyName: '',
        logo: null,
        address: {},
        contactInfo: {},
        gstDetails: {},
        bankDetails: [],
        qrCodes: [],
        branding: {},
        businessSettings: {},
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrganization = async (settings: Partial<OrganizationSettings>) => {
    try {
      await organizationApi.updateSettings(settings);
      // Update local state
      setOrganization(prev => prev ? { ...prev, ...settings } : null);
    } catch (err) {
      console.error('Error updating organization settings:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      refreshOrganization();
    }
  }, [user]);

  const value: OrganizationContextType = {
    organization,
    loading,
    error,
    refreshOrganization,
    updateOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

// Hook to get organization logo with fallback
export function useOrganizationLogo() {
  const { organization } = useOrganization();
  
  const originalLogoUrl = organization?.logo || organization?.branding?.logoUrl;
  // Proxy the logo URL through Next.js API to avoid CORS issues
  const logoUrl = originalLogoUrl ? `/api/proxy-image?url=${encodeURIComponent(originalLogoUrl)}` : null;
  const companyName = organization?.companyName || 'Your Company';
  
  return {
    logoUrl,
    companyName,
    hasLogo: !!logoUrl,
  };
}

// Hook to get organization branding
export function useOrganizationBranding() {
  const { organization } = useOrganization();
  
  return {
    primaryColor: organization?.branding?.primaryColor || '#3b82f6',
    secondaryColor: organization?.branding?.secondaryColor || '#64748b',
    accentColor: organization?.branding?.accentColor || '#10b981',
    companyName: organization?.companyName || 'Your Company',
  };
}
