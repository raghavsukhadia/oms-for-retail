// Financial resource and action constants
const FINANCIAL_RESOURCES = {
  PAYMENTS: 'payments',
  INVOICES: 'invoices', 
  PRICING: 'pricing',
  FINANCIAL_REPORTS: 'financial_reports',
  COST_ANALYSIS: 'cost_analysis',
  ACCOUNT_STATEMENTS: 'account_statements',
  REVENUE_DATA: 'revenue_data'
} as const;

const FINANCIAL_ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  EXPORT: 'export',
  SEND: 'send',
  MANAGE_DISCOUNTS: 'manage_discounts',
  VIEW_DETAILED: 'view_detailed',
  VIEW_PROFIT_MARGINS: 'view_profit_margins'
} as const;

/**
 * Permission utility functions for frontend components
 */

export interface UserPermissions {
  [key: string]: boolean | string[];
}

export interface User {
  permissions?: UserPermissions;
  role?: string;
  roleName?: string;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: User | null, resource: string, action: string): boolean {
  if (!user || !user.permissions) {
    return false;
  }

  // Check admin wildcard permission
  if (user.permissions['*']) {
    return true;
  }

  // Check specific permission key
  const permissionKey = `${resource}.${action}`;
  if (user.permissions[permissionKey]) {
    return true;
  }

  // Check if permissions are stored as arrays (alternative format)
  const resourcePermissions = user.permissions[resource];
  if (Array.isArray(resourcePermissions)) {
    return resourcePermissions.includes(action);
  }

  return false;
}

/**
 * Check if user has any permission for a resource
 */
export function hasAnyPermission(user: User | null, resource: string, actions: string[]): boolean {
  if (!user) return false;
  
  return actions.some(action => hasPermission(user, resource, action));
}

/**
 * Check if user has all permissions for a resource
 */
export function hasAllPermissions(user: User | null, resource: string, actions: string[]): boolean {
  if (!user) return false;
  
  return actions.every(action => hasPermission(user, resource, action));
}

/**
 * Financial permission helpers
 */

export function canViewPayments(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.PAYMENTS, FINANCIAL_ACTIONS.VIEW);
}

export function canCreatePayments(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.PAYMENTS, FINANCIAL_ACTIONS.CREATE);
}

export function canUpdatePayments(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.PAYMENTS, FINANCIAL_ACTIONS.UPDATE);
}

export function canApprovePayments(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.PAYMENTS, FINANCIAL_ACTIONS.APPROVE);
}

export function canExportPayments(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.PAYMENTS, FINANCIAL_ACTIONS.EXPORT);
}

export function canViewInvoices(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.INVOICES, FINANCIAL_ACTIONS.VIEW);
}

export function canCreateInvoices(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.INVOICES, FINANCIAL_ACTIONS.CREATE);
}

export function canUpdateInvoices(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.INVOICES, FINANCIAL_ACTIONS.UPDATE);
}

export function canSendInvoices(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.INVOICES, FINANCIAL_ACTIONS.SEND);
}

export function canExportInvoices(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.INVOICES, FINANCIAL_ACTIONS.EXPORT);
}

export function canViewPricing(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.PRICING, FINANCIAL_ACTIONS.VIEW);
}

export function canUpdatePricing(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.PRICING, FINANCIAL_ACTIONS.UPDATE);
}

export function canManageDiscounts(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.PRICING, FINANCIAL_ACTIONS.MANAGE_DISCOUNTS);
}

export function canViewFinancialReports(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.FINANCIAL_REPORTS, FINANCIAL_ACTIONS.VIEW);
}

export function canExportFinancialReports(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.FINANCIAL_REPORTS, FINANCIAL_ACTIONS.EXPORT);
}

export function canViewDetailedFinancialReports(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.FINANCIAL_REPORTS, FINANCIAL_ACTIONS.VIEW_DETAILED);
}

export function canViewCostAnalysis(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.COST_ANALYSIS, FINANCIAL_ACTIONS.VIEW);
}

export function canExportCostAnalysis(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.COST_ANALYSIS, FINANCIAL_ACTIONS.EXPORT);
}

