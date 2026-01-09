/**
 * Social Media Service
 * Handles social media integration (WhatsApp, Facebook, Instagram)
 * 
 * PHASE D: Social Media Integration
 * - Event-driven design
 * - Extensible for multiple platforms
 * - Idempotent message sending
 */

import { supabase } from '../config/supabase.js';
import { whatsappService } from './whatsappService.js';
import { systemEvents, EVENT_NAMES } from './eventService.js';

/**
 * Social Media Service
 * Handles inbound/outbound messages across platforms
 */
class SocialMediaService {
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for system events
   * Listens to events and triggers social media notifications
   */
  setupEventListeners() {
    // Sale created
    systemEvents.on(EVENT_NAMES.SALE_CREATED, (data) => {
      this.handleSaleCreated(data).catch(err => 
        console.error('Error handling sale.created event:', err)
      );
    });

    // Production created
    systemEvents.on(EVENT_NAMES.PRODUCTION_CREATED, (data) => {
      this.handleProductionCreated(data).catch(err => 
        console.error('Error handling production.created event:', err)
      );
    });

    // Production completed
    systemEvents.on(EVENT_NAMES.PRODUCTION_COMPLETED, (data) => {
      this.handleProductionCompleted(data).catch(err => 
        console.error('Error handling production.completed event:', err)
      );
    });

    // Payment received
    systemEvents.on(EVENT_NAMES.PAYMENT_RECEIVED, (data) => {
      this.handlePaymentReceived(data).catch(err => 
        console.error('Error handling payment.received event:', err)
      );
    });
  }

  /**
   * Handle inbound WhatsApp message
   * Creates LEAD or SALE based on message content
   * 
   * @param {object} messageData - Incoming message data
   * @returns {Promise<object>} Processing result
   */
  async handleInboundMessage(messageData) {
    const {
      phoneNumber,
      messageText,
      businessId,
      channelId,
      metadata = {},
    } = messageData;

    // Store inbound message
    const messageRecord = await this.storeMessage({
      businessId,
      channelId,
      direction: 'inbound',
      fromNumber: phoneNumber,
      messageText,
      metadata,
    });

    // Detect order intent
    const orderIntent = this.detectOrderIntent(messageText);
    
    if (orderIntent.hasIntent) {
      // Check if customer exists
      const customer = await this.findCustomerByPhone(phoneNumber, businessId);
      
      if (customer && orderIntent.confirmed) {
        // Customer exists and confirmed order - create draft sale
        return await this.createSaleFromMessage({
          customer,
          messageText,
          businessId,
          messageRecordId: messageRecord.id,
        });
      } else {
        // Create or update lead
        return await this.createOrUpdateLead({
          phoneNumber,
          messageText,
          businessId,
          messageRecordId: messageRecord.id,
          orderIntent,
        });
      }
    }

    return {
      success: true,
      action: 'message_stored',
      leadId: null,
      saleId: null,
    };
  }

  /**
   * Detect order intent from message text
   * @param {string} messageText - Message text
   * @returns {object} Intent detection result
   */
  detectOrderIntent(messageText) {
    const text = messageText.toLowerCase();
    
    // Order keywords
    const orderKeywords = ['order', 'buy', 'purchase', 'want', 'need', 'book'];
    const confirmKeywords = ['yes', 'confirm', 'ok', 'okay', 'proceed', 'go ahead'];
    
    const hasIntent = orderKeywords.some(keyword => text.includes(keyword));
    const confirmed = confirmKeywords.some(keyword => text.includes(keyword));
    
    return {
      hasIntent,
      confirmed,
      confidence: hasIntent ? 0.7 : 0.0,
    };
  }

