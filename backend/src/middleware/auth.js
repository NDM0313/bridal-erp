/**
 * Authentication Middleware
 * Verifies Supabase JWT token and extracts user information
 * 
 * PHASE 2: Prefers organization context after migration
 * Falls back to legacy user_profiles for safety
 */

import { supabase } from '../config/supabase.js';

/**
 * Middleware to verify JWT token and authenticate user
 * Attaches user info, organization_id, and business_id to request object
 * 
 * PHASE 2: Prefers organization mode, falls back to legacy
 */
export async function authenticateUser(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          details: error?.message,
        },
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
    };

    // PHASE 2: Prefer organization-based access (SaaS mode)
    // After migration, most users will be in organization_users
    const { data: orgUser, error: orgUserError } = await supabase
      .from('organization_users')
      .select('organization_id, role, is_organization_admin')
      .eq('user_id', user.id)
      .single();

    if (orgUser && !orgUserError) {
      // User is in organization mode (SaaS) - PREFERRED MODE
      req.organizationId = orgUser.organization_id;
      req.userRole = orgUser.role || 'cashier';
      req.isOrganizationAdmin = orgUser.is_organization_admin || false;

      // Get first business from organization (for backward compatibility)
      // In Phase 2, each org typically has one business
      const { data: orgBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('organization_id', orgUser.organization_id)
        .order('id', { ascending: true })
        .limit(1)
        .single();

      req.businessId = orgBusiness?.id || null;
      
      // Log mode for debugging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUTH] User ${user.email} authenticated via organization mode (org_id: ${orgUser.organization_id})`);
      }
    } else {
      // Fallback to legacy user_profiles (backward compatibility)
      // This ensures users not yet migrated can still access
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id, role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_BUSINESS_ASSOCIATED',
            message: 'User is not associated with any business or organization',
          },
        });
      }

      // Legacy mode
      req.businessId = profile.business_id;
      req.userRole = profile.role || 'cashier';
      req.organizationId = null; // Not in organization mode
      req.isOrganizationAdmin = false;
      
      // Log mode for debugging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUTH] User ${user.email} authenticated via legacy mode (business_id: ${profile.business_id})`);
      }
    }

    // Create authenticated Supabase client for this request
    req.supabase = supabase.auth.setSession({
      access_token: token,
      refresh_token: '', // Not needed for server-side
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        details: error.message,
      },
    });
  }
}

/**
 * Middleware to attach business context (redundant but kept for compatibility)
 * businessId is already set by authenticateUser, this is a no-op
 */
export function attachBusinessContext(req, res, next) {
  // businessId is already attached by authenticateUser middleware
  // This function exists for route compatibility
  next();
}

/**
 * Middleware to check if user has specific role
 * Backend is the source of truth for role validation
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.userRole;

    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NO_ROLE_ASSIGNED',
          message: 'User does not have a role assigned',
        },
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires one of these roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`,
        },
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has permission
 * Maps actions to role requirements
 */
export function requirePermission(action) {
  return (req, res, next) => {
    const userRole = req.userRole;

    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NO_ROLE_ASSIGNED',
          message: 'User does not have a role assigned',
        },
      });
    }

    // Permission mapping (backend is source of truth)
    const permissionMap = {
      'products.create': ['admin', 'manager'],
      'products.edit': ['admin', 'manager'],
      'products.delete': ['admin'],
      'stock.adjust': ['admin', 'manager'],
      'stock.transfer': ['admin', 'manager'],
      'reports.advanced': ['admin', 'manager', 'auditor'],
      'audit.view': ['admin', 'manager', 'auditor'],
      'business.manage': ['admin'],
      'users.manage': ['admin'],
    };

    const requiredRoles = permissionMap[action] || [];

    if (requiredRoles.length === 0) {
      // Unknown action, allow by default (or deny - your choice)
      // For security, we'll deny unknown actions
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNKNOWN_ACTION',
          message: 'Unknown action or action not protected',
        },
      });
    }

    if (!requiredRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires one of these roles: ${requiredRoles.join(', ')}. Your role: ${userRole}`,
        },
      });
    }

    next();
  };
}
