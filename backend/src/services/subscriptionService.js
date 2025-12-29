/**
 * Subscription Service
 * Handles subscription lifecycle, billing, and plan management
 * 
 * PHASE 3: Full subscription management with Stripe integration
 */

import { supabase } from '../config/supabase.js';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Stripe (use environment variable)
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
}) : null;

/**
 * Get subscription for organization
 * @param {number} organizationId - Organization ID
 * @returns {Promise<object>} Subscription data
 */
export async function getSubscription(organizationId) {
  const { data, error } = await supabase
    .from('organization_subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }

  return data;
}

/**
 * Get subscription status
 * @param {number} organizationId - Organization ID
 * @returns {Promise<string>} Subscription status
 */
export async function getSubscriptionStatus(organizationId) {
  const subscription = await getSubscription(organizationId);
  return subscription?.status || 'active';
}

/**
 * Check if organization subscription is active
 * @param {number} organizationId - Organization ID
 * @returns {Promise<boolean>} True if subscription is active
 */
export async function isSubscriptionActive(organizationId) {
  const status = await getSubscriptionStatus(organizationId);
  return ['trial', 'active'].includes(status);
}

/**
 * Check if organization subscription is suspended
 * @param {number} organizationId - Organization ID
 * @returns {Promise<boolean>} True if subscription is suspended
 */
export async function isSubscriptionSuspended(organizationId) {
  const status = await getSubscriptionStatus(organizationId);
  return ['suspended', 'past_due', 'cancelled', 'expired'].includes(status);
}

/**
 * Create Stripe customer for organization
 * @param {number} organizationId - Organization ID
 * @param {string} email - Customer email
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Stripe customer
 */
export async function createStripeCustomer(organizationId, email, metadata = {}) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const customer = await stripe.customers.create({
    email,
    metadata: {
      organization_id: organizationId.toString(),
      ...metadata,
    },
  });

  // Update subscription with Stripe customer ID
  await supabase
    .from('organization_subscriptions')
    .update({ stripe_customer_id: customer.id })
    .eq('organization_id', organizationId);

  return customer;
}

/**
 * Create Stripe subscription
 * @param {number} organizationId - Organization ID
 * @param {string} priceId - Stripe price ID
 * @param {object} options - Subscription options
 * @returns {Promise<object>} Stripe subscription
 */
export async function createStripeSubscription(organizationId, priceId, options = {}) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const subscription = await getSubscription(organizationId);
  if (!subscription?.stripe_customer_id) {
    throw new Error('Organization does not have Stripe customer');
  }

  const stripeSubscription = await stripe.subscriptions.create({
    customer: subscription.stripe_customer_id,
    items: [{ price: priceId }],
    trial_period_days: options.trialDays || 14,
    metadata: {
      organization_id: organizationId.toString(),
    },
  });

  // Update subscription with Stripe subscription ID
  await supabase
    .from('organization_subscriptions')
    .update({
      stripe_subscription_id: stripeSubscription.id,
      stripe_price_id: priceId,
      status: stripeSubscription.status === 'trialing' ? 'trial' : 'active',
      trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
      trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000),
    })
    .eq('organization_id', organizationId);

  // Log event
  await logSubscriptionEvent(organizationId, 'subscription_created', {
    stripe_subscription_id: stripeSubscription.id,
    plan: options.plan,
  });

  return stripeSubscription;
}

/**
 * Update subscription plan
 * @param {number} organizationId - Organization ID
 * @param {string} newPlan - New plan ('free', 'basic', 'pro', 'enterprise')
 * @param {string} priceId - Stripe price ID for new plan
 * @returns {Promise<object>} Updated subscription
 */
export async function updateSubscriptionPlan(organizationId, newPlan, priceId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const subscription = await getSubscription(organizationId);
  if (!subscription?.stripe_subscription_id) {
    throw new Error('Organization does not have Stripe subscription');
  }

  // Get current subscription from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

  // Update subscription item
  await stripe.subscriptions.update(stripeSubscription.id, {
    items: [{
      id: stripeSubscription.items.data[0].id,
      price: priceId,
    }],
    proration_behavior: 'always_invoice',  // Prorate charges
  });

  // Update local subscription
  const { data: updatedSubscription } = await supabase
    .from('organization_subscriptions')
    .update({
      plan: newPlan,
      stripe_price_id: priceId,
      updated_at: new Date(),
    })
    .eq('organization_id', organizationId)
    .select()
    .single();

  // Log event
  await logSubscriptionEvent(organizationId, 'subscription_updated', {
    previous_plan: subscription.plan,
    new_plan: newPlan,
    stripe_subscription_id: stripeSubscription.id,
  });

  return updatedSubscription;
}

