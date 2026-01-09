/**
 * Permissions Hook
 * Checks user permissions based on role
 */

import { useAuth } from '../auth/AuthContext.js';

// Permission matrix (matches backend)
const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: {
    'sales.view': true,
    'sales.create': true,
    'sales.edit': true,
    'worker.steps.view': true,
    'worker.steps.update': true,
    'production.view': true,
    'production.manage': true,
    'reports.view': true,
  },
  manager: {
    'sales.view': true,
    'sales.create': true,
    'sales.edit': true,
    'worker.steps.view': true,
    'worker.steps.update': true,
    'production.view': true,
    'production.manage': true,
    'reports.view': true,
  },
  cashier: {
    'sales.view': true,
    'sales.create': true,
    'sales.edit': false,
    'worker.steps.view': false,
    'worker.steps.update': false,
    'production.view': false,
    'production.manage': false,
    'reports.view': false,
  },
  sales: {
    'sales.view': true,
    'sales.create': true,
    'sales.edit': false,
    'worker.steps.view': false,
    'worker.steps.update': false,
    'production.view': false,
    'production.manage': false,
    'reports.view': false,
  },
  production_worker: {
    'sales.view': false,
    'sales.create': false,
    'sales.edit': false,
    'worker.steps.view': true,
    'worker.steps.update': true,
    'production.view': false,
    'production.manage': false,
    'reports.view': false,
  },
  auditor: {
    'sales.view': true,
    'sales.create': false,
    'sales.edit': false,
    'worker.steps.view': false,
    'worker.steps.update': false,
    'production.view': true,
    'production.manage': false,
    'reports.view': true,
  },
};

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || 'cashier';

  const hasPermission = (permission: string): boolean => {
    const rolePerms = ROLE_PERMISSIONS[role] || {};
    return rolePerms[permission] === true;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(perm => hasPermission(perm));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(perm => hasPermission(perm));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    role,
  };
}
