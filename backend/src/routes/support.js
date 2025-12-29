/**
 * Support Routes
 * Handles customer support operations
 * 
 * SECURITY: Read-only access, all actions logged
 */

import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { logSupportAction } from '../services/supportService.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * Check if user is support agent
 */
async function isSupportAgent(userId) {
  const { data } = await supabase
    .from('support_agents')
    .select('id, role, can_impersonate')
    .eq('user_id', userId)
    .single();
  
  return data || null;
}

/**
 * Middleware to require support agent role
 */
async function requireSupportAgent(req, res, next) {
  const agent = await isSupportAgent(req.user.id);
  
  if (!agent) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'NOT_SUPPORT_AGENT',
        message: 'Access denied. Support agent role required.',
      },
    });
  }
  
  req.supportAgent = agent;
  next();
}

/**
 * GET /api/v1/support/organizations
 * List organizations (support view)
 * Requires support agent role
 */
router.get(
  '/organizations',
  authenticateUser,
  requireSupportAgent,
  async (req, res, next) => {
    try {
      const { search, status, plan, page = 1, perPage = 20 } = req.query;
      
      let query = supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      }
      if (status) {
        query = query.eq('subscription_status', status);
      }
      if (plan) {
        query = query.eq('subscription_plan', plan);
      }
      
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      // Log support access
      await logSupportAction({
        agentId: req.supportAgent.id,
        actionType: 'view_organizations_list',
        metadata: { search, status, plan },
      });
      
      res.json({
        success: true,
        data: data || [],
        meta: {
          page: parseInt(page),
          perPage: parseInt(perPage),
          total: count || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/support/organizations/:id
 * Get organization details (read-only)
 * Requires support agent role
 */
router.get(
  '/organizations/:id',
  authenticateUser,
  requireSupportAgent,
  async (req, res, next) => {
    try {
      const organizationId = parseInt(req.params.id);
      
      // Get organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();
      
      if (orgError || !org) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organization not found',
          },
        });
      }
      
      // Get subscription
      const { data: subscription } = await supabase
        .from('organization_subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .single();
      
      // Get users
      const { data: users } = await supabase
        .from('organization_users')
        .select(`
          id,
          user_id,
          role,
          is_organization_admin,
          created_at,
          user:auth.users(email)
        `)
        .eq('organization_id', organizationId);
      
      // Get businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name, created_at')
        .eq('organization_id', organizationId);
      
      // Log support access
      await logSupportAction({
        agentId: req.supportAgent.id,
        organizationId,
        actionType: 'view_organization',
        metadata: { organizationId },
      });
      
      res.json({
        success: true,
        data: {
          organization: org,
          subscription,
          users: users || [],
          businesses: businesses || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/support/organizations/:id/billing
 * Get billing history (read-only)
 * Requires support agent role
 */
router.get(
  '/organizations/:id/billing',
  authenticateUser,
  requireSupportAgent,
  async (req, res, next) => {
    try {
      const organizationId = parseInt(req.params.id);
      
      const { data, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        throw error;
      }
      
      // Log support access
      await logSupportAction({
        agentId: req.supportAgent.id,
        organizationId,
        actionType: 'view_billing',
        metadata: { organizationId },
      });
      
      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/support/organizations/:id/events
 * Get subscription events (read-only)
 * Requires support agent role
 */
router.get(
  '/organizations/:id/events',
  authenticateUser,
  requireSupportAgent,
  async (req, res, next) => {
    try {
      const organizationId = parseInt(req.params.id);
      
      const { data, error } = await supabase
        .from('subscription_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        throw error;
      }
      
      // Log support access
      await logSupportAction({
        agentId: req.supportAgent.id,
        organizationId,
        actionType: 'view_events',
        metadata: { organizationId },
      });
      
      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/support/organizations/:id/impersonate
 * Impersonate user (admin only, logged)
 * Requires support admin role
 */
router.post(
  '/organizations/:id/impersonate',
  authenticateUser,
  requireSupportAgent,
  async (req, res, next) => {
    try {
      if (!req.supportAgent.can_impersonate) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Impersonation requires admin support role',
          },
        });
      }
      
      const organizationId = parseInt(req.params.id);
      
      // Get organization admin user
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('is_organization_admin', true)
        .limit(1)
        .single();
      
      if (!orgUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_ADMIN_USER',
            message: 'No admin user found for this organization',
          },
        });
      }
      
      // Log impersonation (CRITICAL)
      await logSupportAction({
        agentId: req.supportAgent.id,
        organizationId,
        actionType: 'impersonate',
        metadata: {
          organizationId,
          impersonatedUserId: orgUser.user_id,
          reason: req.body.reason || 'Support request',
        },
      });
      
      // Generate impersonation token (simplified - use Supabase admin API in production)
      res.json({
        success: true,
        data: {
          message: 'Impersonation logged. Use Supabase admin API to generate token.',
          organizationId,
          userId: orgUser.user_id,
        },
        warning: 'Impersonation tokens should be generated server-side using Supabase admin API',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/support/access-logs
 * Get support access logs (admin only)
 * Requires support admin role
 */
router.get(
  '/access-logs',
  authenticateUser,
  requireSupportAgent,
  async (req, res, next) => {
    try {
      if (req.supportAgent.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin role required to view access logs',
          },
        });
      }
      
      const { agentId, organizationId, page = 1, perPage = 50 } = req.query;
      
      let query = supabase
        .from('support_access_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (agentId) {
        query = query.eq('agent_id', parseInt(agentId));
      }
      if (organizationId) {
        query = query.eq('organization_id', parseInt(organizationId));
      }
      
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        data: data || [],
        meta: {
          page: parseInt(page),
          perPage: parseInt(perPage),
          total: count || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

