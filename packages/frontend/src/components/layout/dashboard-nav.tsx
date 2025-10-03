'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  BarChart3, 
  Settings, 
  Shield,
  ChevronRight,
  ChevronDown,
  MapPin,
  Building,
  UserCircle,
  Building2,
  Phone,
  Wrench,
  ClipboardList,
  Activity
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { useAuthStore } from '@/store/authStore';
import { hasRequiredRole, ROLES } from '@/components/auth/protected-route';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  requiredRole?: string[];
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Vehicle Records',
    href: '/vehicle-records',
    icon: Car,
  },
  {
    title: 'Vehicle Inward',
    href: '/vehicles/inward',
    icon: Car,
  },
  {
    title: 'Tracker',
    href: '/tracker',
    icon: Activity,
    children: [
      {
        title: 'Call Follow-Up',
        href: '/tracker/call-follow-up',
        icon: Phone,
      },
      {
        title: 'Service Tracker',
        href: '/tracker/service',
        icon: Wrench,
      },
      {
        title: 'Customer Requirements',
        href: '/tracker/requirements',
        icon: ClipboardList,
      },
    ],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    requiredRole: [ROLES.COORDINATOR, ROLES.MANAGER, ROLES.ADMIN],
    children: [
      {
        title: 'Overview',
        href: '/reports',
        icon: BarChart3,
      },
      {
        title: 'Vehicle Inward',
        href: '/reports/vehicle-inward',
        icon: Car,
      },
      {
        title: 'Vehicle Installation',
        href: '/reports/vehicle-installation',
        icon: Settings,
      },
      {
        title: 'Vehicle Detailed',
        href: '/reports/vehicle-detailed',
        icon: LayoutDashboard,
      },
      {
        title: 'Account Reports',
        href: '/reports/accounts',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'Team',
    href: '/users',
    icon: Users,
    requiredRole: [ROLES.SUPERVISOR, ROLES.COORDINATOR, ROLES.MANAGER, ROLES.ADMIN],
    children: [
      {
        title: 'All Users',
        href: '/users',
        icon: Users,
      },
      {
        title: 'Departments',
        href: '/departments',
        icon: Building,
        requiredRole: [ROLES.MANAGER, ROLES.ADMIN],
      },
      {
        title: 'Locations',
        href: '/locations',
        icon: MapPin,
        requiredRole: [ROLES.MANAGER, ROLES.ADMIN],
      },
      {
        title: 'Roles',
        href: '/roles',
        icon: Shield,
        requiredRole: [ROLES.ADMIN],
      },
    ],
  },

];

const adminItems: NavItem[] = [
  {
    title: 'Administration',
    href: '/admin',
    icon: Shield,
    requiredRole: [ROLES.ADMIN],
    children: [
      {
        title: 'Organization Settings',
        href: '/settings',
        icon: Building2,
        requiredRole: [ROLES.ADMIN, ROLES.MANAGER],
      },
      {
        title: 'Tenant Settings',
        href: '/admin/tenant',
        icon: Building,
        requiredRole: [ROLES.ADMIN],
      },
      {
        title: 'User Management',
        href: '/admin/users',
        icon: UserCircle,
        requiredRole: [ROLES.ADMIN],
      },
      {
        title: 'System Settings',
        href: '/admin/settings',
        icon: Settings,
        requiredRole: [ROLES.ADMIN],
      },
    ],
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const canAccessItem = (item: NavItem) => {
    if (!item.requiredRole || !user?.role) return true;
    return item.requiredRole.some(role => hasRequiredRole(user.role, role));
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const isExpanded = (href: string) => expandedItems.includes(href);

  const renderNavItem = (item: NavItem, level = 0) => {
    if (!canAccessItem(item)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const expanded = isExpanded(item.href);
    const active = isActive(item.href);

    const ItemIcon = item.icon;

    return (
      <div key={item.href}>
        {hasChildren ? (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-10 px-4",
              level > 0 && "pl-8",
              active && "bg-secondary text-secondary-foreground"
            )}
            onClick={() => toggleExpanded(item.href)}
          >
            <ItemIcon className="mr-3 h-4 w-4" />
            <span className="flex-1 text-left">{item.title}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {item.badge}
              </Badge>
            )}
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-10 px-4",
              level > 0 && "pl-8",
              active && "bg-secondary text-secondary-foreground"
            )}
            asChild
          >
            <Link href={item.href}>
              <ItemIcon className="mr-3 h-4 w-4" />
              <span className="flex-1 text-left">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          </Button>
        )}
        
        {hasChildren && expanded && (
          <div className="ml-4 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto p-4">
          <nav className="space-y-2">
            {navigationItems.map(item => renderNavItem(item))}
            
            {/* Admin Section */}
            {user?.role && hasRequiredRole(user.role, ROLES.ADMIN) && (
              <>
                <Separator className="my-4" />
                {adminItems.map(item => renderNavItem(item))}
              </>
            )}
          </nav>
        </div>

        {/* Footer - Settings moved to Administration section */}
        <div className="border-t p-4">
          <div className="text-xs text-muted-foreground text-center">
            OMSMS v1.0
          </div>
        </div>
      </div>
    </aside>
  );
}