/**
 * Notification Processor Job
 * Processes pending notifications queue
 * Can be run as a cron job or scheduled task
 */

import { whatsappService } from '../services/whatsappService.js';
import { supabase } from '../config/supabase.js';

/**
 * Process pending notifications
 * Call this function periodically (e.g., every minute via cron)
 * @param {number} batchSize - Number of notifications to process per run
 * @returns {Promise<object>} Processing results
 */
export async function processNotificationQueue(batchSize = 10) {
  try {
    const results = await whatsappService.processPendingNotifications(batchSize);

    return {
      success: true,
      processed: results.length,
      results,
    };
  } catch (error) {
    console.error('Error processing notification queue:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check and send low stock alerts
 * Call this function periodically (e.g., every hour)
 * @param {number} businessId - Business ID (optional, null for all businesses)
 * @returns {Promise<object>} Processing results
 */
export async function checkLowStockAlerts(businessId = null) {
  try {
    const { checkLowStockAlerts } = await import('../services/automationService.js');
    
    if (businessId) {
      // Check for specific business
      const notifications = await checkLowStockAlerts(businessId);
      return {
        success: true,
        businessId,
        notificationsSent: notifications.length,
        notifications,
      };
    } else {
      // Check for all businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id');

      const allResults = [];
      for (const business of businesses || []) {
        try {
          const notifications = await checkLowStockAlerts(business.id);
          allResults.push({
            businessId: business.id,
            notificationsSent: notifications.length,
            notifications,
          });
        } catch (error) {
          console.error(`Error checking low stock for business ${business.id}:`, error);
        }
      }

      return {
        success: true,
        businessesChecked: businesses?.length || 0,
        results: allResults,
      };
    }
  } catch (error) {
    console.error('Error checking low stock alerts:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Example cron job setup (using node-cron or similar):
// import cron from 'node-cron';
// 
// // Process notification queue every minute
// cron.schedule('* * * * *', async () => {
//   await processNotificationQueue(10);
// });
//
// // Check low stock alerts every hour
// cron.schedule('0 * * * *', async () => {
//   await checkLowStockAlerts();
// });

