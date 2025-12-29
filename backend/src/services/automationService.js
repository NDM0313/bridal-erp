/**
 * Automation Service
 * Triggers notifications based on business events
 */

import { sendInvoiceNotification, sendLowStockAlert, sendSaleConfirmation, sendPurchaseConfirmation } from './notificationService.js';
import { supabase } from '../config/supabase.js';

/**
 * Check and send low stock alerts
 * @param {number} businessId - Business ID
 * @returns {Promise<Array>} Sent notifications
 */
export async function checkLowStockAlerts(businessId) {
  try {
    // Get products with low stock
    const { data: lowStockItems, error } = await supabase
      .from('variation_location_details')
      .select(`
        variation_id,
        location_id,
        qty_available,
        variation:variations (
          id,
          name,
          sub_sku,
          product:products (
            id,
            name,
            sku,
            alert_quantity,
            business_id
          )
        ),
        location:business_locations (
          id,
          name,
          business_id
        )
      `)
      .eq('variation.product.business_id', businessId)
      .eq('variation.product.is_inactive', false);

    if (error) {
      throw new Error(`Failed to fetch low stock items: ${error.message}`);
    }

    const notifications = [];

    for (const item of lowStockItems || []) {
      const product = item.variation?.product;
      const location = item.location;
      const alertQuantity = product?.alert_quantity || 0;

      if (product && location && item.qty_available <= alertQuantity) {
        // Get business WhatsApp number from automation rules
        const { data: rule } = await supabase
          .from('automation_rules')
          .select('whatsapp_number')
          .eq('business_id', businessId)
          .eq('rule_type', 'low_stock_alert')
          .eq('is_enabled', true)
          .single();

        if (rule?.whatsapp_number) {
          const stockData = {
            productName: product.name,
            sku: product.sku,
            qtyAvailable: item.qty_available,
            alertQuantity,
            baseUnit: 'Pieces',
            locationName: location.name,
            variationId: item.variation_id,
            locationId: item.location_id,
          };

          const result = await sendLowStockAlert(businessId, stockData, rule.whatsapp_number);
          if (result.success) {
            notifications.push(result.notification);
          }
        }
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error checking low stock alerts:', error);
    throw error;
  }
}

/**
 * Trigger sale notifications
 * @param {number} businessId - Business ID
 * @param {object} saleData - Sale transaction data
 * @returns {Promise<Array>} Sent notifications
 */
export async function triggerSaleNotifications(businessId, saleData) {
  const notifications = [];

  try {
    // Get customer WhatsApp number from contact
    let customerPhone = null;
    if (saleData.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('whatsapp_number, name')
        .eq('id', saleData.contact_id)
        .single();

      customerPhone = contact?.whatsapp_number;
    }

    // Send sale confirmation
    if (customerPhone) {
      const confirmationResult = await sendSaleConfirmation(businessId, saleData, customerPhone);
      if (confirmationResult.success) {
        notifications.push(confirmationResult.notification);
      }
    }

    // Send invoice notification
    if (customerPhone) {
      const invoiceResult = await sendInvoiceNotification(businessId, saleData, customerPhone);
      if (invoiceResult.success) {
        notifications.push(invoiceResult.notification);
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error triggering sale notifications:', error);
    throw error;
  }
}

/**
 * Trigger purchase notifications
 * @param {number} businessId - Business ID
 * @param {object} purchaseData - Purchase transaction data
 * @returns {Promise<Array>} Sent notifications
 */
export async function triggerPurchaseNotifications(businessId, purchaseData) {
  const notifications = [];

  try {
    // Get supplier WhatsApp number from contact
    let supplierPhone = null;
    if (purchaseData.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('whatsapp_number')
        .eq('id', purchaseData.contact_id)
        .single();

      supplierPhone = contact?.whatsapp_number;
    }

    // Send purchase confirmation
    if (supplierPhone) {
      const result = await sendPurchaseConfirmation(businessId, purchaseData, supplierPhone);
      if (result.success) {
        notifications.push(result.notification);
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error triggering purchase notifications:', error);
    throw error;
  }
}

