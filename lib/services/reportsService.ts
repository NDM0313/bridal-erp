/**
 * Reports Service
 * Direct Supabase operations for reports
 * Uses anon key + JWT - respects RLS
 * 
 * NOTE: Complex aggregations may use backend API for performance
 * 
 * FIX: Ensure Supabase client is properly initialized with session
 */

import { supabase } from '@/utils/supabase/client';

export interface DailySalesTotal {
  date: string;
  total_sales: number;
  transaction_count: number;
  retail_sales: number;
  wholesale_sales: number;
}

export interface MonthlySalesSummary {
  month: string;
  total_sales: number;
  transaction_count: number;
  retail_sales: number;
  wholesale_sales: number;
  average_transaction: number;
}

export interface ProductWiseSales {
  product_id: number;
  product_name: string;
  sku: string;
  total_quantity: number;
  total_sales: number;
  transaction_count: number;
}

/**
 * Get daily sales total (RLS-protected)
 * Returns only sales from user's business
 */
export async function getDailySalesTotal(
  dateFrom: string,
  dateTo: string,
  locationId?: number
): Promise<DailySalesTotal[]> {
  // FIX: Ensure user is authenticated before querying
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required. Please log in.');
  }

  let query = supabase
    .from('transactions')
    .select('transaction_date, final_total, customer_type, status')
    .eq('type', 'sell')
    .eq('status', 'final')
    .gte('transaction_date', dateFrom)
    .lte('transaction_date', dateTo);

  // RLS automatically filters by business_id
  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query.order('transaction_date', { ascending: true });

  if (error) {
    // FIX: Provide clearer error messages without exposing technical details
    if (error.message.includes('JWT') || error.message.includes('token') || error.message.includes('expired')) {
      throw new Error('Your session has expired. Please log in again.');
    }
    if (error.message.includes('API key') || error.message.includes('Invalid API key')) {
      // This should not happen if client is configured correctly
      console.error('API key error in reportsService - check Supabase client configuration');
      throw new Error('Configuration error. Please contact support.');
    }
    if (error.message.includes('permission') || error.message.includes('policy')) {
      throw new Error('You do not have permission to view this data.');
    }
    // Generic error - don't expose technical details to user
    console.error('Reports error:', error);
    throw new Error('Failed to load reports. Please try again or contact support.');
  }

  // Group by date
  const grouped = (data || []).reduce((acc, transaction) => {
    const date = transaction.transaction_date.split('T')[0];
    if (!acc[date]) {
      acc[date] = {
        date,
        total_sales: 0,
        transaction_count: 0,
        retail_sales: 0,
        wholesale_sales: 0,
      };
    }
    acc[date].total_sales += parseFloat(transaction.final_total || '0');
    acc[date].transaction_count += 1;
    if (transaction.customer_type === 'retail') {
      acc[date].retail_sales += parseFloat(transaction.final_total || '0');
    } else if (transaction.customer_type === 'wholesale') {
      acc[date].wholesale_sales += parseFloat(transaction.final_total || '0');
    }
    return acc;
  }, {} as Record<string, DailySalesTotal>);

  return Object.values(grouped);
}

/**
 * Get monthly sales summary (RLS-protected)
 */
