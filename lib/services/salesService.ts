/**
 * Sales Service
 * Direct Supabase operations for sales/transactions
 * Uses anon key + JWT - respects RLS
 * 
 * NOTE: For complex operations (stock updates, validation),
 * we use backend API to ensure atomicity and business logic.
 */

import { supabase } from '@/utils/supabase/client';

export interface SaleItem {
  variationId: number;
  quantity: number;
  unitId: number;
}

export interface CreateSaleDto {
  locationId: number;
  contactId?: number;
  customerType?: 'retail' | 'wholesale';
  items: SaleItem[];
  paymentMethod?: string;
  discountType?: 'fixed' | 'percentage';
  discountAmount?: number;
  additionalNotes?: string;
  status?: 'draft' | 'final';
}

export interface Sale {
  id: number;
  invoice_no: string;
  type: 'sell';
  status: 'draft' | 'final';
  customer_type: 'retail' | 'wholesale';
  final_total: number;
  transaction_date: string;
  business_id: number;
  location_id: number;
  created_by: string;
}

/**
 * List sales (RLS-protected)
 * Returns only sales from user's business
 */
export async function listSales(params?: {
  location_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
}): Promise<Sale[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('type', 'sell');

  // RLS automatically filters by business_id
  // Additional filters
  if (params?.location_id) {
    query = query.eq('location_id', params.location_id);
  }
  if (params?.status) {
    query = query.eq('status', params.status);
  }
  if (params?.date_from) {
    query = query.gte('transaction_date', params.date_from);
  }
  if (params?.date_to) {
    query = query.lte('transaction_date', params.date_to);
  }

  const { data, error } = await query.order('transaction_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to list sales: ${error.message}`);
  }

  return data || [];
}

/**
 * Get sale by ID (RLS-protected)
 */
export async function getSaleById(id: number): Promise<Sale | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .eq('type', 'sell')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Sale not found or not accessible
    }
    throw new Error(`Failed to get sale: ${error.message}`);
  }

  return data;
}

/**
 * NOTE: createSale is handled by backend API
 * This ensures:
 * - Stock validation
 * - Atomic operations (transaction + stock update)
 * - Business logic enforcement
 * 
 * Use: salesApi.create() from lib/api/sales.ts
 */

