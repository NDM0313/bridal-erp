/**
 * Role-Based Access Control (RBAC) Types
 * Defines system roles and their permissions
 */

export type UserRole = 'admin' | 'manager' | 'cashier' | 'auditor';

export interface RolePermissions {
  // Products
  canViewProducts: boolean;
  canCreateProducts: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;

  // Sales
  canViewSales: boolean;
  canCreateSales: boolean;
  canEditSales: boolean;
  canDeleteSales: boolean;
  canFinalizeSales: boolean;

  // Purchases
  canViewPurchases: boolean;
  canCreatePurchases: boolean;
  canEditPurchases: boolean;
  canDeletePurchases: boolean;

  // Stock
  canViewStock: boolean;
  canAdjustStock: boolean;
  canTransferStock: boolean;

  // Reports
  canViewBasicReports: boolean;
  canViewAdvancedReports: boolean; // Profit, margin, valuation
  canViewAuditLogs: boolean;

  // Business Settings
  canManageBusiness: boolean;
  canManageUsers: boolean;
  canManageLocations: boolean;

  // Invoices & Receipts
  canViewInvoices: boolean;
  canPrintReceipts: boolean;
}

/**
 * Role permissions matrix
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    // Products - Full access
    canViewProducts: true,
    canCreateProducts: true,
    canEditProducts: true,
    canDeleteProducts: true,

    // Sales - Full access
    canViewSales: true,
    canCreateSales: true,
    canEditSales: true,
    canDeleteSales: true,
    canFinalizeSales: true,

    // Purchases - Full access
    canViewPurchases: true,
    canCreatePurchases: true,
    canEditPurchases: true,
    canDeletePurchases: true,

    // Stock - Full access
    canViewStock: true,
    canAdjustStock: true,
    canTransferStock: true,

    // Reports - Full access
    canViewBasicReports: true,
    canViewAdvancedReports: true,
    canViewAuditLogs: true,

    // Business Settings - Full access
    canManageBusiness: true,
    canManageUsers: true,
    canManageLocations: true,

    // Invoices & Receipts - Full access
    canViewInvoices: true,
    canPrintReceipts: true,
  },

  manager: {
    // Products - Can manage but not delete
    canViewProducts: true,
    canCreateProducts: true,
    canEditProducts: true,
    canDeleteProducts: false,

    // Sales - Full access
    canViewSales: true,
    canCreateSales: true,
    canEditSales: true,
    canDeleteSales: true,
    canFinalizeSales: true,

    // Purchases - Full access
    canViewPurchases: true,
    canCreatePurchases: true,
    canEditPurchases: true,
    canDeletePurchases: true,

    // Stock - Can adjust and transfer
    canViewStock: true,
    canAdjustStock: true,
    canTransferStock: true,

    // Reports - Can view advanced reports
    canViewBasicReports: true,
    canViewAdvancedReports: true,
    canViewAuditLogs: true,

    // Business Settings - Limited
    canManageBusiness: false,
    canManageUsers: false,
    canManageLocations: true,

    // Invoices & Receipts - Full access
    canViewInvoices: true,
    canPrintReceipts: true,
  },

  cashier: {
    // Products - Read-only
    canViewProducts: true,
    canCreateProducts: false,
    canEditProducts: false,
    canDeleteProducts: false,

    // Sales - Can create and view own sales
    canViewSales: true,
    canCreateSales: true,
    canEditSales: false, // Only draft sales
    canDeleteSales: false,
    canFinalizeSales: true,

    // Purchases - No access
    canViewPurchases: false,
    canCreatePurchases: false,
    canEditPurchases: false,
    canDeletePurchases: false,

    // Stock - View only
    canViewStock: true,
    canAdjustStock: false,
    canTransferStock: false,

    // Reports - Basic reports only
    canViewBasicReports: true,
    canViewAdvancedReports: false,
    canViewAuditLogs: false,

    // Business Settings - No access
    canManageBusiness: false,
    canManageUsers: false,
    canManageLocations: false,

    // Invoices & Receipts - Can view and print
    canViewInvoices: true,
    canPrintReceipts: true,
  },

  auditor: {
    // Products - Read-only
    canViewProducts: true,
    canCreateProducts: false,
    canEditProducts: false,
    canDeleteProducts: false,

    // Sales - Read-only
    canViewSales: true,
    canCreateSales: false,
    canEditSales: false,
    canDeleteSales: false,
    canFinalizeSales: false,

    // Purchases - Read-only
    canViewPurchases: true,
    canCreatePurchases: false,
    canEditPurchases: false,
    canDeletePurchases: false,

    // Stock - Read-only
    canViewStock: true,
    canAdjustStock: false,
    canTransferStock: false,

    // Reports - Full read access
    canViewBasicReports: true,
    canViewAdvancedReports: true,
    canViewAuditLogs: true,

    // Business Settings - Read-only
    canManageBusiness: false,
    canManageUsers: false,
    canManageLocations: false,

    // Invoices & Receipts - View only
    canViewInvoices: true,
    canPrintReceipts: true,
  },
};

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;
}

/**
 * Check if role has specific permission
 */
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  const permissions = getRolePermissions(role);
  return permissions[permission] === true;
}

/**
 * Check if role can perform action
 */
export function canPerformAction(role: UserRole, action: string): boolean {
  const permissions = getRolePermissions(role);

  // Map actions to permissions
  const actionMap: Record<string, keyof RolePermissions> = {
    'products.view': 'canViewProducts',
    'products.create': 'canCreateProducts',
    'products.edit': 'canEditProducts',
    'products.delete': 'canDeleteProducts',
    'sales.view': 'canViewSales',
    'sales.create': 'canCreateSales',
    'sales.edit': 'canEditSales',
    'sales.delete': 'canDeleteSales',
    'sales.finalize': 'canFinalizeSales',
    'purchases.view': 'canViewPurchases',
    'purchases.create': 'canCreatePurchases',
    'purchases.edit': 'canEditPurchases',
    'purchases.delete': 'canDeletePurchases',
    'stock.view': 'canViewStock',
    'stock.adjust': 'canAdjustStock',
    'stock.transfer': 'canTransferStock',
    'reports.basic': 'canViewBasicReports',
    'reports.advanced': 'canViewAdvancedReports',
    'audit.view': 'canViewAuditLogs',
    'business.manage': 'canManageBusiness',
    'users.manage': 'canManageUsers',
    'locations.manage': 'canManageLocations',
    'invoices.view': 'canViewInvoices',
    'receipts.print': 'canPrintReceipts',
  };

  const permission = actionMap[action];
  if (!permission) {
    return false; // Unknown action, deny by default
  }

  return permissions[permission] === true;
}

