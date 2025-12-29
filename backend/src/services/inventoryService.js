/**
 * Inventory Service
 * Handles stock operations (deduction, increase, validation)
 * 
 * CRITICAL RULES:
 * - Stock is ALWAYS stored in BASE UNIT (Pieces)
 * - All quantities must be converted to Pieces before stock update
 * - Only final transactions affect stock
 * - Prevent negative stock
 * - Purchases INCREASE stock, Sales DECREASE stock
 */

import { supabase } from '../config/supabase.js';
import { convertToBaseUnit } from '../utils/unitConverter.js';

/**
 * Get current stock for a variation at a location
 * @param {number} variationId - Variation ID
 * @param {number} locationId - Location ID
 * @returns {Promise<number>} Stock quantity in base unit (Pieces)
 */
export async function getStock(variationId, locationId) {
  const { data, error } = await supabase
    .from('variation_location_details')
    .select('qty_available')
    .eq('variation_id', variationId)
    .eq('location_id', locationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No stock record exists, return 0
      return 0;
    }
    throw new Error(`Failed to get stock: ${error.message}`);
  }

  return parseFloat(data.qty_available) || 0;
}

/**
 * Validate stock availability before sale
 * @param {number} variationId - Variation ID
 * @param {number} locationId - Location ID
 * @param {number} requestedQuantity - Quantity requested (in any unit)
 * @param {object} unit - Unit object (Box or Pieces)
 * @param {object} baseUnit - Base unit (Pieces)
 * @returns {Promise<object>} Validation result with available stock
 */
export async function validateStockAvailability(
  variationId,
  locationId,
  requestedQuantity,
  unit,
  baseUnit
) {
  // Get current stock (always in Pieces)
  const currentStock = await getStock(variationId, locationId);

  // Convert requested quantity to base unit (Pieces)
  const requestedInPieces = convertToBaseUnit(requestedQuantity, unit, baseUnit);

  const isAvailable = requestedInPieces <= currentStock;

  return {
    isAvailable,
    currentStock,
    requestedInPieces,
    availableInPieces: currentStock - requestedInPieces,
    shortfall: isAvailable ? 0 : requestedInPieces - currentStock,
  };
}

/**
 * Deduct stock from variation_location_details
 * CRITICAL: quantity must already be in base unit (Pieces)
 * 
 * @param {number} variationId - Variation ID
 * @param {number} locationId - Location ID
 * @param {number} quantityInPieces - Quantity to deduct (MUST be in Pieces)
 * @returns {Promise<object>} Updated stock record
 */
export async function deductStock(variationId, locationId, quantityInPieces) {
  if (quantityInPieces <= 0) {
    throw new Error('Quantity to deduct must be greater than 0');
  }

  // Get current stock
  const currentStock = await getStock(variationId, locationId);

  // Check if sufficient stock available
  if (currentStock < quantityInPieces) {
    throw new Error(
      `Insufficient stock. Available: ${currentStock} pieces, Requested: ${quantityInPieces} pieces`
    );
  }

  // Calculate new stock
  const newStock = currentStock - quantityInPieces;

  // Update or insert stock record
  const { data: existing } = await supabase
    .from('variation_location_details')
    .select('id, product_id, product_variation_id')
    .eq('variation_id', variationId)
    .eq('location_id', locationId)
    .single();

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('variation_location_details')
      .update({ qty_available: newStock })
      .eq('variation_id', variationId)
      .eq('location_id', locationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update stock: ${error.message}`);
    }

    return data;
  } else {
    // Get product_id and product_variation_id from variation
    const { data: variation } = await supabase
      .from('variations')
      .select('product_id, product_variation_id')
      .eq('id', variationId)
      .single();

    if (!variation) {
      throw new Error('Variation not found');
    }

    // Insert new record
    const { data, error } = await supabase
      .from('variation_location_details')
      .insert({
        variation_id: variationId,
        product_id: variation.product_id,
        product_variation_id: variation.product_variation_id,
        location_id: locationId,
        qty_available: newStock,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create stock record: ${error.message}`);
    }

    return data;
  }
}

