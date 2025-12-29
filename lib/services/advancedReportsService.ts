/**
 * Advanced Reports Service
 * Profit, margin, stock valuation, top products
 * Uses anon key + JWT - respects RLS
 * 
 * SECURITY: Read-only operations, RLS ensures business-level isolation
 */

import { supabase } from '@/utils/supabase/client';

export interface ProfitMarginItem {
  product_id: number;
  product_name: string;
  sku: string;
  total_sales: number;
  total_cost: number;
  total_quantity_sold: number;
  profit: number;
  margin_percent: number;
}

export interface ProfitMarginReport {
  period: {
    date_from: string;
    date_to: string;
  };
  summary: {
    total_sales: number;
    total_cost: number;
    total_profit: number;
    overall_margin_percent: number;
    total_items_sold: number;
  };
  items: ProfitMarginItem[];
}

export interface StockValuationItem {
  variation_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  variation_name: string;
  location_id: number;
  location_name: string;
  qty_available: number;
  unit_cost: number;
  total_value: number;
  base_unit: string;
}

export interface StockValuationReport {
  summary: {
    total_items: number;
    total_quantity: number;
    total_value: number;
    locations_count: number;
  };
  items: StockValuationItem[];
}

export interface TopSellingProduct {
  product_id: number;
  product_name: string;
  sku: string;
  total_quantity_sold: number;
  total_sales: number;
  transaction_count: number;
  average_price: number;
}

/**
 * Get profit/margin report
 * Calculates profit = sales - cost (from purchase price)
 * RLS ensures only own business data
 */
export async function getProfitMarginReport(
  dateFrom: string,
  dateTo: string,
  locationId?: number
): Promise<ProfitMarginReport> {
  // Get completed sales with sell lines (RLS-protected)
  let salesQuery = supabase
    .from('transactions')
    .select('id, transaction_date, final_total')
    .eq('type', 'sell')
    .eq('status', 'final')
    .gte('transaction_date', dateFrom)
    .lte('transaction_date', dateTo);

  // RLS automatically filters by business_id
  if (locationId) {
    salesQuery = salesQuery.eq('location_id', locationId);
  }

  const { data: transactions, error: transactionsError } = await salesQuery;

  if (transactionsError) {
    throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
  }

  const transactionIds = (transactions || []).map((t) => t.id);

  if (transactionIds.length === 0) {
    return {
      period: { date_from: dateFrom, date_to: dateTo },
      summary: {
        total_sales: 0,
        total_cost: 0,
        total_profit: 0,
        overall_margin_percent: 0,
        total_items_sold: 0,
      },
      items: [],
    };
  }

  // Define type for raw Supabase response (relations are arrays)
  type SupabaseSellLineRow = {
    id: number;
    transaction_id: number;
    variation_id: number;
    product_id: number;
    quantity: string;
    line_total: string;
    product: Array<{ id: number; name: string; sku: string }>;  // Supabase returns array
    variation: Array<{ id: number; name: string; sub_sku: string; default_purchase_price: string }>;  // Supabase returns array
  };

  // Get sell lines with product info (RLS-protected)
  const { data: sellLinesData, error: linesError } = await supabase
    .from('transaction_sell_lines')
    .select(`
      *,
      product:products(id, name, sku),
      variation:variations(id, name, sub_sku, default_purchase_price)
    `)
    .in('transaction_id', transactionIds);

  if (linesError) {
    throw new Error(`Failed to fetch sell lines: ${linesError.message}`);
  }

  // Normalize: convert arrays to objects
  const sellLines = (sellLinesData as SupabaseSellLineRow[] || []).map(line => ({
    ...line,
    product: line.product && line.product.length > 0 ? line.product[0] : undefined,
    variation: line.variation && line.variation.length > 0 ? line.variation[0] : undefined,
  }));

  // Get purchase prices from purchase_lines (for cost calculation)
  // Note: This is a simplified approach - in production, you might use average cost or FIFO
  const variationIds = [...new Set(sellLines.map((line) => line.variation_id))];
  const { data: purchaseLines } = await supabase
    .from('purchase_lines')
    .select('variation_id, purchase_price, quantity')
    .in('variation_id', variationIds)
    .order('created_at', { ascending: false })
    .limit(1000); // Get recent purchases for cost calculation

  // Calculate average purchase price per variation
  const costMap = new Map<number, number>();
  (purchaseLines || []).forEach((line) => {
    const existing = costMap.get(line.variation_id) || 0;
    const price = parseFloat(line.purchase_price || '0');
    if (price > 0) {
      costMap.set(line.variation_id, price);
    }
  });

  // Group by product and calculate profit
  const productMap = new Map<number, ProfitMarginItem>();

  sellLines.forEach((line) => {
    // Extract relations to constants for safe access
    const product = line.product;
    const variation = line.variation;
    
    const productId = line.product_id;
    const sales = parseFloat(line.line_total || '0');
    const quantity = parseFloat(line.quantity || '0');
    const costPerUnit = costMap.get(line.variation_id) || parseFloat(variation?.default_purchase_price || '0');
    const cost = costPerUnit * quantity;

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        product_id: productId,
        product_name: product?.name || 'Unknown',
        sku: product?.sku || '',
        total_sales: 0,
        total_cost: 0,
        total_quantity_sold: 0,
        profit: 0,
        margin_percent: 0,
      });
    }

    const item = productMap.get(productId)!;
    item.total_sales += sales;
    item.total_cost += cost;
    item.total_quantity_sold += quantity;
  });

  // Calculate profit and margin
  const items = Array.from(productMap.values()).map((item) => {
    item.profit = item.total_sales - item.total_cost;
    item.margin_percent = item.total_sales > 0 ? (item.profit / item.total_sales) * 100 : 0;
    return item;
  });

  // Calculate summary
  const total_sales = items.reduce((sum, item) => sum + item.total_sales, 0);
  const total_cost = items.reduce((sum, item) => sum + item.total_cost, 0);
  const total_profit = total_sales - total_cost;
  const overall_margin_percent = total_sales > 0 ? (total_profit / total_sales) * 100 : 0;
  const total_items_sold = items.reduce((sum, item) => sum + item.total_quantity_sold, 0);

  return {
    period: { date_from: dateFrom, date_to: dateTo },
    summary: {
      total_sales,
      total_cost,
      total_profit,
      overall_margin_percent,
      total_items_sold,
    },
    items: items.sort((a, b) => b.total_sales - a.total_sales),
  };
}

