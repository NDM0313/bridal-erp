/**
 * Metrics Service
 * Calculates business metrics (MRR, churn, ARPU, etc.)
 */

import { supabase } from '../config/supabase.js';

/**
 * Calculate MRR (Monthly Recurring Revenue)
 * @returns {Promise<number>} MRR in USD
 */
export async function calculateMRR() {
  const { data, error } = await supabase
    .from('organization_subscriptions')
    .select('plan, metadata')
    .eq('status', 'active')
    .neq('plan', 'free');
  
  if (error) {
    throw new Error(`Failed to calculate MRR: ${error.message}`);
  }
  
  const planPrices = {
    basic: 29,
    pro: 99,
    enterprise: 0, // Custom pricing, stored in metadata
  };
  
  let mrr = 0;
  data.forEach(sub => {
    if (sub.plan === 'enterprise' && sub.metadata?.monthly_price) {
      mrr += parseFloat(sub.metadata.monthly_price);
    } else {
      mrr += planPrices[sub.plan] || 0;
    }
  });
  
  return mrr;
}

/**
 * Calculate churn rate
 * @param {string} period - 'month' or 'year'
 * @returns {Promise<object>} Churn metrics
 */
export async function calculateChurnRate(period = 'month') {
  const startDate = period === 'month' 
    ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    : new Date(new Date().getFullYear(), 0, 1);
  
  // Get active subscriptions at start of period
  const { count: activeStart } = await supabase
    .from('organization_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .lt('created_at', startDate.toISOString());
  
  // Get cancelled subscriptions in period
  const { count: churned } = await supabase
    .from('organization_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'cancelled')
    .gte('cancelled_at', startDate.toISOString());
  
  const churnRate = activeStart > 0 ? (churned / activeStart) * 100 : 0;
  
  return {
    period,
    activeStart: activeStart || 0,
    churned: churned || 0,
    churnRate: parseFloat(churnRate.toFixed(2)),
  };
}

/**
 * Calculate ARPU (Average Revenue Per User)
 * @returns {Promise<number>} ARPU in USD
 */
export async function calculateARPU() {
  const { data, error } = await supabase
    .from('organization_subscriptions')
    .select('plan, metadata')
    .eq('status', 'active')
    .neq('plan', 'free');
  
  if (error) {
    throw new Error(`Failed to calculate ARPU: ${error.message}`);
  }
  
  if (data.length === 0) {
    return 0;
  }
  
  const planPrices = {
    basic: 29,
    pro: 99,
    enterprise: 0,
  };
  
  let totalRevenue = 0;
  data.forEach(sub => {
    if (sub.plan === 'enterprise' && sub.metadata?.monthly_price) {
      totalRevenue += parseFloat(sub.metadata.monthly_price);
    } else {
      totalRevenue += planPrices[sub.plan] || 0;
    }
  });
  
  return parseFloat((totalRevenue / data.length).toFixed(2));
}

/**
 * Calculate payment failure rate
 * @param {string} period - 'month' or 'year'
 * @returns {Promise<object>} Payment failure metrics
 */
export async function calculatePaymentFailureRate(period = 'month') {
  const startDate = period === 'month'
    ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    : new Date(new Date().getFullYear(), 0, 1);
  
  const { count: total } = await supabase
    .from('billing_history')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString());
  
  const { count: failed } = await supabase
    .from('billing_history')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('created_at', startDate.toISOString());
  
  const failureRate = total > 0 ? (failed / total) * 100 : 0;
  
  return {
    period,
    total: total || 0,
    failed: failed || 0,
    failureRate: parseFloat(failureRate.toFixed(2)),
  };
}

/**
 * Get feature usage by plan
 * @returns {Promise<object>} Feature usage metrics
 */
export async function getFeatureUsageByPlan() {
  const { data, error } = await supabase
    .from('organization_subscriptions')
    .select(`
      plan,
      organization:organizations(
        id,
        products:businesses(products(id)),
        transactions:businesses(transactions(id))
      )
    `)
    .eq('status', 'active');
  
  if (error) {
    throw new Error(`Failed to get feature usage: ${error.message}`);
  }
  
  const usage = {};
  
  data.forEach(sub => {
    const plan = sub.plan;
    if (!usage[plan]) {
      usage[plan] = {
        organizations: 0,
        totalProducts: 0,
        totalTransactions: 0,
      };
    }
    
    usage[plan].organizations++;
    
    if (sub.organization) {
      const org = sub.organization;
      if (org.products) {
        org.products.forEach(business => {
          usage[plan].totalProducts += business.products?.length || 0;
        });
      }
      if (org.transactions) {
        org.transactions.forEach(business => {
          usage[plan].totalTransactions += business.transactions?.length || 0;
        });
      }
    }
  });
  
  // Calculate averages
  Object.keys(usage).forEach(plan => {
    const u = usage[plan];
    u.avgProducts = u.organizations > 0 ? parseFloat((u.totalProducts / u.organizations).toFixed(2)) : 0;
    u.avgTransactions = u.organizations > 0 ? parseFloat((u.totalTransactions / u.organizations).toFixed(2)) : 0;
  });
  
  return usage;
}

/**
 * Get all metrics
 * @returns {Promise<object>} All business metrics
 */
export async function getAllMetrics() {
  const [mrr, churn, arpu, paymentFailure, featureUsage] = await Promise.all([
    calculateMRR(),
    calculateChurnRate('month'),
    calculateARPU(),
    calculatePaymentFailureRate('month'),
    getFeatureUsageByPlan(),
  ]);
  
  return {
    mrr,
    churn,
    arpu,
    paymentFailure,
    featureUsage,
    calculatedAt: new Date().toISOString(),
  };
}