  /**
   * Find customer by phone number
   * @param {string} phoneNumber - Phone number
   * @param {number} businessId - Business ID
   * @returns {Promise<object|null>} Customer or null
   */
  async findCustomerByPhone(phoneNumber, businessId) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, mobile, email, customer_type')
      .eq('business_id', businessId)
      .eq('mobile', phoneNumber)
      .eq('contact_type', 'customer')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding customer:', error);
      return null;
    }

    return data || null;
  }

  /**
   * Create or update lead from message
   * @param {object} leadData - Lead data
   * @returns {Promise<object>} Created/updated lead
   */
  async createOrUpdateLead(leadData) {
    const {
      phoneNumber,
      messageText,
      businessId,
      messageRecordId,
      orderIntent,
    } = leadData;

    // Check if lead exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, status')
      .eq('business_id', businessId)
      .eq('mobile', phoneNumber)
      .eq('status', 'new')
      .single();

    if (existingLead) {
      // Update existing lead
      const { data: updatedLead } = await supabase
        .from('leads')
        .update({
          notes: `${existingLead.notes || ''}\n\n${new Date().toISOString()}: ${messageText}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      return {
        success: true,
        action: 'lead_updated',
        leadId: updatedLead.id,
        saleId: null,
      };
    }

    // Create new lead
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        business_id: businessId,
        mobile: phoneNumber,
        source: 'whatsapp',
        status: 'new',
        notes: messageText,
        metadata: {
          message_record_id: messageRecordId,
          order_intent: orderIntent,
        },
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create lead: ${error.message}`);
    }

    return {
      success: true,
      action: 'lead_created',
      leadId: newLead.id,
      saleId: null,
    };
  }

  /**
   * Create draft sale from confirmed message
   * @param {object} saleData - Sale data
   * @returns {Promise<object>} Created sale
   */
  async createSaleFromMessage(saleData) {
    const {
      customer,
      messageText,
      businessId,
      messageRecordId,
    } = saleData;

    // This is a placeholder - actual sale creation should be done via salesService
    // For now, we'll just return a reference
    // In production, you'd parse the message to extract items and call createSale()
    
    return {
      success: true,
      action: 'sale_created_draft',
      leadId: null,
      saleId: null, // Would be actual sale ID if implemented
      note: 'Sale creation from WhatsApp message requires manual processing or message parsing',
    };
  }

  /**
   * Store social media message
   * @param {object} messageData - Message data
   * @returns {Promise<object>} Stored message record
   */
  async storeMessage(messageData) {
    const {
      businessId,
      channelId,
      direction,
      fromNumber,
      toNumber,
      messageText,
      messageType = 'text',
      referenceType = null,
      referenceId = null,
      metadata = {},
    } = messageData;

    // Get channel type
    const { data: channel } = await supabase
      .from('social_channels')
      .select('channel_type')
      .eq('id', channelId)
      .single();

    const { data, error } = await supabase
      .from('social_messages')
      .insert({
        business_id: businessId,
        channel_id: channelId,
        direction,
        channel_type: channel?.channel_type || 'whatsapp',
        from_number: fromNumber,
        to_number: toNumber,
        message_text: messageText,
        message_type: messageType,
        status: direction === 'inbound' ? 'received' : 'pending',
        reference_type: referenceType,
        reference_id: referenceId,
        metadata,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store message: ${error.message}`);
    }

    return data;
  }

  /**
   * Send outbound message (idempotent)
   * @param {object} messageData - Message data
   * @returns {Promise<object>} Sent message record
   */
  async sendMessage(messageData) {
    const {
      businessId,
      channelId,
      toNumber,
      messageText,
      referenceType = null,
      referenceId = null,
      metadata = {},
    } = messageData;

    // Check for existing message (idempotency)
    const { data: existing } = await supabase
      .from('social_messages')
      .select('id, status')
      .eq('business_id', businessId)
      .eq('channel_id', channelId)
      .eq('direction', 'outbound')
      .eq('to_number', toNumber)
      .eq('reference_type', referenceType)
      .eq('reference_id', referenceId)
      .eq('status', 'sent')
      .single();

    if (existing) {
      // Message already sent (idempotent)
      return existing;
    }

    // Store message as pending
    const messageRecord = await this.storeMessage({
      businessId,
      channelId,
      direction: 'outbound',
      toNumber,
      messageText,
      referenceType,
      referenceId,
      metadata,
    });

    // Get channel config
    const { data: channel } = await supabase
      .from('social_channels')
      .select('*')
      .eq('id', channelId)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single();

    if (!channel) {
      throw new Error('Channel not found or inactive');
    }

    // Send via appropriate provider
    let sendResult;
    if (channel.channel_type === 'whatsapp') {
      sendResult = await whatsappService.sendImmediate(toNumber, messageText);
    } else {
      // Future: Facebook, Instagram providers
      throw new Error(`Channel type ${channel.channel_type} not yet implemented`);
    }

    // Update message status
    if (sendResult.success) {
      await supabase
        .from('social_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', messageRecord.id);
    } else {
      await supabase
        .from('social_messages')
        .update({
          status: 'failed',
          error_message: sendResult.error,
        })
        .eq('id', messageRecord.id);
    }

    return messageRecord;
  }

  /**
   * Handle sale.created event
   * @param {object} data - Event data
   */
  async handleSaleCreated(data) {
    const { sale, businessId, locationId } = data;
    
    // Get customer WhatsApp number
    if (!sale.contact_id) return;

    const { data: contact } = await supabase
      .from('contacts')
      .select('mobile')
      .eq('id', sale.contact_id)
      .eq('business_id', businessId)
      .single();

    if (!contact?.mobile) return;

    // Get active WhatsApp channel
    const { data: channel } = await supabase
      .from('social_channels')
      .select('id')
      .eq('business_id', businessId)
      .eq('channel_type', 'whatsapp')
      .eq('is_active', true)
      .single();

    if (!channel) return;

    // Send draft confirmation message
    const message = this.getTemplate('sale.created', {
      invoiceNo: sale.invoice_no,
      total: sale.final_total,
    });

    await this.sendMessage({
      businessId,
      channelId: channel.id,
      toNumber: contact.mobile,
      messageText: message,
      referenceType: 'sale',
      referenceId: sale.id,
    });
  }

  /**
   * Handle production.created event
   * @param {object} data - Event data
   */
  async handleProductionCreated(data) {
    const { productionOrder, businessId } = data;
    
    // Get customer WhatsApp number
    if (!productionOrder.customer_id) return;

    const { data: contact } = await supabase
      .from('contacts')
      .select('mobile')
      .eq('id', productionOrder.customer_id)
      .eq('business_id', businessId)
      .single();

    if (!contact?.mobile) return;

    // Get active WhatsApp channel
    const { data: channel } = await supabase
      .from('social_channels')
      .select('id')
      .eq('business_id', businessId)
      .eq('channel_type', 'whatsapp')
      .eq('is_active', true)
      .single();

    if (!channel) return;

    // Send production order created message
    const message = this.getTemplate('production.created', {
      orderNo: productionOrder.order_no,
    });

    await this.sendMessage({
      businessId,
      channelId: channel.id,
      toNumber: contact.mobile,
      messageText: message,
      referenceType: 'production',
      referenceId: productionOrder.id,
    });
  }

  /**
   * Handle production.completed event
   * @param {object} data - Event data
   */
  async handleProductionCompleted(data) {
    const { productionOrder, businessId } = data;
    
    // Get customer WhatsApp number
    if (!productionOrder.customer_id) return;

    const { data: contact } = await supabase
      .from('contacts')
      .select('mobile')
      .eq('id', productionOrder.customer_id)
      .eq('business_id', businessId)
      .single();

    if (!contact?.mobile) return;

    // Get active WhatsApp channel
    const { data: channel } = await supabase
      .from('social_channels')
      .select('id')
      .eq('business_id', businessId)
      .eq('channel_type', 'whatsapp')
      .eq('is_active', true)
      .single();

    if (!channel) return;

    // Send production completed message
    const message = this.getTemplate('production.completed', {
      orderNo: productionOrder.order_no,
    });

    await this.sendMessage({
      businessId,
      channelId: channel.id,
      toNumber: contact.mobile,
      messageText: message,
      referenceType: 'production',
      referenceId: productionOrder.id,
    });
  }

  /**
   * Handle payment.received event
   * @param {object} data - Event data
   */
  async handlePaymentReceived(data) {
    const { payment, businessId } = data;
    
    // Get customer WhatsApp number
    if (!payment.contact_id) return;

    const { data: contact } = await supabase
      .from('contacts')
      .select('mobile')
      .eq('id', payment.contact_id)
      .eq('business_id', businessId)
      .single();

    if (!contact?.mobile) return;

    // Get active WhatsApp channel
    const { data: channel } = await supabase
      .from('social_channels')
      .select('id')
      .eq('business_id', businessId)
      .eq('channel_type', 'whatsapp')
      .eq('is_active', true)
      .single();

    if (!channel) return;

    // Send payment received message
    const message = this.getTemplate('payment.received', {
      amount: payment.amount,
      invoiceNo: payment.invoice_no || 'N/A',
    });

    await this.sendMessage({
      businessId,
      channelId: channel.id,
      toNumber: contact.mobile,
      messageText: message,
      referenceType: 'payment',
      referenceId: payment.id,
    });
  }

  /**
   * Get message template
   * @param {string} templateKey - Template key
   * @param {object} variables - Template variables
   * @returns {string} Formatted message
   */
  getTemplate(templateKey, variables = {}) {
    const templates = {
      'sale.created': `✅ Order Confirmed!\n\nInvoice: {{invoiceNo}}\nTotal: ₹{{total}}\n\nYour order has been received and is being processed.`,
      'production.created': `🏭 Production Started!\n\nOrder: {{orderNo}}\n\nYour order is now in production. We'll keep you updated.`,
      'production.completed': `✅ Production Complete!\n\nOrder: {{orderNo}}\n\nYour order is ready for delivery.`,
      'payment.received': `💰 Payment Received!\n\nAmount: ₹{{amount}}\nInvoice: {{invoiceNo}}\n\nThank you for your payment!`,
      'order.ready': `📦 Order Ready!\n\nYour order is ready for pickup/delivery.`,
    };

    let message = templates[templateKey] || 'Notification';
    
    // Replace variables
    Object.keys(variables).forEach(key => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
    });

    return message;
  }
}

export const socialMediaService = new SocialMediaService();
