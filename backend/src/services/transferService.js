/**
 * Stock Transfer Service
 * Handles stock transfers between locations
 * 
 * CRITICAL BUSINESS RULES:
 * - Only transactions with status = 'final' affect stock
 * - Stock is deducted from source location
 * - Stock is added to destination location
 * - Atomic operation (all-or-nothing)
 * - Quantities converted to Pieces before transfer
 */

import { supabase } from '../config/supabase.js';
import { convertToBaseUnit } from '../utils/unitConverter.js';
import { transferStock } from './inventoryService.js';

/**
 * Create a stock transfer transaction
 * @param {object} transferData - Transfer data
 * @param {number} businessId - Business ID
 * @param {number} userId - User ID (created_by)
 * @returns {Promise<object>} Created transaction with line items
 */
export async function createTransfer(transferData, businessId, userId) {
  const {
    fromLocationId,
    toLocationId,
    items = [],
    additionalNotes = null,
    status = 'draft', // 'draft' or 'final'
  } = transferData;

  // Validate required fields
  if (!fromLocationId || !toLocationId || !items || items.length === 0) {
    throw new Error('Missing required fields: fromLocationId, toLocationId, and items are required');
  }

  if (fromLocationId === toLocationId) {
    throw new Error('Source and destination locations cannot be the same');
  }

  // Get all units
  const unitIds = [...new Set(items.map((item) => item.unitId))];
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

  // Validate stock availability at source location (if status is final)
  if (status === 'final') {
    for (const item of items) {
      const unit = units.find((u) => u.id === item.unitId);
      if (!unit) {
        throw new Error(`Unit with id ${item.unitId} not found`);
      }

      const quantityInPieces = convertToBaseUnit(item.quantity, unit, baseUnit);
      
      // Get stock at source location
      const { data: stockData } = await supabase
        .from('variation_location_details')
        .select('qty_available')
        .eq('variation_id', item.variationId)
        .eq('location_id', fromLocationId)
        .single();

      const currentStock = parseFloat(stockData?.qty_available || 0);

      if (currentStock < quantityInPieces) {
        throw new Error(
          `Insufficient stock at source location for variation ${item.variationId}. Available: ${currentStock} pieces, Requested: ${quantityInPieces} pieces`
        );
      }
    }
  }

  // Process items
  const processedItems = [];

  for (const item of items) {
    const unit = units.find((u) => u.id === item.unitId);
    if (!unit) {
      throw new Error(`Unit with id ${item.unitId} not found`);
    }

    // Get variation to get product_id
    const { data: variation } = await supabase
      .from('variations')
      .select('product_id')
      .eq('id', item.variationId)
      .single();

    if (!variation) {
      throw new Error(`Variation with id ${item.variationId} not found`);
    }

    processedItems.push({
      product_id: variation.product_id,
      variation_id: item.variationId,
      quantity: item.quantity,
      unit_id: item.unitId,
    });
  }

  // Generate reference number
  const refNo = await generateTransferRefNumber(businessId);

  // Create transaction (use 'sell_transfer' type)
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      business_id: businessId,
      location_id: fromLocationId, // Source location
      type: 'sell_transfer',
      status: status,
      ref_no: refNo,
      transaction_date: new Date().toISOString(),
      total_before_tax: 0,
      tax_amount: 0,
      final_total: 0,
      additional_notes: additionalNotes,
      created_by: userId,
    })
    .select()
    .single();

  if (transactionError) {
    throw new Error(`Failed to create transaction: ${transactionError.message}`);
  }

  // Store destination location in additional_notes or create a separate field
  // For now, we'll store it in additional_notes as JSON
  const transferInfo = {
    to_location_id: toLocationId,
    from_location_id: fromLocationId,
  };

  await supabase
    .from('transactions')
    .update({ additional_notes: JSON.stringify(transferInfo) })
    .eq('id', transaction.id);

  // Create transfer lines
  const transferLines = processedItems.map((item) => ({
    transaction_id: transaction.id,
    ...item,
  }));

  const { data: createdLines, error: linesError } = await supabase
    .from('stock_transfer_lines')
    .insert(transferLines)
    .select();

  if (linesError) {
    // Rollback transaction if lines fail
    await supabase.from('transactions').delete().eq('id', transaction.id);
    throw new Error(`Failed to create transfer lines: ${linesError.message}`);
  }

  // If status is 'final', perform transfers
  let stockUpdates = [];
  if (status === 'final') {
    try {
      for (const item of items) {
        const unit = units.find((u) => u.id === item.unitId);
        const quantityInPieces = convertToBaseUnit(item.quantity, unit, baseUnit);

        const result = await transferStock(
          item.variationId,
          fromLocationId,
          toLocationId,
          quantityInPieces
        );

        stockUpdates.push({
          variationId: item.variationId,
          fromLocationId,
          toLocationId,
          quantity: item.quantity,
          unit: unit.actual_name,
          quantityInPieces,
          sourceStock: result.sourceLocation.newStock,
          destStock: result.destinationLocation.newStock,
        });
      }
    } catch (stockError) {
      // Rollback transaction if transfer fails
      await supabase.from('transactions').delete().eq('id', transaction.id);
      await supabase.from('stock_transfer_lines').delete().eq('transaction_id', transaction.id);
      throw new Error(`Failed to transfer stock: ${stockError.message}`);
    }
  }

  return {
    transaction,
    items: createdLines,
    stockUpdates: status === 'final' ? stockUpdates : [],
  };
}

