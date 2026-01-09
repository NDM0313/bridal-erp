/**
 * Social Media Routes
 * Handles social media integration (WhatsApp, Facebook, Instagram)
 * 
 * PHASE D: Social Media Integration
 */

import express from 'express';
import { authenticateUser, attachBusinessContext, requirePermission } from '../middleware/auth.js';
import { socialMediaService } from '../services/socialMediaService.js';
import { supabase } from '../config/supabase.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * POST /api/v1/social/webhook/:channelType
 * Webhook endpoint for incoming social media messages
 * Supports: whatsapp, facebook, instagram
 */
router.post('/webhook/:channelType', async (req, res) => {
  try {
    const { channelType } = req.params;
    const signature = req.headers['x-signature'] || req.headers['x-hub-signature-256'];
    const body = req.body;

    // Validate webhook signature
    const businessId = req.query.business_id || body.business_id;
    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'Missing business_id',
      });
    }

    // Get channel config for signature validation
    const { data: channel } = await supabase
      .from('social_channels')
      .select('webhook_secret, is_active')
      .eq('business_id', businessId)
      .eq('channel_type', channelType)
      .eq('is_active', true)
      .single();

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found or inactive',
      });
    }

    // Verify webhook signature
    if (channel.webhook_secret && signature) {
      const isValid = verifyWebhookSignature(body, signature, channel.webhook_secret);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
        });
      }
    }

    // Extract message data based on channel type
    let messageData;
    if (channelType === 'whatsapp') {
      messageData = extractWhatsAppMessage(body);
    } else if (channelType === 'facebook') {
      messageData = extractFacebookMessage(body);
    } else if (channelType === 'instagram') {
      messageData = extractInstagramMessage(body);
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported channel type: ${channelType}`,
      });
    }

    if (!messageData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message format',
      });
    }

    // Get channel ID
    const { data: channelRecord } = await supabase
      .from('social_channels')
      .select('id')
      .eq('business_id', businessId)
      .eq('channel_type', channelType)
      .eq('is_active', true)
      .single();

    // Handle inbound message
    await socialMediaService.handleInboundMessage({
      ...messageData,
      businessId: parseInt(businessId),
      channelId: channelRecord.id,
    });

    // Acknowledge webhook
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
 * POST /api/v1/social/channels
 * Create or update social media channel configuration
 * Requires: admin or manager role
 */
router.post(
  '/channels',
  authenticateUser,
  attachBusinessContext,
  requirePermission('business.manage'), // Admin only
  async (req, res, next) => {
    try {
      const {
        channelType,
        channelName,
        phoneNumber,
        accountId,
        apiKey,
        apiSecret,
        webhookSecret,
        isActive = true,
        settings = {},
      } = req.body;

      if (!channelType || !channelName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: channelType, channelName',
        });
      }

      const validTypes = ['whatsapp', 'facebook', 'instagram', 'telegram'];
      if (!validTypes.includes(channelType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid channelType. Must be one of: ${validTypes.join(', ')}`,
        });
      }

      // Check if channel already exists
      const { data: existing } = await supabase
        .from('social_channels')
        .select('id')
        .eq('business_id', req.businessId)
        .eq('channel_type', channelType)
        .eq('channel_name', channelName)
        .single();

      let channel;
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('social_channels')
          .update({
            phone_number: phoneNumber,
            account_id: accountId,
            api_key: apiKey,
            api_secret: apiSecret,
            webhook_secret: webhookSecret,
            is_active: isActive,
            settings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        channel = data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('social_channels')
          .insert({
            business_id: req.businessId,
            channel_type: channelType,
            channel_name: channelName,
            phone_number: phoneNumber,
            account_id: accountId,
            api_key: apiKey,
            api_secret: apiSecret,
            webhook_secret: webhookSecret,
            is_active: isActive,
            settings,
            created_by: req.user.id,
          })
          .select()
          .single();

        if (error) throw error;
        channel = data;
      }

      res.json({
        success: true,
        data: channel,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/social/channels
 * Get social media channels for business
 */
router.get(
  '/channels',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('social_channels')
        .select('id, channel_type, channel_name, phone_number, is_active, created_at')
        .eq('business_id', req.businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

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
 * GET /api/v1/social/messages
 * Get social media messages
 */
router.get(
  '/messages',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const { direction, status, limit = 50 } = req.query;

      let query = supabase
        .from('social_messages')
        .select('*')
        .eq('business_id', req.businessId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (direction) {
        query = query.eq('direction', direction);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

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
 * Helper: Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const calculatedSignature = hmac.update(payloadString).digest('hex');
    
    // Handle different signature formats
    const providedSignature = signature.replace('sha256=', '').replace('sha1=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(providedSignature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Helper: Extract WhatsApp message from webhook payload
 */
function extractWhatsAppMessage(body) {
  // Adapt based on your WhatsApp provider format
  // Example: Twilio, Cloud API, 360dialog, etc.
  return {
    phoneNumber: body.from || body.phoneNumber || body.wa_id,
    messageText: body.body || body.text || body.message || '',
    metadata: body,
  };
}

/**
 * Helper: Extract Facebook message from webhook payload
 */
function extractFacebookMessage(body) {
  // Facebook Messenger webhook format
  if (body.entry && body.entry[0] && body.entry[0].messaging) {
    const messaging = body.entry[0].messaging[0];
    return {
      phoneNumber: messaging.sender?.id,
      messageText: messaging.message?.text || '',
      metadata: body,
    };
  }
  return null;
}

/**
 * Helper: Extract Instagram message from webhook payload
 */
function extractInstagramMessage(body) {
  // Instagram DM webhook format (similar to Facebook)
  if (body.entry && body.entry[0] && body.entry[0].messaging) {
    const messaging = body.entry[0].messaging[0];
    return {
      phoneNumber: messaging.sender?.id,
      messageText: messaging.message?.text || '',
      metadata: body,
    };
  }
  return null;
}

export default router;