/**
 * Cancel subscription
 * @param {number} organizationId - Organization ID
 * @param {boolean} cancelImmediately - Cancel immediately or at period end
 * @returns {Promise<object>} Cancelled subscription
 */
export async function cancelSubscription(organizationId, cancelImmediately = false) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const subscription = await getSubscription(organizationId);
  if (!subscription?.stripe_subscription_id) {
    throw new Error('Organization does not have Stripe subscription');
  }

  let stripeSubscription;
  if (cancelImmediately) {
    // Cancel immediately
    stripeSubscription = await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  } else {
    // Cancel at period end
    stripeSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  }

  // Update local subscription
  const { data: updatedSubscription } = await supabase
    .from('organization_subscriptions')
    .update({
      status: cancelImmediately ? 'cancelled' : subscription.status,
      cancel_at_period_end: !cancelImmediately,
      cancelled_at: cancelImmediately ? new Date() : null,
      updated_at: new Date(),
    })
    .eq('organization_id', organizationId)
    .select()
    .single();

  // Log event
  await logSubscriptionEvent(organizationId, 'subscription_cancelled', {
    cancel_immediately: cancelImmediately,
    stripe_subscription_id: stripeSubscription.id,
  });

  return updatedSubscription;
}

/**
 * Resume cancelled subscription
 * @param {number} organizationId - Organization ID
 * @returns {Promise<object>} Resumed subscription
 */
export async function resumeSubscription(organizationId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const subscription = await getSubscription(organizationId);
  if (!subscription?.stripe_subscription_id) {
    throw new Error('Organization does not have Stripe subscription');
  }

  // Resume subscription in Stripe
  const stripeSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  // Update local subscription
  const { data: updatedSubscription } = await supabase
    .from('organization_subscriptions')
    .update({
      status: 'active',
      cancel_at_period_end: false,
      cancelled_at: null,
      updated_at: new Date(),
    })
    .eq('organization_id', organizationId)
    .select()
    .single();

  // Log event
  await logSubscriptionEvent(organizationId, 'subscription_resumed', {
    stripe_subscription_id: stripeSubscription.id,
  });

  return updatedSubscription;
}

/**
 * Log subscription event
 * @param {number} organizationId - Organization ID
 * @param {string} eventType - Event type
 * @param {object} eventData - Event data
 * @returns {Promise<object>} Created event
 */
export async function logSubscriptionEvent(organizationId, eventType, eventData = {}) {
  const subscription = await getSubscription(organizationId);

  const { data, error } = await supabase
    .from('subscription_events')
    .insert({
      organization_id: organizationId,
      subscription_id: subscription?.id || null,
      event_type: eventType,
      event_source: 'system',
      event_data: eventData,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log subscription event:', error);
    return null;
  }

  return data;
}

/**
 * Get billing history for organization
 * @param {number} organizationId - Organization ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Billing history
 */
export async function getBillingHistory(organizationId, options = {}) {
  const { page = 1, perPage = 20 } = options;

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await supabase
    .from('billing_history')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch billing history: ${error.message}`);
  }

  return {
    data: data || [],
    meta: {
      page,
      perPage,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / perPage),
    },
  };
}

/**
 * Check plan limits
 * @param {number} organizationId - Organization ID
 * @param {string} limitType - Limit type ('businesses', 'users', 'locations', 'transactions')
 * @returns {Promise<{current: number, limit: number, exceeded: boolean}>} Limit status
 */
export async function checkPlanLimit(organizationId, limitType) {
  const subscription = await getSubscription(organizationId);
  const org = await supabase
    .from('organizations')
    .select(`max_${limitType}`)
    .eq('id', organizationId)
    .single();

  const limit = org.data?.[`max_${limitType}`] || 0;

  let current = 0;
  switch (limitType) {
    case 'businesses':
      const { count: businessCount } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      current = businessCount || 0;
      break;
    case 'users':
      const { count: userCount } = await supabase
        .from('organization_users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      current = userCount || 0;
      break;
    case 'locations':
      const { count: locationCount } = await supabase
        .from('business_locations')
        .select('id', { count: 'exact', head: true })
        .join('businesses', 'business_locations.business_id', 'businesses.id')
        .eq('businesses.organization_id', organizationId);
      current = locationCount || 0;
      break;
    case 'transactions':
      // Count transactions in current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: transactionCount } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .join('businesses', 'transactions.business_id', 'businesses.id')
        .eq('businesses.organization_id', organizationId)
        .gte('transaction_date', startOfMonth.toISOString());
      current = transactionCount || 0;
      break;
  }

  return {
    current,
    limit: limit === 0 ? Infinity : limit,  // 0 means unlimited
    exceeded: limit > 0 && current >= limit,
  };
}

