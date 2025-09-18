'use client';

import { Building2, Bell, Settings, LogOut, ChevronDown, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';

import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { useLogout } from '@/lib/hooks/useAuth';
import { TenantSwitcher } from '@/components/tenant/tenant-switcher';
import { useOrganizationLogo, useOrganizationBranding } from '@/lib/providers/organization-provider';
import type { User } from '@/types';

export function DashboardHeader() {
  const { user } = useAuthStore();
  const { currentTenant } = useTenantStore();
  const logoutMutation = useLogout();
  const { logoUrl, companyName, hasLogo } = useOrganizationLogo();
  const { primaryColor } = useOrganizationBranding();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getUserInitials = (user: User | null) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = (user: User | null) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      coordinator: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      supervisor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      salesperson: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      installer: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[role as keyof typeof colors] || colors.installer;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left Side - Logo and Tenant */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {hasLogo && logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${companyName} Logo`}
                className="h-8 w-8 object-contain rounded"
                onError={(e) => {
                  // Fallback to default icon if logo fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <Building2 
              className={`h-8 w-8 text-primary ${hasLogo ? 'hidden' : ''}`} 
              style={{ color: primaryColor }}
            />
            <div>
              <h1 className="text-xl font-bold">{companyName}</h1>
              <p className="text-xs text-muted-foreground">
                Vehicle Accessory Management
              </p>
            </div>
          </div>
          
          {/* Tenant Switcher */}
          <TenantSwitcher />
        </div>

        {/* Right Side - Actions and Profile */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-auto px-2">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar || ''} alt={getUserDisplayName(user)} />
                    <AvatarFallback>
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium leading-none">
                      {getUserDisplayName(user)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium leading-none">
                    {getUserDisplayName(user)}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  {user?.role && (
                    <Badge variant="secondary" className={`text-xs w-fit ${getRoleColor(typeof user.role === 'string' ? user.role : 'user')}`}>
                      {(() => {
                        const roleName = typeof user.role === 'string' ? user.role : 'user';
                        return roleName.charAt(0).toUpperCase() + roleName.slice(1);
                      })()}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-red-600 dark:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}