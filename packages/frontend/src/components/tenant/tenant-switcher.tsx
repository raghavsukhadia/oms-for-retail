'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Building2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

import { useTenantStore } from '@/store/tenantStore';
import { useSwitchTenant } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';

export function TenantSwitcher() {
  const { 
    currentTenant, 
    availableTenants, 
    canSwitchTenant,
    isSwitchingTenant 
  } = useTenantStore();
  const switchTenantMutation = useSwitchTenant();
  const [open, setOpen] = useState(false);

  if (!canSwitchTenant()) {
    return null;
  }

  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?.tenantId) return;
    
    try {
      await switchTenantMutation.mutateAsync(tenantId);
      setOpen(false);
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Failed to switch tenant:', error);
    }
  };

  const getTenantStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status as keyof typeof colors] || colors.inactive;
  };

  const getTierColor = (tier: string) => {
    const colors = {
      starter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      professional: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      enterprise: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[tier as keyof typeof colors] || colors.starter;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-[200px] justify-between"
          disabled={isSwitchingTenant || switchTenantMutation.isPending}
        >
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">
              {currentTenant?.tenantName || 'Select Workspace'}
            </span>
          </div>
          {isSwitchingTenant || switchTenantMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px]" align="start">
        <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableTenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.tenantId}
            onClick={() => handleTenantSwitch(tenant.tenantId)}
            className="flex items-center justify-between p-3 cursor-pointer"
            disabled={switchTenantMutation.isPending}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-lg">
                <Building2 className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium truncate">
                    {tenant.tenantName}
                  </p>
                  {tenant.tenantId === currentTenant?.tenantId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                
                <div className="flex items-center space-x-1 mt-1">
                  <Badge variant="secondary" className={`text-xs ${getTierColor(tenant.subscriptionTier)}`}>
                    {tenant.subscriptionTier}
                  </Badge>
                  <Badge variant="secondary" className={`text-xs ${getTenantStatusColor(tenant.status)}`}>
                    {tenant.status}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground truncate">
                  {tenant.subdomain}.omsms.com
                </p>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="text-muted-foreground">
          <Building2 className="mr-2 h-4 w-4" />
          Request access to another workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}