export async function getMonthlySalesSummary(
  year: number,
  locationId?: number
): Promise<MonthlySalesSummary[]> {
  // FIX: Ensure user is authenticated before querying
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required. Please log in.');
  }

  const dateFrom = `${year}-01-01`;
  const dateTo = `${year}-12-31`;

  let query = supabase
    .from('transactions')
    .select('transaction_date, final_total, customer_type, status')
    .eq('type', 'sell')
    .eq('status', 'final')
    .gte('transaction_date', dateFrom)
    .lte('transaction_date', dateTo);

  // RLS automatically filters by business_id
  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query.order('transaction_date', { ascending: true });

  if (error) {
    // FIX: Provide clearer error messages
    if (error.message.includes('JWT') || error.message.includes('token') || error.message.includes('expired')) {
      throw new Error('Your session has expired. Please log in again.');
    }
    if (error.message.includes('API key') || error.message.includes('Invalid API key')) {
      console.error('API key error in reportsService - check Supabase client configuration');
      throw new Error('Configuration error. Please contact support.');
    }
    if (error.message.includes('permission') || error.message.includes('policy')) {
      throw new Error('You do not have permission to view this data.');
    }
    console.error('Reports error:', error);
    throw new Error('Failed to load reports. Please try again or contact support.');
  }

  // Group by month
  const grouped = (data || []).reduce((acc, transaction) => {
    const date = new Date(transaction.transaction_date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[month]) {
      acc[month] = {
        month,
        total_sales: 0,
        transaction_count: 0,
        retail_sales: 0,
        wholesale_sales: 0,
        average_transaction: 0,
      };
    }
    acc[month].total_sales += parseFloat(transaction.final_total || '0');
    acc[month].transaction_count += 1;
    if (transaction.customer_type === 'retail') {
      acc[month].retail_sales += parseFloat(transaction.final_total || '0');
    } else if (transaction.customer_type === 'wholesale') {
      acc[month].wholesale_sales += parseFloat(transaction.final_total || '0');
    }
    return acc;
  }, {} as Record<string, MonthlySalesSummary>);

  // Calculate averages
  Object.values(grouped).forEach((summary) => {
    summary.average_transaction =
      summary.transaction_count > 0 ? summary.total_sales / summary.transaction_count : 0;
  });

  return Object.values(grouped);
}

/**
 * Get product-wise sales aggregation (RLS-protected)
 */
export async function getProductWiseSales(
  dateFrom: string,
  dateTo: string,
  locationId?: number
): Promise<ProductWiseSales[]> {
  // FIX: Ensure user is authenticated before querying
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required. Please log in.');
  }

  // Define type for raw Supabase response (relations are arrays)
  type SupabaseSellLineRow = {
    quantity: string;
    line_total: string;
    product: Array<{ id: number; name: string; sku: string }>;  // Supabase returns array
    transaction: Array<{ id: number; transaction_date: string; status: string; location_id: number }>;  // Supabase returns array
  };

  // Get transactions with sell lines
  let query = supabase
    .from('transaction_sell_lines')
    .select(`
      quantity,
      line_total,
      product:products(id, name, sku),
      transaction:transactions!inner(id, transaction_date, status, location_id)
    `)
    .eq('transaction.status', 'final')
    .gte('transaction.transaction_date', dateFrom)
    .lte('transaction.transaction_date', dateTo);

  // RLS automatically filters by business_id
  if (locationId) {
    query = query.eq('transaction.location_id', locationId);
  }

  const { data, error } = await query;

  if (error) {
    // FIX: Provide clearer error messages
    if (error.message.includes('JWT') || error.message.includes('token') || error.message.includes('expired')) {
      throw new Error('Your session has expired. Please log in again.');
    }
    if (error.message.includes('API key') || error.message.includes('Invalid API key')) {
      console.error('API key error in reportsService - check Supabase client configuration');
      throw new Error('Configuration error. Please contact support.');
    }
    if (error.message.includes('permission') || error.message.includes('policy')) {
      throw new Error('You do not have permission to view this data.');
    }
    console.error('Reports error:', error);
    throw new Error('Failed to load reports. Please try again or contact support.');
  }

  // Normalize: convert arrays to objects
  const sellLines = (data as SupabaseSellLineRow[] || []).map(line => ({
    ...line,
    product: line.product && line.product.length > 0 ? line.product[0] : undefined,
    transaction: line.transaction && line.transaction.length > 0 ? line.transaction[0] : undefined,
  }));

  // Group by product
  const grouped = sellLines.reduce((acc, line) => {
    // Extract product to constant for safe access
    const product = line.product;
    if (!product || !product.id) return acc;

    const productId = product.id;

    if (!acc[productId]) {
      acc[productId] = {
        product_id: productId,
        product_name: product.name || '',
        sku: product.sku || '',
        total_quantity: 0,
        total_sales: 0,
        transaction_count: 0,
      };
    }

    acc[productId].total_quantity += parseFloat(line.quantity || '0');
    acc[productId].total_sales += parseFloat(line.line_total || '0');
    acc[productId].transaction_count += 1;

    return acc;
  }, {} as Record<number, ProductWiseSales>);

  return Object.values(grouped).sort((a, b) => b.total_sales - a.total_sales);
}

