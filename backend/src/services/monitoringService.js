/**
 * Monitoring Service
 * Tracks errors, payments, and transactions for production monitoring
 */

import { supabase } from '../config/supabase.js';

/**
 * Log error for monitoring
 * @param {object} errorData - Error data
 */
export async function logError({
  error,
  context = {},
  severity = 'error',
  organizationId = null,
  userId = null,
}) {
  // Log to database
  const { error: dbError } = await supabase
    .from('error_logs')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      error_message: error.message,
      error_stack: error.stack,
      error_type: error.name,
      severity,
      context: context,
      created_at: new Date(),
    });
  
  if (dbError) {
    console.error('Failed to log error to database:', dbError);
  }
  
  // Also log to console (for production logging services)
  console.error('Error logged:', {
    message: error.message,
    severity,
    organizationId,
    userId,
    context,
  });
  
  // TODO: Send to Sentry if configured
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, {
  //     tags: { organizationId, userId },
  //     extra: context,
  //   });
  // }
}

/**
 * Track payment failure
 * @param {object} paymentData - Payment data
 */
export async function trackPaymentFailure({
  organizationId,
  subscriptionId,
  invoiceId,
  amount,
  reason,
  retryAttempt = 0,
}) {
  const { error } = await supabase
    .from('payment_failure_logs')
    .insert({
      organization_id: organizationId,
      subscription_id: subscriptionId,
      stripe_invoice_id: invoiceId,
      amount,
      failure_reason: reason,
      retry_attempt: retryAttempt,
      created_at: new Date(),
    });
  
  if (error) {
    console.error('Failed to track payment failure:', error);
  }
  
  // Alert if failure rate is high
  const failureRate = await calculatePaymentFailureRate(organizationId);
  if (failureRate > 0.1) { // 10% failure rate
    console.warn(`High payment failure rate for organization ${organizationId}: ${failureRate * 100}%`);
    // TODO: Send alert
  }
}

/**
 * Track sale failure
 * @param {object} saleData - Sale data
 */
export async function trackSaleFailure({
  organizationId,
  businessId,
  userId,
  reason,
  saleData = {},
}) {
  const { error } = await supabase
    .from('sale_failure_logs')
    .insert({
      organization_id: organizationId,
      business_id: businessId,
      user_id: userId,
      failure_reason: reason,
      sale_data: saleData,
      created_at: new Date(),
    });
  
  if (error) {
    console.error('Failed to track sale failure:', error);
  }
  
  // Alert if failure rate is high
  const failureRate = await calculateSaleFailureRate(organizationId);
  if (failureRate > 0.05) { // 5% failure rate
    console.warn(`High sale failure rate for organization ${organizationId}: ${failureRate * 100}%`);
    // TODO: Send alert
  }
}

/**
 * Calculate payment failure rate for organization
 * @param {number} organizationId - Organization ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<number>} Failure rate (0-1)
 */
async function calculatePaymentFailureRate(organizationId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { count: total } = await supabase
    .from('billing_history')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString());
  
  const { count: failed } = await supabase
    .from('billing_history')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'failed')
    .gte('created_at', startDate.toISOString());
  
  if (!total || total === 0) {
    return 0;
  }
  
  return (failed || 0) / total;
}

/**
 * Calculate sale failure rate for organization
 * @param {number} organizationId - Organization ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<number>} Failure rate (0-1)
 */
async function calculateSaleFailureRate(organizationId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Count successful sales
  const { count: successful } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', (await getBusinessIdForOrg(organizationId)))
    .eq('type', 'sell')
    .eq('status', 'final')
    .gte('created_at', startDate.toISOString());
  
  // Count failed sales (from logs)
  const { count: failed } = await supabase
    .from('sale_failure_logs')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString());
  
  const total = (successful || 0) + (failed || 0);
  
  if (!total || total === 0) {
    return 0;
  }
  
  return (failed || 0) / total;
}

/**
 * Get business ID for organization (helper)
 */
async function getBusinessIdForOrg(organizationId) {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(1)
    .single();
  
  return data?.id || null;
}

/**
 * Get monitoring dashboard data
 * @param {number} organizationId - Organization ID (optional, null for system-wide)
 * @returns {Promise<object>} Monitoring data
 */
export async function getMonitoringData(organizationId = null) {
  const days = 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  let errorQuery = supabase
    .from('error_logs')
    .select('id, severity, created_at')
    .gte('created_at', startDate.toISOString());
  
  let paymentQuery = supabase
    .from('billing_history')
    .select('id, status, created_at')
    .gte('created_at', startDate.toISOString());
  
  let saleQuery = supabase
    .from('transactions')
    .select('id, status, created_at')
    .eq('type', 'sell')
    .gte('created_at', startDate.toISOString());
  
  if (organizationId) {
    errorQuery = errorQuery.eq('organization_id', organizationId);
    paymentQuery = paymentQuery.eq('organization_id', organizationId);
    // Sale query would need business_id join
  }
  
  const [
    { count: errorCount },
    { count: paymentCount },
    { count: paymentFailed },
    { count: saleCount },
  ] = await Promise.all([
    errorQuery.select('id', { count: 'exact', head: true }),
    paymentQuery.select('id', { count: 'exact', head: true }),
    paymentQuery.eq('status', 'failed').select('id', { count: 'exact', head: true }),
    saleQuery.select('id', { count: 'exact', head: true }),
  ]);
  
  return {
    period: `${days} days`,
    errors: {
      total: errorCount || 0,
      rate: 0, // Calculate based on total requests
    },
    payments: {
      total: paymentCount || 0,
      failed: paymentFailed || 0,
      successRate: paymentCount > 0 ? ((paymentCount - (paymentFailed || 0)) / paymentCount * 100).toFixed(2) : 100,
    },
    sales: {
      total: saleCount || 0,
      successRate: 100, // Calculate from sale_failure_logs
    },
  };
}