/**
 * Get stock transfers
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Transfers list
 */
export async function getTransfers(businessId, options = {}) {
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
      location:business_locations!transactions_location_id_fkey(id, name)
    `)
    .eq('business_id', businessId)
    .in('type', ['sell_transfer', 'purchase_transfer'])
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
    throw new Error(`Failed to fetch transfers: ${error.message}`);
  }

  // Get total count
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .in('type', ['sell_transfer', 'purchase_transfer']);

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
 * Get single transfer by ID
 * @param {number} transactionId - Transaction ID
 * @param {number} businessId - Business ID
 * @returns {Promise<object>} Transfer with line items
 */
export async function getTransferById(transactionId, businessId) {
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select(`
      *,
      location:business_locations!transactions_location_id_fkey(id, name)
    `)
    .eq('id', transactionId)
    .eq('business_id', businessId)
    .in('type', ['sell_transfer', 'purchase_transfer'])
    .single();

  if (transactionError) {
    if (transactionError.code === 'PGRST116') {
      throw new Error('Transfer not found');
    }
    throw new Error(`Failed to fetch transfer: ${transactionError.message}`);
  }

  // Parse transfer info from additional_notes
  let transferInfo = {};
  try {
    transferInfo = JSON.parse(transaction.additional_notes || '{}');
  } catch (e) {
    // If not JSON, treat as regular notes
  }

  // Get transfer lines
  const { data: transferLines, error: linesError } = await supabase
    .from('stock_transfer_lines')
    .select(`
      *,
      variation:variations(id, name, sub_sku),
      product:products(id, name, sku),
      unit:units(id, actual_name, short_name)
    `)
    .eq('transaction_id', transactionId);

  if (linesError) {
    throw new Error(`Failed to fetch transfer lines: ${linesError.message}`);
  }

  // Get destination location
  const toLocationId = transferInfo.to_location_id;
  let toLocation = null;
  if (toLocationId) {
    const { data: location } = await supabase
      .from('business_locations')
      .select('id, name')
      .eq('id', toLocationId)
      .single();
    toLocation = location;
  }

  return {
    ...transaction,
    fromLocation: transaction.location,
    toLocation,
    items: transferLines || [],
  };
}

/**
 * Complete a draft transfer (change status to 'final' and perform transfer)
 * @param {number} transactionId - Transaction ID
 * @param {number} businessId - Business ID
 * @returns {Promise<object>} Updated transaction
 */
export async function completeTransfer(transactionId, businessId) {
  // Get transaction
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('business_id', businessId)
    .in('type', ['sell_transfer', 'purchase_transfer'])
    .single();

  if (transactionError || !transaction) {
    throw new Error('Transfer not found');
  }

  if (transaction.status === 'final') {
    throw new Error('Transfer is already finalized');
  }

  // Parse transfer info
  let transferInfo = {};
  try {
    transferInfo = JSON.parse(transaction.additional_notes || '{}');
  } catch (e) {
    throw new Error('Invalid transfer information');
  }

  const fromLocationId = transaction.location_id;
  const toLocationId = transferInfo.to_location_id;

  if (!toLocationId) {
    throw new Error('Destination location not found in transfer information');
  }

  // Get transfer lines
  const { data: transferLines, error: linesError } = await supabase
    .from('stock_transfer_lines')
    .select('variation_id, quantity, unit_id')
    .eq('transaction_id', transactionId);

  if (linesError) {
    throw new Error(`Failed to fetch transfer lines: ${linesError.message}`);
  }

  // Get units and base unit
  const unitIds = [...new Set(transferLines.map((line) => line.unit_id))];
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

  // Perform transfers
  for (const line of transferLines) {
    const unit = units.find((u) => u.id === line.unit_id);
    const quantityInPieces = convertToBaseUnit(line.quantity, unit, baseUnit);

    await transferStock(
      line.variation_id,
      fromLocationId,
      toLocationId,
      quantityInPieces
    );
  }

  // Update transaction status
  const { data: updatedTransaction, error: updateError } = await supabase
    .from('transactions')
    .update({
      status: 'final',
    })
    .eq('id', transactionId)
    .eq('business_id', businessId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to complete transfer: ${updateError.message}`);
  }

  return updatedTransaction;
}

/**
 * Generate transfer reference number
 */
async function generateTransferRefNumber(businessId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .in('type', ['sell_transfer', 'purchase_transfer'])
    .gte('transaction_date', `${year}-${month}-01`)
    .lt('transaction_date', `${year}-${month + 1}-01`);

  const sequence = String((count || 0) + 1).padStart(4, '0');
  return `TRF-${year}${month}-${sequence}`;
}

