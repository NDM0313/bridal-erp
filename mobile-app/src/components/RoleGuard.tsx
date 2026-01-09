/**
 * Role Guard Component
 * Conditionally renders children based on user permissions
 */

import React from 'react';
import { usePermissions } from '../hooks/usePermissions.js';

interface RoleGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGuard({
  permission,
  children,
  fallback = null,
}: RoleGuardProps) {
  const { hasPermission } = usePermissions();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
