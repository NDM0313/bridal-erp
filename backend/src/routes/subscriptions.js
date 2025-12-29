/**
 * Subscription Routes
 * Handles subscription and billing API endpoints
 * 
 * PHASE 3: Full subscription management
 */

import express from 'express';
import { authenticateUser, attachBusinessContext, requirePermission } from '../middleware/auth.js';
import {
  getSubscription,
  getSubscriptionStatus,
  isSubscriptionActive,
  createStripeCustomer,
  createStripeSubscription,
  updateSubscriptionPlan,
  cancelSubscription,
  resumeSubscription,
  getBillingHistory,
  checkPlanLimit,
} from '../services/subscriptionService.js';

const router = express.Router();

/**
 * GET /api/v1/subscriptions/status
 * Get subscription status for authenticated organization
 */
router.get(
  '/status',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not associated with an organization',
          },
        });
      }

      const subscription = await getSubscription(req.organizationId);
      const status = await getSubscriptionStatus(req.organizationId);
      const isActive = await isSubscriptionActive(req.organizationId);

      res.json({
        success: true,
        data: {
          subscription,
          status,
          isActive,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/subscriptions/limits
 * Check plan limits for organization
 */
router.get(
  '/limits',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not associated with an organization',
          },
        });
      }

      const limitType = req.query.type; // 'businesses', 'users', 'locations', 'transactions'
      
      if (!limitType) {
        // Return all limits
        const [businesses, users, locations, transactions] = await Promise.all([
          checkPlanLimit(req.organizationId, 'businesses'),
          checkPlanLimit(req.organizationId, 'users'),
          checkPlanLimit(req.organizationId, 'locations'),
          checkPlanLimit(req.organizationId, 'transactions'),
        ]);

        res.json({
          success: true,
          data: {
            businesses,
            users,
            locations,
            transactions,
          },
        });
      } else {
        const limit = await checkPlanLimit(req.organizationId, limitType);
        res.json({
          success: true,
          data: limit,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/subscriptions/create-customer
 * Create Stripe customer for organization
 * Requires organization admin
 */
router.post(
  '/create-customer',
  authenticateUser,
  attachBusinessContext,
  requirePermission('business:settings:manage'),
  async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not associated with an organization',
          },
        });
      }

      if (!req.isOrganizationAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only organization admins can create Stripe customers',
          },
        });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
          },
        });
      }

      const customer = await createStripeCustomer(req.organizationId, email);

      res.json({
        success: true,
        data: {
          customer_id: customer.id,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/subscriptions/create
 * Create Stripe subscription
 * Requires organization admin
 */
router.post(
  '/create',
  authenticateUser,
  attachBusinessContext,
  requirePermission('business:settings:manage'),
  async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not associated with an organization',
          },
        });
      }

      if (!req.isOrganizationAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only organization admins can create subscriptions',
          },
        });
      }

      const { priceId, plan, trialDays } = req.body;
      if (!priceId || !plan) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'priceId and plan are required',
          },
        });
      }

      const subscription = await createStripeSubscription(req.organizationId, priceId, {
        plan,
        trialDays,
      });

      res.json({
        success: true,
        data: {
          subscription_id: subscription.id,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/subscriptions/upgrade
 * Upgrade subscription plan
 * Requires organization admin
 */
router.post(
  '/upgrade',
  authenticateUser,
  attachBusinessContext,
  requirePermission('business:settings:manage'),
  async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not associated with an organization',
          },
        });
      }

      if (!req.isOrganizationAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only organization admins can upgrade subscriptions',
          },
        });
      }

      const { plan, priceId } = req.body;
      if (!plan || !priceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'plan and priceId are required',
          },
        });
      }

      const subscription = await updateSubscriptionPlan(req.organizationId, plan, priceId);

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/subscriptions/cancel
 * Cancel subscription
 * Requires organization admin
 */
router.post(
  '/cancel',
  authenticateUser,
  attachBusinessContext,
  requirePermission('business:settings:manage'),
  async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not associated with an organization',
          },
        });
      }

      if (!req.isOrganizationAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only organization admins can cancel subscriptions',
          },
        });
      }

      const { cancelImmediately = false } = req.body;

      const subscription = await cancelSubscription(req.organizationId, cancelImmediately);

      res.json({
        success: true,
        data: subscription,
        message: cancelImmediately
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at period end',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/subscriptions/resume
 * Resume cancelled subscription
 * Requires organization admin
 */
router.post(
  '/resume',
  authenticateUser,
  attachBusinessContext,
  requirePermission('business:settings:manage'),
  async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not associated with an organization',
          },
        });
      }

      if (!req.isOrganizationAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only organization admins can resume subscriptions',
          },
        });
      }

      const subscription = await resumeSubscription(req.organizationId);

      res.json({
        success: true,
        data: subscription,
        message: 'Subscription resumed',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/subscriptions/billing
 * Get billing history
 * Requires organization admin
 */
router.get(
  '/billing',
  authenticateUser,
  attachBusinessContext,
  requirePermission('business:settings:manage'),
  async (req, res, next) => {
    try {
      if (!req.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not associated with an organization',
          },
        });
      }

      const options = {
        page: parseInt(req.query.page) || 1,
        perPage: parseInt(req.query.per_page) || 20,
      };

      const result = await getBillingHistory(req.organizationId, options);

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

