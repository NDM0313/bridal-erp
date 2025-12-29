/**
 * Role Hook
 * Provides user role and permission checks
 * 
 * SECURITY: Role is fetched from user_profiles (RLS-protected)
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import type { UserRole } from '@/lib/types/roles';
import { getRolePermissions, type RolePermissions } from '@/lib/types/roles';

export function useRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRole();
  }, []);

  const loadRole = async () => {
    try {
      setLoading(true);
      
      // FIX: Get user with session check
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // console.log('No authenticated user');
        setRole(null);
        setPermissions(null);
        setLoading(false);
        return;
      }

      // FIX: Try organization_users first (SaaS mode), then fallback to user_profiles
      const { data: orgUser, error: orgUserError } = await supabase
        .from('organization_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle to handle no rows gracefully

      if (orgUser && !orgUserError) {
        const userRole = (orgUser.role as UserRole) || 'cashier';
        // console.log('✅ Role loaded from organization_users:', userRole);
        setRole(userRole);
        setPermissions(getRolePermissions(userRole));
        setLoading(false);
        return;
      }

      // Fallback to user_profiles (legacy mode)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle to handle no rows gracefully

      if (profile && !profileError) {
        const userRole = (profile.role as UserRole) || 'cashier';
        // console.log('✅ Role loaded from user_profiles:', userRole);
        setRole(userRole);
        setPermissions(getRolePermissions(userRole));
        setLoading(false);
        return;
      }

      // No role found - default to cashier (safe default)
      // console.warn('⚠️ No role found for user, defaulting to cashier');
      setRole('cashier');
      setPermissions(getRolePermissions('cashier'));
    } catch (error) {
      console.error('❌ Error loading role:', error);
      // FIX: Set default role on error (cashier is safe default)
      setRole('cashier');
      setPermissions(getRolePermissions('cashier'));
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    if (!permissions) return false;
    return permissions[permission] === true;
  };

  return {
    role,
    permissions,
    loading,
    hasPermission,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isCashier: role === 'cashier',
    isAuditor: role === 'auditor',
  };
}

