/**
 * Hook to manage department colors across the application
 * Ensures single version of truth by loading actual department colors from API
 */

import { useEffect, useState } from 'react';
import { setDepartmentColor, clearDepartmentColorCache } from '@/lib/utils/department-colors';
import { departmentApi, type DepartmentWithRelations } from '@/lib/api/masterData';
import { useAuthStore } from '@/store/authStore';

export function useDepartmentColors() {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentWithRelations[]>([]);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadDepartmentColors();
    }
  }, [isHydrated, isAuthenticated]);

  const loadDepartmentColors = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clear existing cache to ensure fresh data
      clearDepartmentColorCache();

      // Fetch departments from API
      const response = await departmentApi.getActiveDepartments();
      
      if (response.success && response.data) {
        const departmentList = response.data;
        setDepartments(departmentList);

        // Cache the actual department colors
        // console.log('Loading department colors from API:', departmentList);
        departmentList.forEach((dept) => {
          if (dept.colorCode && dept.status === 'active') {
            // console.log('Setting department color:', dept.departmentName, '->', dept.colorCode);
            setDepartmentColor(dept.departmentName, dept.colorCode);
          } else {
            // console.log('Skipping department (no color or inactive):', dept.departmentName, 'Status:', dept.status, 'Color:', dept.colorCode);
          }
        });
      } else {
        throw new Error(response.error || 'Failed to load departments');
      }
    } catch (err) {
      console.error('Error loading department colors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load department colors');
    } finally {
      setLoading(false);
    }
  };

  const refreshDepartmentColors = () => {
    loadDepartmentColors();
  };

  return {
    loading,
    error,
    departments,
    refreshDepartmentColors,
  };
}
