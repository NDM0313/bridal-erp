'use client';

import { useRole } from '@/lib/hooks/useRole';

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that only renders children if user has admin role
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { role, isAdmin } = useRole();

  if (isAdmin || role === 'admin') {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

