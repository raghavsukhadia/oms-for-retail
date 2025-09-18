import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check financial permissions
 */
export const requireFinancialPermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const permissions = req.user.permissions || {};
    const permissionKey = `${resource}.${action}`;
    
    // Check if user has admin wildcard permission
    if (permissions['*']) {
      next();
      return;
    }

    // Check specific permission
    if (permissions[permissionKey]) {
      next();
      return;
    }

    // Check if user has the permission in their role permissions
    const resourcePermissions = permissions[resource];
    if (Array.isArray(resourcePermissions) && resourcePermissions.includes(action)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Insufficient financial permissions',
      code: 'INSUFFICIENT_FINANCIAL_PERMISSIONS',
      required: permissionKey,
      current: Object.keys(permissions).filter(key => key.startsWith(resource))
    });
  };
};

/**
 * Middleware to check payment permissions
 */
export const requirePaymentPermission = (action: string) => {
  return requireFinancialPermission('payments', action);
};

/**
 * Middleware to check invoice permissions
 */
export const requireInvoicePermission = (action: string) => {
  return requireFinancialPermission('invoices', action);
};

/**
 * Middleware to check pricing permissions
 */
export const requirePricingPermission = (action: string) => {
  return requireFinancialPermission('pricing', action);
};

/**
 * Middleware to check financial reports permissions
 */
export const requireFinancialReportsPermission = (action: string) => {
  return requireFinancialPermission('financial_reports', action);
};

/**
 * Middleware to check cost analysis permissions
 */
export const requireCostAnalysisPermission = (action: string) => {
  return requireFinancialPermission('cost_analysis', action);
};

/**
 * Middleware to check account statements permissions
 */
export const requireAccountStatementsPermission = (action: string) => {
  return requireFinancialPermission('account_statements', action);
};

/**
 * Middleware to check revenue data permissions
 */
export const requireRevenueDataPermission = (action: string) => {
  return requireFinancialPermission('revenue_data', action);
};

/**
 * Middleware to check if user can view profit margins
 */
export const requireProfitMarginAccess = () => {
  return requireFinancialPermission('revenue_data', 'view_profit_margins');
};

/**
 * Middleware to check if user can approve payments
 */
export const requirePaymentApprovalAccess = () => {
  return requireFinancialPermission('payments', 'approve');
};

/**
 * Middleware to check if user can manage discounts
 */
export const requireDiscountManagementAccess = () => {
  return requireFinancialPermission('pricing', 'manage_discounts');
};

/**
 * Helper function to check if user has any financial permissions
 */
export const hasAnyFinancialPermission = (req: Request): boolean => {
  if (!req.user || !req.user.permissions) {
    return false;
  }

  const permissions = req.user.permissions;
  
  // Check admin wildcard
  if (permissions['*']) {
    return true;
  }

  // Check any financial resource permissions
  const financialResources = ['payments', 'invoices', 'pricing', 'financial_reports', 'cost_analysis', 'account_statements', 'revenue_data'];
  return financialResources.some(resource => {
    return Object.keys(permissions).some(key => key.startsWith(resource));
  });
};

/**
 * Middleware to check if user has any financial access
 */
export const requireAnyFinancialAccess = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!hasAnyFinancialPermission(req)) {
      res.status(403).json({
        success: false,
        error: 'No financial permissions',
        code: 'NO_FINANCIAL_ACCESS'
      });
      return;
    }

    next();
  };
};