/**
 * Get stock valuation report
 * Calculates total value of inventory at cost
 * RLS ensures only own business data
 */
export async function getStockValuationReport(
  locationId?: number
): Promise<StockValuationReport> {
  // Define type for raw Supabase response (relations are arrays)
  type SupabaseStockItemRow = {
    variation_id: number;
    product_id: number;
    location_id: number;
    qty_available: string;
    variation: Array<{ id: number; name: string; sub_sku: string; default_purchase_price: string }>;  // Supabase returns array
    product: Array<{ id: number; name: string; sku: string }>;  // Supabase returns array
    location: Array<{ id: number; name: string }>;  // Supabase returns array
    unit: Array<{ id: number; actual_name: string }>;  // Supabase returns array
  };

  // Get stock with product/variation info (RLS-protected)
  let stockQuery = supabase
    .from('variation_location_details')
    .select(`
      *,
      variation:variations(id, name, sub_sku, default_purchase_price),
      product:products(id, name, sku),
      location:business_locations(id, name),
      unit:units(id, actual_name)
    `);

  // RLS automatically filters by business_id
  if (locationId) {
    stockQuery = stockQuery.eq('location_id', locationId);
  }

  const { data: stockItemsData, error: stockError } = await stockQuery;

  if (stockError) {
    throw new Error(`Failed to fetch stock: ${stockError.message}`);
  }

  // Normalize: convert arrays to objects
  const stockItems = (stockItemsData as SupabaseStockItemRow[] || []).map(item => ({
    ...item,
    variation: item.variation && item.variation.length > 0 ? item.variation[0] : undefined,
    product: item.product && item.product.length > 0 ? item.product[0] : undefined,
    location: item.location && item.location.length > 0 ? item.location[0] : undefined,
    unit: item.unit && item.unit.length > 0 ? item.unit[0] : undefined,
  }));

  // Get purchase prices for cost calculation
  const variationIds = [...new Set(stockItems.map((item) => item.variation_id))];
  const { data: purchaseLines } = await supabase
    .from('purchase_lines')
    .select('variation_id, purchase_price')
    .in('variation_id', variationIds)
    .order('created_at', { ascending: false })
    .limit(1000);

  // Calculate average purchase price per variation
  const costMap = new Map<number, number>();
  (purchaseLines || []).forEach((line) => {
    const price = parseFloat(line.purchase_price || '0');
    if (price > 0 && !costMap.has(line.variation_id)) {
      costMap.set(line.variation_id, price);
    }
  });

  // Format items with valuation
  const items: StockValuationItem[] = stockItems.map((item) => {
    // Extract relations to constants for safe access
    const product = item.product;
    const variation = item.variation;
    const location = item.location;
    const unit = item.unit;
    
    const qty = parseFloat(item.qty_available || '0');
    const unitCost =
      costMap.get(item.variation_id) ||
      parseFloat(variation?.default_purchase_price || '0');
    const totalValue = qty * unitCost;

    return {
      variation_id: item.variation_id,
      product_id: item.product_id,
      product_name: product?.name || 'Unknown',
      sku: product?.sku || '',
      variation_name: variation?.name || '',
      location_id: item.location_id,
      location_name: location?.name || '',
      qty_available: qty,
      unit_cost: unitCost,
      total_value: totalValue,
      base_unit: unit?.actual_name || 'Pieces',
    };
  });

  // Calculate summary
  const total_items = items.length;
  const total_quantity = items.reduce((sum, item) => sum + item.qty_available, 0);
  const total_value = items.reduce((sum, item) => sum + item.total_value, 0);
  const locations_count = new Set(items.map((item) => item.location_id)).size;

  return {
    summary: {
      total_items,
      total_quantity,
      total_value,
      locations_count,
    },
    items: items.sort((a, b) => b.total_value - a.total_value),
  };
}

