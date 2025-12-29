/**
 * Feature Guard Middleware
 * Checks if organization has access to a specific feature
 * 
 * PHASE 3: Now checks subscription status before granting feature access
 * SECURITY: Backend is the source of truth for feature access
 */

import { supabase } from '../config/supabase.js';
import { isSubscriptionActive } from '../services/subscriptionService.js';

/**
 * Check if organization has feature enabled
 * @param {number} organizationId - Organization ID
 * @param {string} featureKey - Feature key (e.g., 'advanced_reports')
 * @returns {Promise<boolean>} True if feature is enabled
 */
export async function hasFeature(organizationId, featureKey) {
  if (!organizationId) {
    return false; // No organization = no features
  }

  // PHASE 3: Check subscription status first
  // Suspended/cancelled subscriptions have limited access
  const subscriptionActive = await isSubscriptionActive(organizationId);
  if (!subscriptionActive) {
    // Only allow basic features for suspended subscriptions
    if (featureKey !== 'basic_reports') {
      return false;
    }
  }

  // Get organization plan (from subscription, synced to organizations table)
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    console.error('Error fetching organization:', orgError);
    return false;
  }

  // Get feature requirements
  const { data: feature, error: featureError } = await supabase
    .from('feature_definitions')
    .select('plan_requirements, default_enabled')
    .eq('key', featureKey)
    .single();

  if (featureError || !feature) {
    console.error('Error fetching feature definition:', featureError);
    return false; // Unknown feature = deny
  }

  // Check if plan includes feature
  const planIncludesFeature = feature.plan_requirements?.includes(org.subscription_plan) || false;

  if (!planIncludesFeature) {
    return false; // Plan doesn't include feature
  }

  // Check if feature is explicitly enabled for organization (override)
  const { data: orgFeature, error: orgFeatureError } = await supabase
    .from('organization_features')
    .select('enabled')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .single();

  // If explicit override exists, use it; otherwise use plan default
  if (orgFeature && !orgFeatureError) {
    return orgFeature.enabled;
  }

  // Use default from feature definition
  return feature.default_enabled || false;
}

/**
 * Middleware to require a specific feature
 * @param {string} featureKey - Feature key to check
 * @returns {Function} Express middleware
 */
export function requireFeature(featureKey) {
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

    const hasAccess = await hasFeature(organizationId, featureKey);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: `Feature '${featureKey}' is not available on your subscription plan`,
          upgrade_required: true,
        },
      });
    }

    next();
  };
}

