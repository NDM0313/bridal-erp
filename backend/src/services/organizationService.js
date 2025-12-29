/**
 * Organization Service
 * Handles organization-level operations
 * 
 * NOTE: This service is for Phase 1 foundation only
 * Full organization management will be added in later phases
 */

import { supabase } from '../config/supabase.js';

/**
 * Get organization by ID
 * @param {number} organizationId - Organization ID
 * @returns {Promise<object>} Organization data
 */
export async function getOrganization(organizationId) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch organization: ${error.message}`);
  }

  return data;
}

/**
 * Get user's organization
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<object|null>} Organization data or null
 */
export async function getUserOrganization(userId) {
  const { data: orgUser, error } = await supabase
    .from('organization_users')
    .select(`
      organization_id,
      role,
      is_organization_admin,
      organization:organizations(*)
    `)
    .eq('user_id', userId)
    .single();

  if (error || !orgUser) {
    return null; // User not in organization mode
  }

  return orgUser.organization || null;
}

/**
 * Check if organization has feature
 * @param {number} organizationId - Organization ID
 * @param {string} featureKey - Feature key
 * @returns {Promise<boolean>} True if feature is enabled
 */
export async function organizationHasFeature(organizationId, featureKey) {
  // Get organization plan
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    return false;
  }

  // Get feature requirements
  const { data: feature, error: featureError } = await supabase
    .from('feature_definitions')
    .select('plan_requirements, default_enabled')
    .eq('key', featureKey)
    .single();

  if (featureError || !feature) {
    return false; // Unknown feature
  }

  // Check if plan includes feature
  const planIncludesFeature = feature.plan_requirements?.includes(org.subscription_plan) || false;

  if (!planIncludesFeature) {
    return false;
  }

  // Check explicit override
  const { data: orgFeature, error: orgFeatureError } = await supabase
    .from('organization_features')
    .select('enabled')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .single();

  if (orgFeature && !orgFeatureError) {
    return orgFeature.enabled;
  }

  return feature.default_enabled || false;
}