/**
 * Get top-selling products
 * RLS ensures only own business data
 */
export async function getTopSellingProducts(
  dateFrom: string,
  dateTo: string,
  limit: number = 10,
  locationId?: number
): Promise<TopSellingProduct[]> {
  // Get completed sales (RLS-protected)
  let salesQuery = supabase
    .from('transactions')
    .select('id')
    .eq('type', 'sell')
    .eq('status', 'final')
    .gte('transaction_date', dateFrom)
    .lte('transaction_date', dateTo);

  // RLS automatically filters by business_id
  if (locationId) {
    salesQuery = salesQuery.eq('location_id', locationId);
  }

  const { data: transactions, error: transactionsError } = await salesQuery;

  if (transactionsError) {
    throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
  }

  const transactionIds = (transactions || []).map((t) => t.id);

  if (transactionIds.length === 0) {
    return [];
  }

  // Get sell lines with product info (RLS-protected)
  const { data: sellLines, error: linesError } = await supabase
    .from('transaction_sell_lines')
    .select(`
      *,
      product:products(id, name, sku)
    `)
    .in('transaction_id', transactionIds);

  if (linesError) {
    throw new Error(`Failed to fetch sell lines: ${linesError.message}`);
  }

  // Group by product
  const productMap = new Map<number, TopSellingProduct>();

  (sellLines || []).forEach((line) => {
    const productId = line.product_id;
    const quantity = parseFloat(line.quantity || '0');
    const sales = parseFloat(line.line_total || '0');

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        product_id: productId,
        product_name: line.product?.name || 'Unknown',
        sku: line.product?.sku || '',
        total_quantity_sold: 0,
        total_sales: 0,
        transaction_count: 0,
        average_price: 0,
      });
    }

    const item = productMap.get(productId)!;
    item.total_quantity_sold += quantity;
    item.total_sales += sales;
    item.transaction_count += 1;
  });

  // Calculate average price and sort
  const items = Array.from(productMap.values())
    .map((item) => {
      item.average_price = item.total_quantity_sold > 0 ? item.total_sales / item.total_quantity_sold : 0;
      return item;
    })
    .sort((a, b) => b.total_sales - a.total_sales)
    .slice(0, limit);

  return items;
}

