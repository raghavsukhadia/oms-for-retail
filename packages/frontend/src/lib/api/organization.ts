import { apiClient } from './client';
import { useAuthStore } from '@/store/authStore';

export interface OrganizationSettings {
  companyName: string;
  logo?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
  };
  contactInfo?: {
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
  gstDetails?: {
    gstNumber?: string | null;
    panNumber?: string | null;
    registrationDate?: string | null;
  };
  bankDetails?: BankDetails[];
  qrCodes?: QRCode[];
  branding?: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
    faviconUrl?: string | null;
  };
  businessSettings?: {
    businessType?: string | null;
    establishedYear?: number | null;
    licenseNumber?: string | null;
    certifications?: string[];
  };
}

export interface BankDetails {
  id?: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  accountType: 'savings' | 'current' | 'cc' | 'od';
  branchName?: string | null;
  isDefault?: boolean;
}

export interface QRCode {
  id?: string;
  name: string;
  type: 'payment' | 'contact' | 'website' | 'custom';
  content: string;
  description?: string | null;
  isActive?: boolean;
}

export const organizationApi = {
  // Get organization settings
  getSettings: async (): Promise<OrganizationSettings> => {
    const response = await apiClient.get('/organization/settings');
    return response.data;
  },

  // Update organization settings
  updateSettings: async (settings: Partial<OrganizationSettings>): Promise<void> => {
    console.log('Sending organization settings update:', settings);
    try {
      const response = await apiClient.put('/organization/settings', settings);
      console.log('Organization settings update response:', response);
      return response.data;
    } catch (error) {
      console.error('Error updating organization settings:', error);
      throw error;
    }
  },

  // Upload organization logo
  uploadLogo: async (file: File): Promise<{ logoUrl: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    
    // For file uploads, we need to override the default headers
    // Don't set Content-Type - let the browser set it with boundary
    // Validate API URL exists
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
    }
    
    const response = await fetch(`${apiUrl}/organization/logo`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
        'Authorization': `Bearer ${useAuthStore.getState().token}`,
        'X-Tenant-ID': useAuthStore.getState().tenant?.subdomain || 'demo',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Upload failed');
    }

    const data = await response.json();
    return data.data;
  },

  // Delete bank details
  deleteBankDetails: async (bankId: string): Promise<void> => {
    await apiClient.delete(`/organization/bank-details/${bankId}`);
  },

  // Delete QR code
  deleteQRCode: async (qrId: string): Promise<void> => {
    await apiClient.delete(`/organization/qr-codes/${qrId}`);
  },
};
