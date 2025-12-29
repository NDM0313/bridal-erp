/**
 * Command Service
 * Handles WhatsApp commands (STOCK, INVOICE, etc.)
 */

import { supabase } from '../config/supabase.js';
import { whatsappService } from './whatsappService.js';
import { formatCurrency } from '../utils/formatters.js';

/**
 * Parse command from message
 * @param {string} message - Message text
 * @returns {object|null} Parsed command or null
 */
export function parseCommand(message) {
  const trimmed = message.trim().toUpperCase();
  const parts = trimmed.split(/\s+/);

  if (parts.length === 0) return null;

  const commandType = parts[0];
  const params = parts.slice(1).join(' ');

  return {
    commandType,
    params,
    originalMessage: message,
  };
}

/**
 * Handle STOCK command
 * @param {number} businessId - Business ID
 * @param {string} sku - Product SKU
 * @returns {Promise<string>} Response message
 */
async function handleStockCommand(businessId, sku) {
  try {
    // Find product by SKU
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        variations (
          id,
          name,
          sub_sku,
          variation_location_details (
            location_id,
            qty_available,
            location:business_locations (
              name
            )
          )
        )
      `)
      .eq('business_id', businessId)
      .eq('sku', sku)
      .single();

    if (error || !product) {
      return `❌ Product with SKU "${sku}" not found.`;
    }

    // Format stock information
    let message = `📦 *${product.name}* (SKU: ${product.sku})\n\n`;
    message += '*Stock Levels:*\n';

    if (product.variations && product.variations.length > 0) {
      for (const variation of product.variations) {
        message += `\n*${variation.name}* (${variation.sub_sku}):\n`;

        if (variation.variation_location_details && variation.variation_location_details.length > 0) {
          for (const stock of variation.variation_location_details) {
            const locationName = stock.location?.name || 'Unknown';
            message += `  • ${locationName}: ${stock.qty_available} pieces\n`;
          }
        } else {
          message += `  • No stock available\n`;
        }
      }
    } else {
      message += 'No variations found.\n';
    }

    return message;
  } catch (error) {
    return `❌ Error fetching stock: ${error.message}`;
  }
}

/**
 * Handle INVOICE command
 * @param {number} businessId - Business ID
 * @param {string} invoiceNo - Invoice number
 * @returns {Promise<string>} Response message
 */
async function handleInvoiceCommand(businessId, invoiceNo) {
  try {
    // Find transaction by invoice number
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        id,
        invoice_no,
        transaction_date,
        final_total,
        customer_type,
        contact:contacts (
          name
        ),
        location:business_locations (
          name
        ),
        items:transaction_sell_lines (
          quantity,
          unit_price,
          line_total,
          variation:variations (
            name,
            sub_sku
          ),
          product:products (
            name
          ),
          unit:units (
            actual_name
          )
        )
      `)
      .eq('business_id', businessId)
      .eq('type', 'sell')
      .eq('invoice_no', invoiceNo)
      .single();

    if (error || !transaction) {
      return `❌ Invoice "${invoiceNo}" not found.`;
    }

    // Format invoice information
    let message = `🧾 *Invoice: ${transaction.invoice_no}*\n\n`;
    message += `Date: ${new Date(transaction.transaction_date).toLocaleDateString()}\n`;
    message += `Customer: ${transaction.contact?.name || 'Walk-in'}\n`;
    message += `Location: ${transaction.location?.name || 'N/A'}\n`;
    message += `Type: ${transaction.customer_type}\n\n`;
    message += '*Items:*\n';

    if (transaction.items && transaction.items.length > 0) {
      for (const item of transaction.items) {
        const productName = item.product?.name || 'Product';
        const variationName = item.variation?.name || '';
        const unitName = item.unit?.actual_name || '';
        message += `• ${productName} ${variationName ? `(${variationName})` : ''}\n`;
        message += `  ${item.quantity} ${unitName} × ${formatCurrency(item.unit_price)} = ${formatCurrency(item.line_total)}\n`;
      }
    }

    message += `\n*Total: ${formatCurrency(transaction.final_total)}*`;

    return message;
  } catch (error) {
    return `❌ Error fetching invoice: ${error.message}`;
  }
}

/**
 * Process command and return response
 * @param {number} businessId - Business ID
 * @param {string} phoneNumber - Sender's phone number
 * @param {object} command - Parsed command
 * @returns {Promise<object>} Response data
 */
export async function processCommand(businessId, phoneNumber, command) {
  const { commandType, params } = command;

  let responseMessage = '';

  switch (commandType) {
    case 'STOCK':
      if (!params) {
        responseMessage = '❌ Please provide a SKU. Usage: STOCK <sku>';
      } else {
        responseMessage = await handleStockCommand(businessId, params);
      }
      break;

    case 'INVOICE':
      if (!params) {
        responseMessage = '❌ Please provide an invoice number. Usage: INVOICE <invoice_no>';
      } else {
        responseMessage = await handleInvoiceCommand(businessId, params);
      }
      break;

    case 'HELP':
      responseMessage = `📱 *Available Commands:*\n\n`;
      responseMessage += `• STOCK <sku> - Check stock for a product\n`;
      responseMessage += `• INVOICE <invoice_no> - Get invoice details\n`;
      responseMessage += `• HELP - Show this help message\n`;
      break;

    default:
      responseMessage = `❌ Unknown command: ${commandType}\n\n`;
      responseMessage += `Type HELP for available commands.`;
  }

  // Queue response notification
  const notification = await whatsappService.queueNotification({
    businessId,
    notificationType: 'command_response',
    recipientPhone: phoneNumber,
    messageContent: responseMessage,
    metadata: {
      command_type: commandType,
      command_params: params,
    },
  });

  return {
    success: true,
    notification,
    responseMessage,
  };
}

