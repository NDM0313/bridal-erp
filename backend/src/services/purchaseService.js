/**
 * Purchase Service
 * Handles purchase transactions and inventory updates
 * 
 * CRITICAL BUSINESS RULES:
 * - Only transactions with status = 'final' affect stock
 * - Stock is INCREASED in BASE UNIT (Pieces)
 * - Purchases can be in Box or Pieces
 * - Unit conversion handled automatically
 */

import { supabase } from '../config/supabase.js';
import { convertToBaseUnit } from '../utils/unitConverter.js';
import { increaseStockForPurchase } from './inventoryService.js';

/**
 * Create a purchase transaction
 * @param {object} purchaseData - Purchase data
 * @param {number} businessId - Business ID
 * @param {number} userId - User ID (created_by)
 * @returns {Promise<object>} Created transaction with line items
 */
export async function createPurchase(purchaseData, businessId, userId) {
  const {
    locationId,
    contactId = null, // Supplier contact ID
    items = [],
    paymentMethod = 'cash',
    discountType = null,
    discountAmount = 0,
    additionalNotes = null,
    status = 'draft', // 'draft' or 'final'
  } = purchaseData;

  // Validate required fields
  if (!locationId || !items || items.length === 0) {
    throw new Error('Missing required fields: locationId and items are required');
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
    .select('id, product_id, default_purchase_price')
    .in('id', variationIds);

  const { data: units } = await supabase
    .from('units')
    .select('id, actual_name, short_name, base_unit_id, base_unit_multiplier')
    .in('id', unitIds);

  // Get base unit (Pieces)
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

  // Process each item
  for (const item of items) {
    const unit = units.find((u) => u.id === item.unitId);
    const variation = variations.find((v) => v.id === item.variationId);

    if (!unit || !variation) {
      throw new Error(`Unit or variation not found for item`);
    }

    // Get purchase price (from item or variation default)
    const purchasePrice = item.purchasePrice || variation.default_purchase_price || 0;

    // Calculate line total
    const lineTotal = item.quantity * purchasePrice;
    totalBeforeTax += lineTotal;

    processedItems.push({
      product_id: variation.product_id,
      variation_id: item.variationId,
      quantity: item.quantity,
      unit_id: item.unitId,
      purchase_price: purchasePrice,
      purchase_price_inc_tax: purchasePrice, // Assuming tax is included for now
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

  // Generate reference number (simple implementation)
  const refNo = await generatePurchaseRefNumber(businessId);

  // Create transaction
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      business_id: businessId,
      location_id: locationId,
      type: 'purchase',
      status: status,
      payment_status: status === 'final' ? 'paid' : 'due',
      contact_id: contactId, // Supplier
      ref_no: refNo,
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

  // Create purchase lines
  const purchaseLines = processedItems.map((item) => ({
    transaction_id: transaction.id,
    ...item,
  }));

  const { data: createdLines, error: linesError } = await supabase
    .from('purchase_lines')
    .insert(purchaseLines)
    .select();

  if (linesError) {
    // Rollback transaction if lines fail
    await supabase.from('transactions').delete().eq('id', transaction.id);
    throw new Error(`Failed to create purchase lines: ${linesError.message}`);
  }

  // If status is 'final', increase stock
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

      stockUpdates = await increaseStockForPurchase(stockItems);
    } catch (stockError) {
      // Rollback transaction if stock update fails
      await supabase.from('transactions').delete().eq('id', transaction.id);
      await supabase.from('purchase_lines').delete().eq('transaction_id', transaction.id);
      throw new Error(`Failed to update stock: ${stockError.message}`);
    }
  }

  // Trigger automation notifications (async, don't block)
  if (status === 'final') {
    // Import and trigger notifications (fire and forget)
    import('./automationService.js').then(({ triggerPurchaseNotifications }) => {
      triggerPurchaseNotifications(businessId, transaction).catch((err) => {
        console.error('Error triggering purchase notifications:', err);
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
 * Get purchase transactions
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Transactions list
 */
export async function getPurchases(businessId, options = {}) {
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
      contact:contacts(id, name, supplier_business_name),
      location:business_locations(id, name)
    `)
    .eq('business_id', businessId)
    .eq('type', 'purchase')
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
    throw new Error(`Failed to fetch purchases: ${error.message}`);
  }

  // Get total count
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('type', 'purchase');

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
 * Get single purchase transaction by ID
 * @param {number} transactionId - Transaction ID
 * @param {number} businessId - Business ID
 * @returns {Promise<object>} Transaction with line items
 */
export async function getPurchaseById(transactionId, businessId) {
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select(`
      *,
      contact:contacts(id, name, supplier_business_name),
      location:business_locations(id, name)
    `)
    .eq('id', transactionId)
    .eq('business_id', businessId)
    .eq('type', 'purchase')
    .single();

  if (transactionError) {
    if (transactionError.code === 'PGRST116') {
      throw new Error('Transaction not found');
    }
    throw new Error(`Failed to fetch transaction: ${transactionError.message}`);
  }

  // Get purchase lines
  const { data: purchaseLines, error: linesError } = await supabase
    .from('purchase_lines')
    .select(`
      *,
      variation:variations(id, name, sub_sku, default_purchase_price),
      product:products(id, name, sku),
      unit:units(id, actual_name, short_name)
    `)
    .eq('transaction_id', transactionId);

  if (linesError) {
    throw new Error(`Failed to fetch purchase lines: ${linesError.message}`);
  }

  return {
    ...transaction,
    items: purchaseLines || [],
  };
}

/**
 * Complete a draft purchase (change status to 'final' and increase stock)
 * @param {number} transactionId - Transaction ID
 * @param {number} businessId - Business ID
 * @returns {Promise<object>} Updated transaction
 */
export async function completePurchase(transactionId, businessId) {
  // Get transaction
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('business_id', businessId)
    .eq('type', 'purchase')
    .single();

  if (transactionError || !transaction) {
    throw new Error('Transaction not found');
  }

  if (transaction.status === 'final') {
    throw new Error('Transaction is already finalized');
  }

  // Get purchase lines
  const { data: purchaseLines, error: linesError } = await supabase
    .from('purchase_lines')
    .select('variation_id, quantity, unit_id')
    .eq('transaction_id', transactionId);

  if (linesError) {
    throw new Error(`Failed to fetch purchase lines: ${linesError.message}`);
  }

  // Get units and base unit
  const unitIds = [...new Set(purchaseLines.map((line) => line.unit_id))];
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

  // Increase stock
  const stockItems = purchaseLines.map((line) => {
    const unit = units.find((u) => u.id === line.unit_id);
    return {
      variationId: line.variation_id,
      locationId: transaction.location_id,
      quantity: line.quantity,
      unit,
      baseUnit,
    };
  });

  await increaseStockForPurchase(stockItems);

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

  return updatedTransaction;
}

/**
 * Generate purchase reference number
 * Simple implementation - can be enhanced
 */
async function generatePurchaseRefNumber(businessId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Get count of purchase transactions this month
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('type', 'purchase')
    .gte('transaction_date', `${year}-${month}-01`)
    .lt('transaction_date', `${year}-${month + 1}-01`);

  const sequence = String((count || 0) + 1).padStart(4, '0');
  return `PUR-${year}${month}-${sequence}`;
}

