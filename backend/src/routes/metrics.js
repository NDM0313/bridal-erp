/**
 * Metrics Routes
 * Provides business metrics and KPIs
 * 
 * SECURITY: Admin-only access
 */

import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { getAllMetrics, calculateMRR, calculateChurnRate, calculateARPU, calculatePaymentFailureRate, getFeatureUsageByPlan } from '../services/metricsService.js';

const router = express.Router();

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  // Check if user is support admin or system admin
  // This is a simplified check - implement based on your admin system
  if (req.userRole !== 'admin' && !req.isOrganizationAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required',
      },
    });
  }
  next();
}

/**
 * GET /api/v1/metrics
 * Get all business metrics
 * Requires admin role
 */
router.get(
  '/',
  authenticateUser,
  requireAdmin,
  async (req, res, next) => {
    try {
      const metrics = await getAllMetrics();
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/metrics/mrr
 * Get MRR
 * Requires admin role
 */
router.get(
  '/mrr',
  authenticateUser,
  requireAdmin,
  async (req, res, next) => {
    try {
      const mrr = await calculateMRR();
      
      res.json({
        success: true,
        data: {
          mrr,
          currency: 'USD',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/metrics/churn
 * Get churn rate
 * Requires admin role
 */
router.get(
  '/churn',
  authenticateUser,
  requireAdmin,
  async (req, res, next) => {
    try {
      const period = req.query.period || 'month';
      const churn = await calculateChurnRate(period);
      
      res.json({
        success: true,
        data: churn,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/metrics/arpu
 * Get ARPU
 * Requires admin role
 */
router.get(
  '/arpu',
  authenticateUser,
  requireAdmin,
  async (req, res, next) => {
    try {
      const arpu = await calculateARPU();
      
      res.json({
        success: true,
        data: {
          arpu,
          currency: 'USD',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/metrics/payment-failure
 * Get payment failure rate
 * Requires admin role
 */
router.get(
  '/payment-failure',
  authenticateUser,
  requireAdmin,
  async (req, res, next) => {
    try {
      const period = req.query.period || 'month';
      const failure = await calculatePaymentFailureRate(period);
      
      res.json({
        success: true,
        data: failure,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/metrics/feature-usage
 * Get feature usage by plan
 * Requires admin role
 */
router.get(
  '/feature-usage',
  authenticateUser,
  requireAdmin,
  async (req, res, next) => {
    try {
      const usage = await getFeatureUsageByPlan();
      
      res.json({
        success: true,
        data: usage,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

