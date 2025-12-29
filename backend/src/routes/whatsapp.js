/**
 * WhatsApp Routes
 * Webhook endpoints for WhatsApp integration
 */

import express from 'express';
import { authenticateUser, attachBusinessContext } from '../middleware/auth.js';
import { parseCommand, processCommand } from '../services/commandService.js';
import { whatsappService } from '../services/whatsappService.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/v1/whatsapp/webhook
 * Webhook endpoint for incoming WhatsApp messages
 */
router.post('/webhook', async (req, res) => {
  try {
    const { phoneNumber, messageText, metadata = {} } = req.body;

    if (!phoneNumber || !messageText) {
      return res.status(400).json({
        success: false,
        error: 'Missing phoneNumber or messageText',
      });
    }

    // Store incoming message
    const { data: storedMessage, error: storeError } = await supabase
      .from('whatsapp_messages')
      .insert({
        phone_number: phoneNumber,
        message_text: messageText,
        message_type: 'text',
        metadata,
      })
      .select()
      .single();

    if (storeError) {
      console.error('Error storing message:', storeError);
    }

    // Try to identify business from phone number
    // This can be enhanced with a phone-to-business mapping table
    let businessId = null;
    // For now, we'll need to get business_id from metadata or a mapping table
    // This is a placeholder - implement based on your business logic

    // Parse command
    const command = parseCommand(messageText);

    if (command) {
      // Update stored message with command info
      if (storedMessage) {
        await supabase
          .from('whatsapp_messages')
          .update({
            command_type: command.commandType,
            command_params: command.params,
            processed: true,
          })
          .eq('id', storedMessage.id);
      }

      // Process command (requires businessId)
      // For now, return acknowledgment
      // In production, you'd identify business from phone number
      if (businessId) {
        const result = await processCommand(businessId, phoneNumber, command);
        
        // Update stored message with response
        if (storedMessage && result.notification) {
          await supabase
            .from('whatsapp_messages')
            .update({
              response_sent: true,
              response_notification_id: result.notification.id,
            })
            .eq('id', storedMessage.id);
        }
      } else {
        // Business not identified - send generic response
        const responseMessage = '❌ Business not identified. Please contact support.';
        await whatsappService.queueNotification({
          businessId: null, // Will need to handle this case
          notificationType: 'command_response',
          recipientPhone: phoneNumber,
          messageContent: responseMessage,
        });
      }
    }

    // Acknowledge webhook (important for WhatsApp providers)
    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/whatsapp/send
 * Send WhatsApp message (admin/manual)
 */
router.post(
  '/send',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const { phoneNumber, message } = req.body;
      const businessId = req.businessId;

      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: phoneNumber, message',
        });
      }

    // Queue notification
    const notification = await whatsappService.queueNotification({
      businessId,
      notificationType: 'command_response',
      recipientPhone: phoneNumber,
      messageContent: message,
    });

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/whatsapp/notifications
 * Get notification queue status
 */
router.get(
  '/notifications',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const businessId = req.businessId; // From auth middleware
    const { status, limit = 50 } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/whatsapp/process-queue
 * Manually trigger queue processing (for cron jobs)
 */
router.post('/process-queue', async (req, res, next) => {
  try {
    const { limit = 10 } = req.body;

    const results = await whatsappService.processPendingNotifications(limit);

    res.json({
      success: true,
      data: {
        processed: results.length,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

