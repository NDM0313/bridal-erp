/**
 * Stock Service
 * Direct Supabase operations for stock queries
 * Uses anon key + JWT - respects RLS
 * 
 * NOTE: Stock updates (increase/decrease) are handled by backend API
 * to ensure atomicity and prevent negative stock.
 */

import { supabase } from '@/utils/supabase/client';

export interface StockItem {
  variation_id: number;
  product_id: number;
  location_id: number;
  qty_available: number;
  variation?: {
    id: number;
    name: string;
    sub_sku: string;
    retail_price: number;
    wholesale_price: number;
  };
  product?: {
    id: number;
    name: string;
    sku: string;
  };
  location?: {
    id: number;
    name: string;
  };
}

/**
 * Get stock for a variation at a location (RLS-protected)
 */
export async function getStock(variationId: number, locationId: number): Promise<StockItem | null> {
  // Define type for raw Supabase response (relations are arrays)
  type SupabaseStockRow = {
    variation_id: number;
    product_id: number;
    location_id: number;
    qty_available: string;
    variation: Array<{ id: number; name: string; sub_sku: string; retail_price: string; wholesale_price: string }>;  // Supabase returns array
    product: Array<{ id: number; name: string; sku: string }>;  // Supabase returns array
    location: Array<{ id: number; name: string }>;  // Supabase returns array
  };

  const { data, error } = await supabase
    .from('variation_location_details')
    .select(`
      *,
      variation:variations(id, name, sub_sku, retail_price, wholesale_price),
      product:products(id, name, sku),
      location:business_locations(id, name)
    `)
    .eq('variation_id', variationId)
    .eq('location_id', locationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Stock not found or not accessible
    }
    throw new Error(`Failed to get stock: ${error.message}`);
  }

  // Normalize: convert arrays to objects
  const row = data as SupabaseStockRow;
  return {
    variation_id: row.variation_id,
    product_id: row.product_id,
    location_id: row.location_id,
    qty_available: parseFloat(row.qty_available || '0'),
    variation: row.variation && row.variation.length > 0 ? {
      id: row.variation[0].id,
      name: row.variation[0].name,
      sub_sku: row.variation[0].sub_sku,
      retail_price: parseFloat(row.variation[0].retail_price || '0'),
      wholesale_price: parseFloat(row.variation[0].wholesale_price || '0'),
    } : undefined,
    product: row.product && row.product.length > 0 ? {
      id: row.product[0].id,
      name: row.product[0].name,
      sku: row.product[0].sku,
    } : undefined,
    location: row.location && row.location.length > 0 ? {
      id: row.location[0].id,
      name: row.location[0].name,
    } : undefined,
  };
}

/**
 * List all stock items (RLS-protected)
 * Returns only stock from user's business
 */
export async function listStock(params?: {
  location_id?: number;
  product_id?: number;
  variation_id?: number;
  low_stock_only?: boolean;
}): Promise<StockItem[]> {
  // Define type for raw Supabase response (relations are arrays)
  type SupabaseStockRow = {
    variation_id: number;
    product_id: number;
    location_id: number;
    qty_available: string;
    variation: Array<{ id: number; name: string; sub_sku: string; retail_price: string; wholesale_price: string }>;  // Supabase returns array
    product: Array<{ id: number; name: string; sku: string }>;  // Supabase returns array
    location: Array<{ id: number; name: string }>;  // Supabase returns array
  };

  let query = supabase
    .from('variation_location_details')
    .select(`
      *,
      variation:variations(id, name, sub_sku, retail_price, wholesale_price),
      product:products(id, name, sku),
      location:business_locations(id, name)
    `);

  // RLS automatically filters by business_id
  // Additional filters
  if (params?.location_id) {
    query = query.eq('location_id', params.location_id);
  }
  if (params?.product_id) {
    query = query.eq('product_id', params.product_id);
  }
  if (params?.variation_id) {
    query = query.eq('variation_id', params.variation_id);
  }
  if (params?.low_stock_only) {
    // Join with products to check alert_quantity
    // This is a simplified check - full implementation would join products table
    query = query.lt('qty_available', 10); // Placeholder - should check against alert_quantity
  }

  const { data, error } = await query.order('qty_available', { ascending: true });

  if (error) {
    throw new Error(`Failed to list stock: ${error.message}`);
  }

  // Normalize: convert arrays to objects
  const stockItems = (data as SupabaseStockRow[] || []).map(row => ({
    variation_id: row.variation_id,
    product_id: row.product_id,
    location_id: row.location_id,
    qty_available: parseFloat(row.qty_available || '0'),
    variation: row.variation && row.variation.length > 0 ? {
      id: row.variation[0].id,
      name: row.variation[0].name,
      sub_sku: row.variation[0].sub_sku,
      retail_price: parseFloat(row.variation[0].retail_price || '0'),
      wholesale_price: parseFloat(row.variation[0].wholesale_price || '0'),
    } : undefined,
    product: row.product && row.product.length > 0 ? {
      id: row.product[0].id,
      name: row.product[0].name,
      sku: row.product[0].sku,
    } : undefined,
    location: row.location && row.location.length > 0 ? {
      id: row.location[0].id,
      name: row.location[0].name,
    } : undefined,
  }));

  return stockItems;
}

/**
 * Check stock availability before sale
 * Returns true if sufficient stock available
 */
export async function checkStockAvailability(
  variationId: number,
  locationId: number,
  requiredQuantity: number
): Promise<{ available: boolean; currentStock: number; message: string }> {
  const stock = await getStock(variationId, locationId);

  if (!stock) {
    return {
      available: false,
      currentStock: 0,
      message: 'Stock record not found',
    };
  }

  const available = stock.qty_available >= requiredQuantity;

  return {
    available,
    currentStock: stock.qty_available,
    message: available
      ? 'Stock available'
      : `Insufficient stock. Available: ${stock.qty_available}, Required: ${requiredQuantity}`,
  };
}

/**
 * NOTE: Stock updates (increase/decrease) are handled by backend API
 * This ensures:
 * - Atomic operations
 * - Negative stock prevention
 * - Unit conversion (Box → Pieces)
 * - Transaction consistency
 * 
 * Use backend API for:
 * - Sales (reduces stock)
 * - Purchases (increases stock)
 * - Adjustments (increases/decreases stock)
 */

