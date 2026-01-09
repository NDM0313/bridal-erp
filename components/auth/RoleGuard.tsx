'use client';

/**
 * Role Guard Component
 * Hides UI elements based on user role permissions
 * 
 * SECURITY: This is UI-only. Backend API is the final authority.
 */

import { ReactNode } from 'react';
import { useRole } from '@/lib/hooks/useRole';
import type { RolePermissions } from '@/lib/types/roles';
import { isDemoMode, demoConfig } from '@/lib/config/demoConfig';

interface RoleGuardProps {
  permission: keyof RolePermissions;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ permission, children, fallback = null }: RoleGuardProps) {
  const { hasPermission, loading } = useRole();

  // DEMO MODE: Bypass all permissions for full access
  if (isDemoMode() && demoConfig.bypassPermissions) {
    console.log('🎭 Demo Mode: Permission bypassed for', permission);
    return <>{children}</>;
  }

  // Show children while loading to prevent staggered rendering
  // Permission check will hide them if needed after loading
  if (loading) {
    return <>{children}</>; // Show by default while loading
  }

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Admin-only guard
 */
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isAdmin, loading } = useRole();

  // DEMO MODE: Bypass admin check for full access
  if (isDemoMode() && demoConfig.bypassPermissions) {
    console.log('🎭 Demo Mode: Admin check bypassed');
    return <>{children}</>;
  }

  if (loading) return null;
  if (!isAdmin) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Manager or Admin guard
 */
export function ManagerOrAdmin({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isAdmin, isManager, loading } = useRole();

  if (loading) return null;
  if (!isAdmin && !isManager) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Cashier or above guard
 */
export function CashierOrAbove({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isAdmin, isManager, isCashier, loading } = useRole();

  if (loading) return null;
  if (!isAdmin && !isManager && !isCashier) return <>{fallback}</>;

  return <>{children}</>;
}

