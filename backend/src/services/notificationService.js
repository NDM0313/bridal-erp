/**
 * Notification Service
 * Handles notification generation and template processing
 */

import { supabase } from '../config/supabase.js';
import { whatsappService } from './whatsappService.js';
import { formatCurrency } from '../utils/formatters.js';

/**
 * Get notification template
 * @param {number} businessId - Business ID
 * @param {string} notificationType - Notification type
 * @returns {Promise<string|null>} Template content or null
 */
async function getTemplate(businessId, notificationType) {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('template_content')
    .eq('business_id', businessId)
    .eq('notification_type', notificationType)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null; // Use default template
  }

  return data.template_content;
}

/**
 * Check if automation rule is enabled
 * @param {number} businessId - Business ID
 * @param {string} ruleType - Rule type
 * @returns {Promise<boolean>} True if enabled
 */
async function isRuleEnabled(businessId, ruleType) {
  const { data, error } = await supabase
    .from('automation_rules')
    .select('is_enabled')
    .eq('business_id', businessId)
    .eq('rule_type', ruleType)
    .single();

  if (error || !data) {
    return false; // Default: disabled
  }

  return data.is_enabled === true;
}

/**
 * Replace template placeholders
 * @param {string} template - Template string
 * @param {object} variables - Variables to replace
 * @returns {string} Processed template
 */
function processTemplate(template, variables) {
  let processed = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    processed = processed.replace(placeholder, value || '');
  }
  return processed;
}

/**
 * Get default template for notification type
 * @param {string} notificationType - Notification type
 * @returns {string} Default template
 */
function getDefaultTemplate(notificationType) {
  const templates = {
    invoice: 'Invoice {{invoice_no}} for {{total}} has been generated. View details: {{invoice_link}}',
    low_stock: '⚠️ Low Stock Alert: {{product_name}} ({{sku}}) has only {{stock_quantity}} {{unit}} remaining at {{location_name}}.',
    sale_confirmation: '✅ Sale completed! Invoice: {{invoice_no}}, Total: {{total}}, Items: {{item_count}}',
    purchase_confirmation: '✅ Purchase completed! Reference: {{ref_no}}, Total: {{total}}, Items: {{item_count}}',
  };

  return templates[notificationType] || 'Notification: {{message}}';
}

/**
 * Send invoice notification
 * @param {number} businessId - Business ID
 * @param {object} saleData - Sale transaction data
 * @param {string} recipientPhone - Customer WhatsApp number
 * @returns {Promise<object>} Notification result
 */
export async function sendInvoiceNotification(businessId, saleData, recipientPhone) {
  // Check if rule is enabled
  const enabled = await isRuleEnabled(businessId, 'invoice_on_sale');
  if (!enabled) {
    return { skipped: true, reason: 'Rule disabled' };
  }

  // Get template
  let template = await getTemplate(businessId, 'invoice');
  if (!template) {
    template = getDefaultTemplate('invoice');
  }

  // Prepare variables
  const variables = {
    invoice_no: saleData.invoice_no || 'N/A',
    total: formatCurrency(saleData.final_total || 0),
    customer_name: saleData.contact?.name || 'Customer',
    date: new Date(saleData.transaction_date).toLocaleDateString(),
    invoice_link: `${process.env.FRONTEND_URL || ''}/sales/${saleData.id}`,
  };

  // Process template
  const message = processTemplate(template, variables);

  // Queue notification
  const notification = await whatsappService.queueNotification({
    businessId,
    notificationType: 'invoice',
    recipientPhone,
    messageContent: message,
    metadata: {
      transaction_id: saleData.id,
      invoice_no: saleData.invoice_no,
    },
  });

  return { success: true, notification };
}

/**
 * Send low stock alert
 * @param {number} businessId - Business ID
 * @param {object} stockData - Stock data
 * @param {string} recipientPhone - Recipient WhatsApp number
 * @returns {Promise<object>} Notification result
 */
