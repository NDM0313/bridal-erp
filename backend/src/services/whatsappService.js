/**
 * WhatsApp Service
 * Provider-agnostic WhatsApp integration
 * 
 * CRITICAL: This is a generic design that can work with any WhatsApp Business API provider
 * (Twilio, WhatsApp Cloud API, 360dialog, etc.)
 */

import { supabase } from '../config/supabase.js';

/**
 * WhatsApp Provider Interface
 * Implement this interface for specific providers
 */
export class WhatsAppProvider {
  /**
   * Send a WhatsApp message
   * @param {string} to - Recipient phone number (with country code)
   * @param {string} message - Message content
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendMessage(to, message) {
    throw new Error('sendMessage must be implemented by provider');
  }

  /**
   * Verify webhook signature (if provider supports it)
   * @param {object} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean}
   */
  verifyWebhook(payload, signature) {
    return true; // Default: no verification
  }
}

/**
 * Default WhatsApp Provider (Mock/Example)
 * Replace this with actual provider implementation
 */
class DefaultWhatsAppProvider extends WhatsAppProvider {
  constructor(config) {
    super();
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
  }

  async sendMessage(to, message) {
    try {
      // Example: Replace with actual provider API call
      // const response = await fetch(`${this.apiUrl}/send`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ to, message }),
      // });

      // For now, return success (mock)
      console.log(`[WhatsApp] Sending to ${to}: ${message.substring(0, 50)}...`);
      return {
        success: true,
        messageId: `msg_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * WhatsApp Service
 * Handles message sending and queue management
 */
class WhatsAppService {
  constructor() {
    // Initialize with default provider (can be swapped)
    this.provider = new DefaultWhatsAppProvider({
      apiKey: process.env.WHATSAPP_API_KEY || '',
      apiUrl: process.env.WHATSAPP_API_URL || '',
    });
  }

  /**
   * Set custom provider
   * @param {WhatsAppProvider} provider - Provider instance
   */
  setProvider(provider) {
    this.provider = provider;
  }

  /**
   * Queue a notification for sending
   * @param {object} notificationData - Notification data
   * @returns {Promise<object>} Created notification record
   */
  async queueNotification(notificationData) {
    const {
      businessId,
      notificationType,
      recipientPhone,
      messageContent,
      metadata = {},
    } = notificationData;

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        business_id: businessId,
        notification_type: notificationType,
        recipient_phone: recipientPhone,
        message_content: messageContent,
        status: 'pending',
        metadata,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to queue notification: ${error.message}`);
    }

    return data;
  }

  /**
   * Process pending notifications (send via WhatsApp)
   * @param {number} limit - Number of notifications to process
   * @returns {Promise<Array>} Processed notifications
   */
  async processPendingNotifications(limit = 10) {
    const { data: pendingNotifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch pending notifications: ${error.message}`);
    }

    const results = [];

    for (const notification of pendingNotifications || []) {
      try {
        const result = await this.provider.sendMessage(
          notification.recipient_phone,
          notification.message_content
        );

        if (result.success) {
          // Update notification as sent
          await supabase
            .from('notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              error_message: null,
            })
            .eq('id', notification.id);

          results.push({ ...notification, status: 'sent' });
        } else {
          // Increment retry count
          const newRetryCount = notification.retry_count + 1;
          const newStatus = newRetryCount >= notification.max_retries ? 'failed' : 'pending';

          await supabase
            .from('notifications')
            .update({
              retry_count: newRetryCount,
              status: newStatus,
              error_message: result.error || 'Unknown error',
            })
            .eq('id', notification.id);

          results.push({ ...notification, status: newStatus });
        }
      } catch (error) {
        // Handle error
        const newRetryCount = notification.retry_count + 1;
        const newStatus = newRetryCount >= notification.max_retries ? 'failed' : 'pending';

        await supabase
          .from('notifications')
          .update({
            retry_count: newRetryCount,
            status: newStatus,
            error_message: error.message,
          })
          .eq('id', notification.id);

        results.push({ ...notification, status: newStatus });
      }
    }

    return results;
  }

  /**
   * Send message immediately (bypass queue)
   * @param {string} to - Recipient phone number
   * @param {string} message - Message content
   * @returns {Promise<object>} Send result
   */
  async sendImmediate(to, message) {
    return await this.provider.sendMessage(to, message);
  }
}

export const whatsappService = new WhatsAppService();
// WhatsAppProvider is already exported on line 15, no need to re-export

