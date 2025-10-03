import { useState, useEffect, useCallback } from 'react';
import { vehicleApi, type VehicleWithRelations } from '@/lib/api/vehicles';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export interface VehicleWithWorkflows extends VehicleWithRelations {
  workflowInstances?: Array<{
    workflowType: string;
    currentStage: string;
    status: string;
  }>;
}

interface UseVehiclesOptions {
  includeWorkflows?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseVehiclesReturn {
  vehicles: VehicleWithWorkflows[];
  loading: boolean;
  error: string | null;
  refreshVehicles: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Custom hook for fetching and managing vehicle data with consistent workflow information
 * This ensures both dashboard and vehicle records use the same data source
 */
export function useVehicles(options: UseVehiclesOptions = {}): UseVehiclesReturn {
  const {
    includeWorkflows = true,
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds default
  } = options;

  const { isAuthenticated, isHydrated } = useAuthStore();
  const [vehicles, setVehicles] = useState<VehicleWithWorkflows[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = includeWorkflows ? { include: 'workflows,salesperson,coordinator,supervisor,location' } : { include: 'salesperson,location' };
      const response = await vehicleApi.getVehicles(params);
      
      if (response.success && response.data) {
        setVehicles(response.data);
        setLastUpdated(new Date());
        
        // Log workflow data for debugging
        if (includeWorkflows) {
          console.log('🔄 [VEHICLES HOOK] Fetched vehicles with workflows:', {
            totalVehicles: response.data.length,
            vehiclesWithWorkflows: response.data.filter(v => v.workflowInstances?.length).length,
            workflowSummary: response.data.map(v => ({
              vehicleId: v.vehicleId,
              carNumber: v.carNumber,
              workflowCount: v.workflowInstances?.length || 0
            }))
          });
        }
      } else {
        const errorMsg = `Failed to fetch vehicles: ${response.error || 'Unknown error'}`;
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      const errorMsg = `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(errorMsg);
      toast.error("Network error loading vehicles");
    } finally {
      setLoading(false);
    }
  }, [includeWorkflows]);

  // Initial fetch - wait for auth hydration
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      fetchVehicles();
    }
  }, [fetchVehicles, isHydrated, isAuthenticated]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchVehicles();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchVehicles]);

  return {
    vehicles,
    loading,
    error,
    refreshVehicles: fetchVehicles,
    lastUpdated
  };
}