export async function sendLowStockAlert(businessId, stockData, recipientPhone) {
  // Check if rule is enabled
  const enabled = await isRuleEnabled(businessId, 'low_stock_alert');
  if (!enabled) {
    return { skipped: true, reason: 'Rule disabled' };
  }

  // Get template
  let template = await getTemplate(businessId, 'low_stock');
  if (!template) {
    template = getDefaultTemplate('low_stock');
  }

  // Prepare variables
  const variables = {
    product_name: stockData.productName || 'Product',
    sku: stockData.sku || 'N/A',
    stock_quantity: stockData.qtyAvailable?.toString() || '0',
    unit: stockData.baseUnit || 'Pieces',
    location_name: stockData.locationName || 'Location',
    alert_quantity: stockData.alertQuantity?.toString() || '0',
  };

  // Process template
  const message = processTemplate(template, variables);

  // Queue notification
  const notification = await whatsappService.queueNotification({
    businessId,
    notificationType: 'low_stock',
    recipientPhone,
    messageContent: message,
    metadata: {
      variation_id: stockData.variationId,
      location_id: stockData.locationId,
    },
  });

  return { success: true, notification };
}

/**
 * Send sale confirmation
 * @param {number} businessId - Business ID
 * @param {object} saleData - Sale transaction data
 * @param {string} recipientPhone - Customer WhatsApp number
 * @returns {Promise<object>} Notification result
 */
export async function sendSaleConfirmation(businessId, saleData, recipientPhone) {
  // Check if rule is enabled
  const enabled = await isRuleEnabled(businessId, 'sale_confirmation');
  if (!enabled) {
    return { skipped: true, reason: 'Rule disabled' };
  }

  // Get template
  let template = await getTemplate(businessId, 'sale_confirmation');
  if (!template) {
    template = getDefaultTemplate('sale_confirmation');
  }

  // Prepare variables
  const variables = {
    invoice_no: saleData.invoice_no || 'N/A',
    total: formatCurrency(saleData.final_total || 0),
    item_count: saleData.items?.length?.toString() || '0',
    date: new Date(saleData.transaction_date).toLocaleDateString(),
  };

  // Process template
  const message = processTemplate(template, variables);

  // Queue notification
  const notification = await whatsappService.queueNotification({
    businessId,
    notificationType: 'sale_confirmation',
    recipientPhone,
    messageContent: message,
    metadata: {
      transaction_id: saleData.id,
    },
  });

  return { success: true, notification };
}

/**
 * Send purchase confirmation
 * @param {number} businessId - Business ID
 * @param {object} purchaseData - Purchase transaction data
 * @param {string} recipientPhone - Supplier WhatsApp number
 * @returns {Promise<object>} Notification result
 */
export async function sendPurchaseConfirmation(businessId, purchaseData, recipientPhone) {
  // Check if rule is enabled
  const enabled = await isRuleEnabled(businessId, 'purchase_confirmation');
  if (!enabled) {
    return { skipped: true, reason: 'Rule disabled' };
  }

  // Get template
  let template = await getTemplate(businessId, 'purchase_confirmation');
  if (!template) {
    template = getDefaultTemplate('purchase_confirmation');
  }

  // Prepare variables
  const variables = {
    ref_no: purchaseData.ref_no || 'N/A',
    total: formatCurrency(purchaseData.final_total || 0),
    item_count: purchaseData.items?.length?.toString() || '0',
    date: new Date(purchaseData.transaction_date).toLocaleDateString(),
  };

  // Process template
  const message = processTemplate(template, variables);

  // Queue notification
  const notification = await whatsappService.queueNotification({
    businessId,
    notificationType: 'purchase_confirmation',
    recipientPhone,
    messageContent: message,
    metadata: {
      transaction_id: purchaseData.id,
    },
  });

  return { success: true, notification };
}