export function canViewAccountStatements(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.ACCOUNT_STATEMENTS, FINANCIAL_ACTIONS.VIEW);
}

export function canExportAccountStatements(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.ACCOUNT_STATEMENTS, FINANCIAL_ACTIONS.EXPORT);
}

export function canViewRevenueData(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.REVENUE_DATA, FINANCIAL_ACTIONS.VIEW);
}

export function canExportRevenueData(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.REVENUE_DATA, FINANCIAL_ACTIONS.EXPORT);
}

export function canViewProfitMargins(user: User | null): boolean {
  return hasPermission(user, FINANCIAL_RESOURCES.REVENUE_DATA, FINANCIAL_ACTIONS.VIEW_PROFIT_MARGINS);
}

/**
 * Check if user has any financial permissions
 */
export function hasAnyFinancialPermission(user: User | null): boolean {
  if (!user) return false;

  const financialResources = Object.values(FINANCIAL_RESOURCES);
  const financialActions = Object.values(FINANCIAL_ACTIONS);

  return financialResources.some(resource =>
    financialActions.some(action =>
      hasPermission(user, resource, action)
    )
  );
}

/**
 * Get user's financial permission level (for UI display)
 */
export function getFinancialPermissionLevel(user: User | null): 'none' | 'basic' | 'operational' | 'full' {
  if (!user) return 'none';

  // Check for admin wildcard
  if (user.permissions?.['*']) return 'full';

  // Check for full financial access
  if (canViewProfitMargins(user) && canApprovePayments(user) && canManageDiscounts(user)) {
    return 'full';
  }

  // Check for operational access
  if (canUpdatePayments(user) && canCreateInvoices(user) && canViewFinancialReports(user)) {
    return 'operational';
  }

  // Check for basic access
  if (canViewPayments(user) || canViewInvoices(user) || canViewPricing(user)) {
    return 'basic';
  }

  return 'none';
}

/**
 * Permission-based component wrapper
 */
export interface PermissionWrapperProps {
  user: User | null;
  resource: string;
  action: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionWrapper({ 
  user, 
  resource, 
  action, 
  fallback = null, 
  children 
}: PermissionWrapperProps) {
  if (!hasPermission(user, resource, action)) {
    return fallback;
  }
  
  return children;
}

/**
 * Financial permission wrapper
 */
export interface FinancialPermissionWrapperProps {
  user: User | null;
  requiredLevel?: 'basic' | 'operational' | 'full';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FinancialPermissionWrapper({ 
  user, 
  requiredLevel = 'basic', 
  fallback = null, 
  children 
}: FinancialPermissionWrapperProps) {
  const userLevel = getFinancialPermissionLevel(user);
  
  const levelHierarchy = {
    'none': 0,
    'basic': 1,
    'operational': 2,
    'full': 3
  };
  
  if (levelHierarchy[userLevel] < levelHierarchy[requiredLevel]) {
    return fallback;
  }
  
  return children;
}

/**
 * Role-based permission helpers
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin' || user?.roleName === 'admin';
}

export function isManager(user: User | null): boolean {
  return user?.role === 'manager' || user?.roleName === 'manager';
}

export function isFinancialRole(user: User | null): boolean {
  const financialRoles = ['admin', 'manager', 'financial_manager', 'accountant'];
  return financialRoles.includes(user?.role || '') || 
         financialRoles.includes(user?.roleName || '');
}

/**
 * Get user's accessible financial features
 */
export function getAccessibleFinancialFeatures(user: User | null): string[] {
  if (!user) return [];

  const features: string[] = [];

  if (canViewPayments(user)) features.push('payments');
  if (canViewInvoices(user)) features.push('invoices');
  if (canViewPricing(user)) features.push('pricing');
  if (canViewFinancialReports(user)) features.push('financial_reports');
  if (canViewCostAnalysis(user)) features.push('cost_analysis');
  if (canViewAccountStatements(user)) features.push('account_statements');
  if (canViewRevenueData(user)) features.push('revenue_data');

  return features;
}
