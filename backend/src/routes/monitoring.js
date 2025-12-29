/**
 * Monitoring Routes
 * Provides monitoring and health check endpoints
 * 
 * SECURITY: Admin-only access for detailed metrics
 */

import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { getMonitoringData } from '../services/monitoringService.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/v1/monitoring/health
 * Health check endpoint (public, no auth required)
 */
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const { error: dbError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (dbError) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Database connection failed',
      });
    }
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/monitoring/dashboard
 * Get monitoring dashboard data
 * Requires admin role
 */
router.get(
  '/dashboard',
  authenticateUser,
  async (req, res, next) => {
    try {
      // Check if user is admin (simplified - implement based on your admin system)
      const isAdmin = req.userRole === 'admin' || req.isOrganizationAdmin;
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
          },
        });
      }
      
      const organizationId = req.query.organization_id 
        ? parseInt(req.query.organization_id) 
        : null;
      
      const data = await getMonitoringData(organizationId);
      
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/errors
 * Get error logs
 * Requires admin role
 */
router.get(
  '/errors',
  authenticateUser,
  async (req, res, next) => {
    try {
      const isAdmin = req.userRole === 'admin' || req.isOrganizationAdmin;
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
          },
        });
      }
      
      const { 
        organizationId, 
        severity, 
        page = 1, 
        perPage = 50,
        days = 7,
      } = req.query;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      let query = supabase
        .from('error_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (organizationId) {
        query = query.eq('organization_id', parseInt(organizationId));
      }
      if (severity) {
        query = query.eq('severity', severity);
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

/**
 * GET /api/v1/monitoring/payment-failures
 * Get payment failure logs
 * Requires admin role
 */
router.get(
  '/payment-failures',
  authenticateUser,
  async (req, res, next) => {
    try {
      const isAdmin = req.userRole === 'admin' || req.isOrganizationAdmin;
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
          },
        });
      }
      
      const { 
        organizationId, 
        resolved, 
        page = 1, 
        perPage = 50,
        days = 7,
      } = req.query;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      let query = supabase
        .from('payment_failure_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (organizationId) {
        query = query.eq('organization_id', parseInt(organizationId));
      }
      if (resolved !== undefined) {
        query = query.eq('resolved', resolved === 'true');
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

/**
 * GET /api/v1/monitoring/sale-failures
 * Get sale failure logs
 * Requires admin role
 */
router.get(
  '/sale-failures',
  authenticateUser,
  async (req, res, next) => {
    try {
      const isAdmin = req.userRole === 'admin' || req.isOrganizationAdmin;
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
          },
        });
      }
      
      const { 
        organizationId, 
        resolved, 
        page = 1, 
        perPage = 50,
        days = 7,
      } = req.query;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      let query = supabase
        .from('sale_failure_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (organizationId) {
        query = query.eq('organization_id', parseInt(organizationId));
      }
      if (resolved !== undefined) {
        query = query.eq('resolved', resolved === 'true');
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

