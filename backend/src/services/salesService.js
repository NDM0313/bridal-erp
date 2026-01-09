/**
 * Sales Service
 * Handles sales transactions and inventory updates
 * 
 * CRITICAL BUSINESS RULES:
 * - Only transactions with status = 'final' affect stock
 * - Stock is deducted in BASE UNIT (Pieces)
 * - Price selection based on customer_type (retail/wholesale)
 * - Unit conversion handled automatically
 */

import { supabase } from '../config/supabase.js';
import { convertToBaseUnit, getPriceByCustomerType } from '../utils/unitConverter.js';
import { validateStockAvailability, deductStockForSale } from './inventoryService.js';
import { createProductionOrderFromSale } from './productionService.js';

/**
 * Create a sales transaction
 * @param {object} saleData - Sale data
 * @param {number} businessId - Business ID
 * @param {number} userId - User ID (created_by)
 * @returns {Promise<object>} Created transaction with line items
 */
export async function createSale(saleData, businessId, userId) {
  const {
    locationId,
    contactId = null,
    customerType = 'retail', // 'retail' or 'wholesale'
    items = [],
    paymentMethod = 'cash',
    discountType = null,
    discountAmount = 0,
    additionalNotes = null,
    status = 'draft', // 'draft' or 'final'
  } = saleData;

  // Validate required fields
  if (!locationId || !items || items.length === 0) {
    throw new Error('Missing required fields: locationId and items are required');
  }

  // Validate customer type
  if (!['retail', 'wholesale'].includes(customerType)) {
    throw new Error("customerType must be 'retail' or 'wholesale'");
  }

  // Get contact's customer_type if contactId provided
  let finalCustomerType = customerType;
  if (contactId) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('customer_type')
      .eq('id', contactId)
      .eq('business_id', businessId)
      .single();

    if (contact && contact.customer_type) {
      finalCustomerType = contact.customer_type;
    }
  }

  // Process items and calculate totals
  const processedItems = [];
  let totalBeforeTax = 0;
  let totalTax = 0;

  // Get all variations and units in one query
  const variationIds = items.map((item) => item.variationId);
  const unitIds = [...new Set(items.map((item) => item.unitId))];

  const { data: variations } = await supabase
    .from('variations')
    .select('id, retail_price, wholesale_price, product_id')
    .in('id', variationIds);

  const { data: units } = await supabase
    .from('units')
    .select('id, actual_name, short_name, base_unit_id, base_unit_multiplier')
    .in('id', unitIds);

  // Get base unit (Pieces) - assume unit_id = 1 is Pieces, or find it
  const { data: baseUnitData } = await supabase
    .from('units')
    .select('id, actual_name, short_name')
    .eq('business_id', businessId)
    .is('base_unit_id', null)
    .limit(1)
    .single();

  if (!baseUnitData) {
    throw new Error('Base unit (Pieces) not found for this business');
  }

  const baseUnit = baseUnitData;

  // Validate stock availability for all items (if status is final)
  if (status === 'final') {
    for (const item of items) {
      const unit = units.find((u) => u.id === item.unitId);
      const variation = variations.find((v) => v.id === item.variationId);

      if (!unit) {
        throw new Error(`Unit with id ${item.unitId} not found`);
      }
      if (!variation) {
        throw new Error(`Variation with id ${item.variationId} not found`);
      }

      const stockValidation = await validateStockAvailability(
        item.variationId,
        locationId,
        item.quantity,
        unit,
        baseUnit
      );

      if (!stockValidation.isAvailable) {
        throw new Error(
          `Insufficient stock for variation ${item.variationId}. Available: ${stockValidation.currentStock} pieces, Required: ${stockValidation.requestedInPieces} pieces`
        );
      }
    }
  }

  // Process each item
  for (const item of items) {
    const unit = units.find((u) => u.id === item.unitId);
    const variation = variations.find((v) => v.id === item.variationId);

    if (!unit || !variation) {
      throw new Error(`Unit or variation not found for item`);
    }

    // Get price based on customer type
    const unitPrice = getPriceByCustomerType(variation, finalCustomerType);

    // Calculate line total
    const lineTotal = item.quantity * unitPrice;
    totalBeforeTax += lineTotal;

    processedItems.push({
      product_id: variation.product_id,
      variation_id: item.variationId,
      quantity: item.quantity,
      unit_id: item.unitId,
      unit_price: unitPrice,
      unit_price_inc_tax: unitPrice, // Assuming tax is included in price for now
      line_total: lineTotal,
      item_tax: 0, // Tax calculation can be added later
    });
  }

  // Calculate final total
  let discount = 0;
  if (discountType === 'fixed') {
    discount = discountAmount;
  } else if (discountType === 'percentage') {
    discount = (totalBeforeTax * discountAmount) / 100;
  }

  const finalTotal = totalBeforeTax - discount + totalTax;

  // Generate invoice number (simple implementation)
  const invoiceNo = await generateInvoiceNumber(businessId);

  // Create transaction
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      business_id: businessId,
      location_id: locationId,
      type: 'sell',
      status: status,
      payment_status: status === 'final' ? 'paid' : 'due',
      contact_id: contactId,
      customer_type: finalCustomerType,
      invoice_no: invoiceNo,
      transaction_date: new Date().toISOString(),
      total_before_tax: totalBeforeTax,
      tax_amount: totalTax,
      discount_type: discountType,
      discount_amount: discount,
      final_total: finalTotal,
      additional_notes: additionalNotes,
      created_by: userId,
    })
    .select()
    .single();

  if (transactionError) {
    throw new Error(`Failed to create transaction: ${transactionError.message}`);
  }

  // Create transaction sell lines
  const sellLines = processedItems.map((item) => ({
    transaction_id: transaction.id,
    ...item,
  }));

  const { data: createdLines, error: linesError } = await supabase
    .from('transaction_sell_lines')
    .insert(sellLines)
    .select();

  if (linesError) {
    // Rollback transaction if lines fail
    await supabase.from('transactions').delete().eq('id', transaction.id);
    throw new Error(`Failed to create sell lines: ${linesError.message}`);
  }

  // [NEW] Create production order if needed (after transaction and lines, before stock deduction)
  // Only for final sales with products that require production
  let productionOrder = null;
  if (status === 'final') {
    try {
      productionOrder = await createProductionOrderFromSale(
        transaction,
        createdLines,
        businessId,
        locationId,
        userId
      );
      
      if (productionOrder) {
        console.log(`Production order created: ${productionOrder.order_no} (ID: ${productionOrder.id}) for sale ${transaction.invoice_no}`);
      }
    } catch (productionError) {
      // Log error but don't fail sale (graceful failure)
      // Production order is secondary - sale should succeed even if production order creation fails
      console.error('Failed to create production order:', productionError);
      console.error('Sale will continue without production order. Error:', productionError.message);
      // Sale continues successfully - production order can be created manually if needed
    }
  }

  // If status is 'final', deduct stock
  let stockUpdates = [];
  if (status === 'final') {
    try {
      const stockItems = items.map((item) => {
        const unit = units.find((u) => u.id === item.unitId);
        return {
          variationId: item.variationId,
          locationId,
          quantity: item.quantity,
          unit,
          baseUnit,
        };
      });

      stockUpdates = await deductStockForSale(stockItems);
    } catch (stockError) {
      // Rollback transaction if stock update fails
      await supabase.from('transactions').delete().eq('id', transaction.id);
      await supabase.from('transaction_sell_lines').delete().eq('transaction_id', transaction.id);
      throw new Error(`Failed to update stock: ${stockError.message}`);
    }
  }

  // Trigger automation notifications (async, don't block)
  if (status === 'final') {
    // Import and trigger notifications (fire and forget)
    import('./automationService.js').then(({ triggerSaleNotifications }) => {
      triggerSaleNotifications(businessId, transaction).catch((err) => {
        console.error('Error triggering sale notifications:', err);
      });
    });
  }

  // PHASE D: Emit sale.created event for social media integration
  if (status === 'final') {
    import('./eventService.js').then(({ emitSystemEvent, EVENT_NAMES }) => {
      emitSystemEvent(EVENT_NAMES.SALE_CREATED, {
        sale: transaction,
        businessId,
        locationId,
      }).catch((err) => {
        console.error('Error emitting sale.created event:', err);
      });
    });
  }

  return {
    transaction,
    items: createdLines,
    stockUpdates: status === 'final' ? stockUpdates : [],
  };
}