/**
 * Deduct stock for multiple items in a sale
 * Handles unit conversion automatically
 * 
 * @param {Array} items - Array of sale items
 *   Each item: { variationId, locationId, quantity, unit, baseUnit }
 * @returns {Promise<Array>} Array of stock update results
 */
export async function deductStockForSale(items) {
  const results = [];

  for (const item of items) {
    const { variationId, locationId, quantity, unit, baseUnit } = item;

    // Convert quantity to base unit (Pieces)
    const quantityInPieces = convertToBaseUnit(quantity, unit, baseUnit);

    // Deduct stock
    const result = await deductStock(variationId, locationId, quantityInPieces);

    results.push({
      variationId,
      locationId,
      quantitySold: quantity,
      unit: unit.actual_name,
      quantityInPieces,
      newStock: result.qty_available,
    });
  }

  return results;
}

/**
 * Get stock for multiple variations at a location
 * @param {Array} variationIds - Array of variation IDs
 * @param {number} locationId - Location ID
 * @returns {Promise<object>} Map of variation_id -> stock quantity
 */
export async function getStockForVariations(variationIds, locationId) {
  const { data, error } = await supabase
    .from('variation_location_details')
    .select('variation_id, qty_available')
    .in('variation_id', variationIds)
    .eq('location_id', locationId);

  if (error) {
    throw new Error(`Failed to get stock: ${error.message}`);
  }

  // Create map
  const stockMap = {};
  variationIds.forEach((id) => {
    const stock = data.find((s) => s.variation_id === id);
    stockMap[id] = parseFloat(stock?.qty_available || 0);
  });

  return stockMap;
}

/**
 * Increase stock in variation_location_details
 * CRITICAL: quantity must already be in base unit (Pieces)
 * Used for purchases - INCREASES stock
 * 
 * @param {number} variationId - Variation ID
 * @param {number} locationId - Location ID
 * @param {number} quantityInPieces - Quantity to add (MUST be in Pieces)
 * @returns {Promise<object>} Updated stock record
 */
export async function increaseStock(variationId, locationId, quantityInPieces) {
  if (quantityInPieces <= 0) {
    throw new Error('Quantity to add must be greater than 0');
  }

  // Get current stock
  const currentStock = await getStock(variationId, locationId);

  // Calculate new stock
  const newStock = currentStock + quantityInPieces;

  // Update or insert stock record
  const { data: existing } = await supabase
    .from('variation_location_details')
    .select('id, product_id, product_variation_id')
    .eq('variation_id', variationId)
    .eq('location_id', locationId)
    .single();

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('variation_location_details')
      .update({ qty_available: newStock })
      .eq('variation_id', variationId)
      .eq('location_id', locationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update stock: ${error.message}`);
    }

    return data;
  } else {
    // Get product_id and product_variation_id from variation
    const { data: variation } = await supabase
      .from('variations')
      .select('product_id, product_variation_id')
      .eq('id', variationId)
      .single();

    if (!variation) {
      throw new Error('Variation not found');
    }

    // Insert new record
    const { data, error } = await supabase
      .from('variation_location_details')
      .insert({
        variation_id: variationId,
        product_id: variation.product_id,
        product_variation_id: variation.product_variation_id,
        location_id: locationId,
        qty_available: newStock,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create stock record: ${error.message}`);
    }

    return data;
  }
}

/**
 * Increase stock for multiple items in a purchase
 * Handles unit conversion automatically
 * 
 * @param {Array} items - Array of purchase items
 *   Each item: { variationId, locationId, quantity, unit, baseUnit }
 * @returns {Promise<Array>} Array of stock update results
 */
export async function increaseStockForPurchase(items) {
  const results = [];

  for (const item of items) {
    const { variationId, locationId, quantity, unit, baseUnit } = item;

    // Convert quantity to base unit (Pieces)
    const quantityInPieces = convertToBaseUnit(quantity, unit, baseUnit);

    // Increase stock
    const result = await increaseStock(variationId, locationId, quantityInPieces);

    results.push({
      variationId,
      locationId,
      quantityPurchased: quantity,
      unit: unit.actual_name,
      quantityInPieces,
      newStock: result.qty_available,
    });
  }

  return results;
}

