/**
 * Stock Adjustment Service
 * Handles stock adjustments (manual increase/decrease)
 * 
 * CRITICAL BUSINESS RULES:
 * - Only transactions with status = 'final' affect stock
 * - Stock adjustments can increase or decrease stock
 * - Quantities converted to Pieces before adjustment
 * - Prevents negative stock
 */

import { supabase } from '../config/supabase.js';
import { convertToBaseUnit } from '../utils/unitConverter.js';
import { adjustStock } from './inventoryService.js';

/**
 * Create a stock adjustment transaction
 * @param {object} adjustmentData - Adjustment data
 * @param {number} businessId - Business ID
 * @param {number} userId - User ID (created_by)
 * @returns {Promise<object>} Created transaction with line items
 */
export async function createAdjustment(adjustmentData, businessId, userId) {
  const {
    locationId,
    items = [],
    additionalNotes = null,
    status = 'draft', // 'draft' or 'final'
  } = adjustmentData;

  // Validate required fields
  if (!locationId || !items || items.length === 0) {
    throw new Error('Missing required fields: locationId and items are required');
  }

  // Validate items
  for (const item of items) {
    if (!item.variationId || !item.quantity || !item.unitId || !item.adjustmentType) {
      throw new Error('Each item must have variationId, quantity, unitId, and adjustmentType');
    }
    if (!['increase', 'decrease'].includes(item.adjustmentType)) {
      throw new Error("adjustmentType must be 'increase' or 'decrease'");
    }
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

  // Validate stock availability for decreases (if status is final)
  if (status === 'final') {
    for (const item of items) {
      if (item.adjustmentType === 'decrease') {
        const unit = units.find((u) => u.id === item.unitId);
        if (!unit) {
          throw new Error(`Unit with id ${item.unitId} not found`);
        }

        const quantityInPieces = convertToBaseUnit(item.quantity, unit, baseUnit);
        const currentStock = await getStock(item.variationId, locationId);

        if (currentStock < quantityInPieces) {
          throw new Error(
            `Insufficient stock for adjustment. Available: ${currentStock} pieces, Requested: ${quantityInPieces} pieces`
          );
        }
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
      adjustment_type: item.adjustmentType,
      reason: item.reason || null,
    });
  }

  // Generate reference number
  const refNo = await generateAdjustmentRefNumber(businessId);

  // Create transaction
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      business_id: businessId,
      location_id: locationId,
      type: 'stock_adjustment',
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

  // Create adjustment lines
  const adjustmentLines = processedItems.map((item) => ({
    transaction_id: transaction.id,
    ...item,
  }));

  const { data: createdLines, error: linesError } = await supabase
    .from('stock_adjustment_lines')
    .insert(adjustmentLines)
    .select();

  if (linesError) {
    // Rollback transaction if lines fail
    await supabase.from('transactions').delete().eq('id', transaction.id);
    throw new Error(`Failed to create adjustment lines: ${linesError.message}`);
  }

  // If status is 'final', apply adjustments
  let stockUpdates = [];
  if (status === 'final') {
    try {
      for (const item of items) {
        const unit = units.find((u) => u.id === item.unitId);
        const quantityInPieces = convertToBaseUnit(item.quantity, unit, baseUnit);

        // Adjust stock (positive for increase, negative for decrease)
        const adjustmentQuantity = item.adjustmentType === 'increase' 
          ? quantityInPieces 
          : -quantityInPieces;

        const result = await adjustStock(
          item.variationId,
          locationId,
          adjustmentQuantity,
          item.reason || null
        );

        stockUpdates.push({
          variationId: item.variationId,
          locationId,
          adjustmentType: item.adjustmentType,
          quantity: item.quantity,
          unit: unit.actual_name,
          quantityInPieces: Math.abs(quantityInPieces),
          newStock: result.qty_available,
        });
      }
    } catch (stockError) {
      // Rollback transaction if stock update fails
      await supabase.from('transactions').delete().eq('id', transaction.id);
      await supabase.from('stock_adjustment_lines').delete().eq('transaction_id', transaction.id);
      throw new Error(`Failed to adjust stock: ${stockError.message}`);
    }
  }

  return {
    transaction,
    items: createdLines,
    stockUpdates: status === 'final' ? stockUpdates : [],
  };
}

/**
 * Get stock adjustments
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Adjustments list
 */
export async function getAdjustments(businessId, options = {}) {
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
      location:business_locations(id, name)
    `)
    .eq('business_id', businessId)
    .eq('type', 'stock_adjustment')
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
    throw new Error(`Failed to fetch adjustments: ${error.message}`);
  }

  // Get total count
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('type', 'stock_adjustment');

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
 * Get single adjustment by ID
 * @param {number} transactionId - Transaction ID
 * @param {number} businessId - Business ID
 * @returns {Promise<object>} Adjustment with line items
 */
export async function getAdjustmentById(transactionId, businessId) {
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select(`
      *,
      location:business_locations(id, name)
    `)
    .eq('id', transactionId)
    .eq('business_id', businessId)
    .eq('type', 'stock_adjustment')
    .single();

  if (transactionError) {
    if (transactionError.code === 'PGRST116') {
      throw new Error('Adjustment not found');
    }
    throw new Error(`Failed to fetch adjustment: ${transactionError.message}`);
  }

  // Get adjustment lines
  const { data: adjustmentLines, error: linesError } = await supabase
    .from('stock_adjustment_lines')
    .select(`
      *,
      variation:variations(id, name, sub_sku),
      product:products(id, name, sku),
      unit:units(id, actual_name, short_name)
    `)
    .eq('transaction_id', transactionId);

  if (linesError) {
    throw new Error(`Failed to fetch adjustment lines: ${linesError.message}`);
  }

  return {
    ...transaction,
    items: adjustmentLines || [],
  };
}

/**
 * Complete a draft adjustment (change status to 'final' and apply adjustments)
 * @param {number} transactionId - Transaction ID
 * @param {number} businessId - Business ID
 * @returns {Promise<object>} Updated transaction
 */
export async function completeAdjustment(transactionId, businessId) {
  // Get transaction
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('business_id', businessId)
    .eq('type', 'stock_adjustment')
    .single();

  if (transactionError || !transaction) {
    throw new Error('Adjustment not found');
  }

  if (transaction.status === 'final') {
    throw new Error('Adjustment is already finalized');
  }

  // Get adjustment lines
  const { data: adjustmentLines, error: linesError } = await supabase
    .from('stock_adjustment_lines')
    .select('variation_id, quantity, unit_id, adjustment_type, reason')
    .eq('transaction_id', transactionId);

  if (linesError) {
    throw new Error(`Failed to fetch adjustment lines: ${linesError.message}`);
  }

  // Get units and base unit
  const unitIds = [...new Set(adjustmentLines.map((line) => line.unit_id))];
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

  // Apply adjustments
  for (const line of adjustmentLines) {
    const unit = units.find((u) => u.id === line.unit_id);
    const quantityInPieces = convertToBaseUnit(line.quantity, unit, baseUnit);

    const adjustmentQuantity = line.adjustment_type === 'increase' 
      ? quantityInPieces 
      : -quantityInPieces;

    await adjustStock(
      line.variation_id,
      transaction.location_id,
      adjustmentQuantity,
      line.reason || null
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
    throw new Error(`Failed to complete adjustment: ${updateError.message}`);
  }

  return updatedTransaction;
}

/**
 * Generate adjustment reference number
 */
async function generateAdjustmentRefNumber(businessId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('type', 'stock_adjustment')
    .gte('transaction_date', `${year}-${month}-01`)
    .lt('transaction_date', `${year}-${month + 1}-01`);

  const sequence = String((count || 0) + 1).padStart(4, '0');
  return `ADJ-${year}${month}-${sequence}`;
}

// Helper function to get stock (imported from inventoryService)
async function getStock(variationId, locationId) {
  const { data, error } = await supabase
    .from('variation_location_details')
    .select('qty_available')
    .eq('variation_id', variationId)
    .eq('location_id', locationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return 0;
    }
    throw new Error(`Failed to get stock: ${error.message}`);
  }

  return parseFloat(data.qty_available) || 0;
}

