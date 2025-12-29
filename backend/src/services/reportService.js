/**
 * Report Service
 * Handles various reports (inventory, sales, purchases)
 * 
 * CRITICAL BUSINESS RULES:
 * - All reports respect business_id and RLS
 * - Stock is always displayed in Pieces (base unit)
 * - Date ranges are inclusive
 */

import { supabase } from '../config/supabase.js';

/**
 * Get inventory report (current stock per product/location)
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Inventory report data
 */
export async function getInventoryReport(businessId, options = {}) {
  const {
    locationId = null,
    productId = null,
    categoryId = null,
    lowStockOnly = false,
  } = options;

  let query = supabase
    .from('variation_location_details')
    .select(`
      variation_id,
      location_id,
      qty_available,
      variation:variations(
        id,
        name,
        sub_sku,
        product_id,
        product:products(
          id,
          name,
          sku,
          alert_quantity,
          unit_id,
          unit:units!products_unit_id_fkey(id, actual_name, short_name),
          secondary_unit:units!products_secondary_unit_id_fkey(id, actual_name, short_name, base_unit_multiplier),
          category:categories(id, name)
        )
      ),
      location:business_locations(id, name)
    `)
    .eq('variation.product.business_id', businessId);

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  if (productId) {
    query = query.eq('variation.product_id', productId);
  }

  if (categoryId) {
    query = query.eq('variation.product.category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch inventory report: ${error.message}`);
  }

  // Process and format data
  const reportData = (data || []).map((item) => {
    const qtyAvailable = parseFloat(item.qty_available) || 0;
    const alertQuantity = parseFloat(item.variation?.product?.alert_quantity || 0);
    const isLowStock = qtyAvailable <= alertQuantity;

    // Calculate quantity in secondary unit if available
    let qtyInSecondaryUnit = null;
    if (item.variation?.product?.secondary_unit?.base_unit_multiplier) {
      const multiplier = item.variation.product.secondary_unit.base_unit_multiplier;
      qtyInSecondaryUnit = qtyAvailable / multiplier;
    }

    return {
      variationId: item.variation_id,
      variationName: item.variation?.name || 'N/A',
      subSku: item.variation?.sub_sku || 'N/A',
      productId: item.variation?.product_id,
      productName: item.variation?.product?.name || 'N/A',
      sku: item.variation?.product?.sku || 'N/A',
      category: item.variation?.product?.category?.name || 'N/A',
      locationId: item.location_id,
      locationName: item.location?.name || 'N/A',
      qtyAvailable: qtyAvailable,
      qtyInPieces: qtyAvailable,
      qtyInSecondaryUnit: qtyInSecondaryUnit,
      secondaryUnit: item.variation?.product?.secondary_unit?.actual_name || null,
      baseUnit: item.variation?.product?.unit?.actual_name || 'Pieces',
      alertQuantity: alertQuantity,
      isLowStock: isLowStock,
    };
  });

  // Filter low stock if requested
  const filteredData = lowStockOnly
    ? reportData.filter((item) => item.isLowStock)
    : reportData;

  // Calculate summary
  const summary = {
    totalVariations: filteredData.length,
    totalLocations: new Set(filteredData.map((item) => item.locationId)).size,
    lowStockItems: filteredData.filter((item) => item.isLowStock).length,
    totalStockValue: 0, // Can be calculated if purchase prices are available
  };

  return {
    data: filteredData,
    summary,
  };
}

/**
 * Get sales summary report
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Sales summary
 */
export async function getSalesSummary(businessId, options = {}) {
  const {
    dateFrom = null,
    dateTo = null,
    locationId = null,
    groupBy = 'day', // 'day', 'week', 'month'
  } = options;

  let query = supabase
    .from('transactions')
    .select('id, transaction_date, final_total, customer_type, location_id')
    .eq('business_id', businessId)
    .eq('type', 'sell')
    .eq('status', 'final');

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  if (dateFrom) {
    query = query.gte('transaction_date', dateFrom);
  }

  if (dateTo) {
    query = query.lte('transaction_date', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch sales summary: ${error.message}`);
  }

  // Calculate summary
  const totalSales = (data || []).reduce((sum, txn) => sum + parseFloat(txn.final_total || 0), 0);
  const totalTransactions = (data || []).length;

  // Group by customer type
  const retailSales = (data || [])
    .filter((txn) => txn.customer_type === 'retail')
    .reduce((sum, txn) => sum + parseFloat(txn.final_total || 0), 0);

  const wholesaleSales = (data || [])
    .filter((txn) => txn.customer_type === 'wholesale')
    .reduce((sum, txn) => sum + parseFloat(txn.final_total || 0), 0);

  // Get item count
  const transactionIds = (data || []).map((txn) => txn.id);
  let totalItems = 0;
  if (transactionIds.length > 0) {
    const { data: sellLines } = await supabase
      .from('transaction_sell_lines')
      .select('quantity')
      .in('transaction_id', transactionIds);

    totalItems = (sellLines || []).reduce((sum, line) => sum + parseFloat(line.quantity || 0), 0);
  }

  return {
    summary: {
      totalSales,
      totalTransactions,
      retailSales,
      wholesaleSales,
      totalItems,
      averageTransactionValue: totalTransactions > 0 ? totalSales / totalTransactions : 0,
    },
    period: {
      dateFrom: dateFrom || 'All time',
      dateTo: dateTo || 'All time',
    },
    data: data || [],
  };
}

/**
 * Get purchase summary report
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Purchase summary
 */
export async function getPurchaseSummary(businessId, options = {}) {
  const {
    dateFrom = null,
    dateTo = null,
    locationId = null,
  } = options;

  let query = supabase
    .from('transactions')
    .select('id, transaction_date, final_total, location_id, contact_id')
    .eq('business_id', businessId)
    .eq('type', 'purchase')
    .eq('status', 'final');

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  if (dateFrom) {
    query = query.gte('transaction_date', dateFrom);
  }

  if (dateTo) {
    query = query.lte('transaction_date', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch purchase summary: ${error.message}`);
  }

  // Calculate summary
  const totalPurchases = (data || []).reduce((sum, txn) => sum + parseFloat(txn.final_total || 0), 0);
  const totalTransactions = (data || []).length;

  // Get item count
  const transactionIds = (data || []).map((txn) => txn.id);
  let totalItems = 0;
  if (transactionIds.length > 0) {
    const { data: purchaseLines } = await supabase
      .from('purchase_lines')
      .select('quantity')
      .in('transaction_id', transactionIds);

    totalItems = (purchaseLines || []).reduce((sum, line) => sum + parseFloat(line.quantity || 0), 0);
  }

  // Get supplier count
  const uniqueSuppliers = new Set((data || []).map((txn) => txn.contact_id).filter(Boolean)).size;

  return {
    summary: {
      totalPurchases,
      totalTransactions,
      totalItems,
      uniqueSuppliers,
      averageTransactionValue: totalTransactions > 0 ? totalPurchases / totalTransactions : 0,
    },
    period: {
      dateFrom: dateFrom || 'All time',
      dateTo: dateTo || 'All time',
    },
    data: data || [],
  };
}