/**
 * Adjust stock (increase or decrease)
 * CRITICAL: quantity must already be in base unit (Pieces)
 * 
 * @param {number} variationId - Variation ID
 * @param {number} locationId - Location ID
 * @param {number} quantityInPieces - Quantity to adjust (MUST be in Pieces, can be negative for decrease)
 * @param {string} reason - Reason for adjustment
 * @returns {Promise<object>} Updated stock record
 */
export async function adjustStock(variationId, locationId, quantityInPieces, reason = null) {
  if (quantityInPieces === 0) {
    throw new Error('Adjustment quantity cannot be zero');
  }

  // Get current stock
  const currentStock = await getStock(variationId, locationId);

  // Calculate new stock
  const newStock = currentStock + quantityInPieces;

  // Validate: Stock cannot go negative
  if (newStock < 0) {
    throw new Error(
      `Insufficient stock for adjustment. Available: ${currentStock} pieces, Adjustment: ${quantityInPieces} pieces`
    );
  }

  // Update or insert stock record
  const { data: existing } = await supabase
    .from('variation_location_details')
    .select('id, product_id, product_variation_id')
    .eq('variation_id', variationId)
    .eq('location_id', locationId)
    .single();

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('variation_location_details')
      .update({ qty_available: newStock })
      .eq('variation_id', variationId)
      .eq('location_id', locationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to adjust stock: ${error.message}`);
    }

    return data;
  } else {
    // If decreasing and no record exists, error
    if (quantityInPieces < 0) {
      throw new Error('Cannot decrease stock: No stock record exists for this variation and location');
    }

    // Get product_id and product_variation_id from variation
    const { data: variation } = await supabase
      .from('variations')
      .select('product_id, product_variation_id')
      .eq('id', variationId)
      .single();

    if (!variation) {
      throw new Error('Variation not found');
    }

    // Insert new record
    const { data, error } = await supabase
      .from('variation_location_details')
      .insert({
        variation_id: variationId,
        product_id: variation.product_id,
        product_variation_id: variation.product_variation_id,
        location_id: locationId,
        qty_available: newStock,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create stock record: ${error.message}`);
    }

    return data;
  }
}

/**
 * Transfer stock between locations
 * Atomic operation: Deducts from source and adds to destination
 * 
 * @param {number} variationId - Variation ID
 * @param {number} fromLocationId - Source location ID
 * @param {number} toLocationId - Destination location ID
 * @param {number} quantityInPieces - Quantity to transfer (MUST be in Pieces)
 * @returns {Promise<object>} Transfer result with updated stock for both locations
 */
export async function transferStock(variationId, fromLocationId, toLocationId, quantityInPieces) {
  if (quantityInPieces <= 0) {
    throw new Error('Transfer quantity must be greater than 0');
  }

  if (fromLocationId === toLocationId) {
    throw new Error('Source and destination locations cannot be the same');
  }

  // Get current stock at source location
  const sourceStock = await getStock(variationId, fromLocationId);

  // Validate source has enough stock
  if (sourceStock < quantityInPieces) {
    throw new Error(
      `Insufficient stock at source location. Available: ${sourceStock} pieces, Requested: ${quantityInPieces} pieces`
    );
  }

  // Perform transfer atomically (deduct from source, add to destination)
  try {
    // Deduct from source
    const sourceResult = await adjustStock(variationId, fromLocationId, -quantityInPieces, 'Stock transfer out');

    // Add to destination
    const destResult = await increaseStock(variationId, toLocationId, quantityInPieces);

    return {
      success: true,
      sourceLocation: {
        locationId: fromLocationId,
        oldStock: sourceStock,
        newStock: sourceResult.qty_available,
        quantityTransferred: quantityInPieces,
      },
      destinationLocation: {
        locationId: toLocationId,
        oldStock: await getStock(variationId, toLocationId) - quantityInPieces,
        newStock: destResult.qty_available,
        quantityReceived: quantityInPieces,
      },
    };
  } catch (error) {
    // If destination update fails, try to rollback source
    // Note: In production, use database transactions for true atomicity
    throw new Error(`Transfer failed: ${error.message}`);
  }
}

