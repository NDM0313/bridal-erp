/**
 * Subscription Guard Middleware
 * Enforces subscription status and plan limits
 * 
 * PHASE 3: Subscription enforcement
 */

import { isSubscriptionActive, isSubscriptionSuspended, checkPlanLimit } from '../services/subscriptionService.js';

/**
 * Middleware to require active subscription
 * Blocks access if subscription is suspended/cancelled
 */
export function requireActiveSubscription(req, res, next) {
  return async (req, res, next) => {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NO_ORGANIZATION',
          message: 'User is not associated with an organization',
        },
      });
    }

    const active = await isSubscriptionActive(organizationId);
    const suspended = await isSubscriptionSuspended(organizationId);

    if (suspended) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_SUSPENDED',
          message: 'Your subscription is suspended. Please update your payment method to continue.',
          upgrade_required: true,
        },
      });
    }

    if (!active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_INACTIVE',
          message: 'Your subscription is not active. Please contact support.',
        },
      });
    }

    next();
  };
}

/**
 * Middleware to check plan limit before operation
 * @param {string} limitType - Limit type ('businesses', 'users', 'locations', 'transactions')
 */
export function checkPlanLimitMiddleware(limitType) {
  return async (req, res, next) => {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NO_ORGANIZATION',
          message: 'User is not associated with an organization',
        },
      });
    }

    const limit = await checkPlanLimit(organizationId, limitType);

    if (limit.exceeded) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `You have reached your plan limit for ${limitType}. Current: ${limit.current}, Limit: ${limit.limit}`,
          upgrade_required: true,
          limit: limit,
        },
      });
    }

    req.planLimit = limit; // Attach limit info to request
    next();
  };
}