/**
 * Get sales transactions
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Transactions list
 */
export async function getSales(businessId, options = {}) {
  const {
    page = 1,
    perPage = 20,
    locationId = null,
    status = null,
    dateFrom = null,
    dateTo = null,
  } = options;

  let query = supabase
    .from('transactions')
    .select(`
      *,
      contact:contacts(id, name, customer_type),
      location:business_locations(id, name)
    `)
    .eq('business_id', businessId)
    .eq('type', 'sell')
    .order('created_at', { ascending: false });

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (dateFrom) {
    query = query.gte('transaction_date', dateFrom);
  }

  if (dateTo) {
    query = query.lte('transaction_date', dateTo);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch sales: ${error.message}`);
  }

  // Get total count
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('type', 'sell');

  return {
    data: data || [],
    meta: {
      page,
      perPage,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / perPage),
    },
  };
}

/**
 * Get single sale transaction by ID
 * @param {number} transactionId - Transaction ID
 * @param {number} businessId - Business ID
 * @returns {Promise<object>} Transaction with line items
 */
export async function getSaleById(transactionId, businessId) {
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select(`
      *,
      contact:contacts(id, name, customer_type),
      location:business_locations(id, name)
    `)
    .eq('id', transactionId)
    .eq('business_id', businessId)
    .eq('type', 'sell')
    .single();

  if (transactionError) {
    if (transactionError.code === 'PGRST116') {
      throw new Error('Transaction not found');
    }
    throw new Error(`Failed to fetch transaction: ${transactionError.message}`);
  }

  // Get sell lines
  const { data: sellLines, error: linesError } = await supabase
    .from('transaction_sell_lines')
    .select(`
      *,
      variation:variations(id, name, sub_sku, retail_price, wholesale_price),
      product:products(id, name, sku),
      unit:units(id, actual_name, short_name)
    `)
    .eq('transaction_id', transactionId);

  if (linesError) {
    throw new Error(`Failed to fetch sell lines: ${linesError.message}`);
  }

  return {
    ...transaction,
    items: sellLines || [],
  };
}

/**
 * Complete a draft transaction (change status to 'final' and deduct stock)
 * @param {number} transactionId - Transaction ID
 * @param {number} businessId - Business ID
 * @returns {Promise<object>} Updated transaction
 */
export async function completeSale(transactionId, businessId) {
  // Get transaction
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('business_id', businessId)
    .eq('type', 'sell')
    .single();

  if (transactionError || !transaction) {
    throw new Error('Transaction not found');
  }

  if (transaction.status === 'final') {
    throw new Error('Transaction is already finalized');
  }

  // Get sell lines
  const { data: sellLines, error: linesError } = await supabase
    .from('transaction_sell_lines')
    .select('variation_id, quantity, unit_id')
    .eq('transaction_id', transactionId);

  if (linesError) {
    throw new Error(`Failed to fetch sell lines: ${linesError.message}`);
  }

  // Get units and base unit
  const unitIds = [...new Set(sellLines.map((line) => line.unit_id))];
  const { data: units } = await supabase
    .from('units')
    .select('id, actual_name, short_name, base_unit_id, base_unit_multiplier')
    .in('id', unitIds);

  const { data: baseUnit } = await supabase
    .from('units')
    .select('id, actual_name, short_name')
    .eq('business_id', businessId)
    .is('base_unit_id', null)
    .limit(1)
    .single();

  // Validate stock and deduct
  const stockItems = sellLines.map((line) => {
    const unit = units.find((u) => u.id === line.unit_id);
    return {
      variationId: line.variation_id,
      locationId: transaction.location_id,
      quantity: line.quantity,
      unit,
      baseUnit,
    };
  });

  await deductStockForSale(stockItems);

  // Update transaction status
  const { data: updatedTransaction, error: updateError } = await supabase
    .from('transactions')
    .update({
      status: 'final',
      payment_status: 'paid',
    })
    .eq('id', transactionId)
    .eq('business_id', businessId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to complete transaction: ${updateError.message}`);
  }

  // [NEW] Create production order if needed (when draft is finalized)
  // Get sell lines for production order creation
  const { data: sellLinesForProduction } = await supabase
    .from('transaction_sell_lines')
    .select('*')
    .eq('transaction_id', transactionId);

  if (sellLinesForProduction && sellLinesForProduction.length > 0) {
    try {
      const productionOrder = await createProductionOrderFromSale(
        updatedTransaction,
        sellLinesForProduction,
        businessId,
        transaction.location_id,
        transaction.created_by // Use transaction creator as userId
      );
      
      if (productionOrder) {
        console.log(`Production order created: ${productionOrder.order_no} (ID: ${productionOrder.id}) for finalized sale ${updatedTransaction.invoice_no}`);
      }
    } catch (productionError) {
      // Log error but don't fail sale completion (graceful failure)
      console.error('Failed to create production order for finalized sale:', productionError);
      console.error('Sale completion will continue. Error:', productionError.message);
    }
  }

  return updatedTransaction;
}

/**
 * Generate invoice number
 * Simple implementation - can be enhanced
 */
async function generateInvoiceNumber(businessId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Get count of transactions this month
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('type', 'sell')
    .gte('transaction_date', `${year}-${month}-01`)
    .lt('transaction_date', `${year}-${month + 1}-01`);

  const sequence = String((count || 0) + 1).padStart(4, '0');
  return `INV-${year}${month}-${sequence}`;
}

