/**
 * Stripe Webhooks Routes
 * Handles Stripe webhook events securely
 * 
 * PHASE 3: Secure webhook processing with idempotency
 */

import express from 'express';
import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.warn('Stripe secret key not configured. Webhooks will not work.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
}) : null;

/**
 * POST /api/v1/webhooks/stripe
 * Handle Stripe webhook events
 * 
 * SECURITY:
 * - Verifies webhook signature
 * - Idempotent processing (checks stripe_event_id)
 * - Backend-only (never exposed to frontend)
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),  // Raw body for signature verification
  async (req, res) => {
    if (!stripe || !stripeWebhookSecret) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Stripe webhooks not configured',
        },
      });
    }

    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing Stripe signature',
        },
      });
    }

    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature',
        },
      });
    }

    // Check if event already processed (idempotency)
    const { data: existingEvent } = await supabase
      .from('subscription_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed. Skipping.`);
      return res.json({ received: true, message: 'Event already processed' });
    }

    // Process event
    try {
      await handleStripeEvent(event);
      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook event:', error);
      // Still return 200 to prevent Stripe retries for non-recoverable errors
      // Log error for manual investigation
      res.status(200).json({
        received: true,
        error: error.message,
      });
    }
  }
);

/**
 * Handle Stripe webhook event
 * @param {object} event - Stripe event
 */
async function handleStripeEvent(event) {
  const eventType = event.type;
  const eventData = event.data.object;

  // Log event
  await logStripeEvent(event);

  switch (eventType) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(eventData);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(eventData);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(eventData);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(eventData);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(eventData);
      break;

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(eventData);
      break;

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription) {
  const organizationId = parseInt(subscription.metadata?.organization_id);
  if (!organizationId) {
    console.warn('Subscription created without organization_id');
    return;
  }

  await supabase
    .from('organization_subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price?.id,
      status: subscription.status === 'trialing' ? 'trial' : 'active',
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      updated_at: new Date(),
    })
    .eq('organization_id', organizationId);
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription) {
  const organizationId = parseInt(subscription.metadata?.organization_id);
  if (!organizationId) {
    console.warn('Subscription updated without organization_id');
    return;
  }

  // Determine status
  let status = 'active';
  if (subscription.status === 'trialing') {
    status = 'trial';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
    status = 'cancelled';
  }

  await supabase
    .from('organization_subscriptions')
    .update({
      stripe_price_id: subscription.items.data[0]?.price?.id,
      status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      updated_at: new Date(),
    })
    .eq('organization_id', organizationId);
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription) {
  const organizationId = parseInt(subscription.metadata?.organization_id);
  if (!organizationId) {
    console.warn('Subscription deleted without organization_id');
    return;
  }

  await supabase
    .from('organization_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date(),
      updated_at: new Date(),
    })
    .eq('organization_id', organizationId);
}

/**
 * Handle payment succeeded
 */
async function handlePaymentSucceeded(invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  // Find organization by subscription
  const { data: subscription } = await supabase
    .from('organization_subscriptions')
    .select('organization_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!subscription) {
    console.warn(`Payment succeeded for unknown subscription: ${subscriptionId}`);
    return;
  }

  // Record billing history
  await supabase
    .from('billing_history')
    .insert({
      organization_id: subscription.organization_id,
      subscription_id: subscription.id,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent,
      plan: invoice.metadata?.plan || 'unknown',
      amount: invoice.amount_paid / 100,  // Convert from cents
      currency: invoice.currency,
      status: 'paid',
      invoice_url: invoice.hosted_invoice_url,
      receipt_url: invoice.receipt_url,
      period_start: new Date(invoice.period_start * 1000),
      period_end: new Date(invoice.period_end * 1000),
    });

  // Update subscription status if it was past_due
  await supabase
    .from('organization_subscriptions')
    .update({
      status: 'active',
      payment_failed_at: null,
      grace_period_ends_at: null,
      updated_at: new Date(),
    })
    .eq('organization_id', subscription.organization_id)
    .eq('status', 'past_due');
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  // Find organization by subscription
  const { data: subscription } = await supabase
    .from('organization_subscriptions')
    .select('organization_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!subscription) {
    console.warn(`Payment failed for unknown subscription: ${subscriptionId}`);
    return;
  }

  // Record billing history
  await supabase
    .from('billing_history')
    .insert({
      organization_id: subscription.organization_id,
      subscription_id: subscription.id,
      stripe_invoice_id: invoice.id,
      plan: invoice.metadata?.plan || 'unknown',
      amount: invoice.amount_due / 100,  // Convert from cents
      currency: invoice.currency,
      status: 'failed',
      period_start: new Date(invoice.period_start * 1000),
      period_end: new Date(invoice.period_end * 1000),
    });

  // Update subscription status
  await supabase
    .from('organization_subscriptions')
    .update({
      status: 'past_due',
      payment_failed_at: new Date(),
      grace_period_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 days grace
      updated_at: new Date(),
    })
    .eq('organization_id', subscription.organization_id);
}

/**
 * Handle trial will end
 */
async function handleTrialWillEnd(subscription) {
  const organizationId = parseInt(subscription.metadata?.organization_id);
  if (!organizationId) {
    return;
  }

  // Log event (can trigger notification)
  await supabase
    .from('subscription_events')
    .insert({
      organization_id: organizationId,
      event_type: 'trial_will_end',
      event_source: 'stripe',
      event_data: {
        trial_end: subscription.trial_end,
      },
    });
}

/**
 * Log Stripe event
 */
async function logStripeEvent(event) {
  const subscriptionId = event.data.object.subscription || event.data.object.id;
  
  // Find organization
  let organizationId = null;
  if (subscriptionId) {
    const { data: subscription } = await supabase
      .from('organization_subscriptions')
      .select('organization_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    
    organizationId = subscription?.organization_id;
  }

  await supabase
    .from('subscription_events')
    .insert({
      organization_id: organizationId,
      event_type: event.type,
      event_source: 'stripe',
      stripe_event_id: event.id,
      event_data: event.data.object,
    });
}

export default router;

