/**
 * Invoice Service
 * Generate invoice data from completed sales
 * Uses anon key + JWT - respects RLS
 * 
 * SECURITY: Read-only operations, RLS ensures business-level isolation
 */

import { supabase } from '@/utils/supabase/client';

export interface InvoiceData {
  transaction: {
    id: number;
    invoice_no: string;
    transaction_date: string;
    status: string;
    customer_type: 'retail' | 'wholesale';
    total_before_tax: number;
    tax_amount: number;
    discount_type?: 'fixed' | 'percentage';
    discount_amount: number;
    final_total: number;
    additional_notes?: string;
  };
  business: {
    id: number;
    name: string;
    tax_number_1?: string;
    tax_label_1?: string;
    tax_number_2?: string;
    tax_label_2?: string;
  };
  location: {
    id: number;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip_code?: string;
  };
  contact?: {
    id: number;
    name: string;
    customer_type?: 'retail' | 'wholesale';
    email?: string;
    mobile?: string;
    address?: string;
  };
  items: Array<{
    id: number;
    product_name: string;
    product_sku: string;
    variation_name: string;
    variation_sku: string;
    quantity: number;
    unit_name: string;
    unit_price: number;
    line_discount_amount: number;
    item_tax: number;
    line_total: number;
  }>;
  summary: {
    subtotal: number;
    total_discount: number;
    total_tax: number;
    grand_total: number;
    total_items: number;
  };
}

/**
 * Generate invoice data from a completed sale
 * RLS ensures user can only access their own business data
 */
export async function generateInvoice(transactionId: number): Promise<InvoiceData> {
  // Define types for raw Supabase responses (relations are arrays)
  type SupabaseTransactionRow = {
    id: number;
    invoice_no: string;
    transaction_date: string;
    status: string;
    customer_type: string;
    total_before_tax: string;
    tax_amount: string;
    discount_type?: string;
    discount_amount: string;
    final_total: string;
    additional_notes?: string;
    business: Array<{ id: number; name: string; tax_number_1?: string; tax_label_1?: string; tax_number_2?: string; tax_label_2?: string }>;  // Supabase returns array
    location: Array<{ id: number; name: string; address?: string; city?: string; state?: string; country?: string; zip_code?: string }>;  // Supabase returns array
    contact: Array<{ id: number; name: string; customer_type?: string; email?: string; mobile?: string; address?: string }>;  // Supabase returns array
  };

  type SupabaseSellLineRow = {
    id: number;
    quantity: string;
    unit_price: string;
    line_discount_amount: string;
    item_tax: string;
    line_total: string;
    product: Array<{ id: number; name: string; sku: string }>;  // Supabase returns array
    variation: Array<{ id: number; name: string; sub_sku: string }>;  // Supabase returns array
    unit: Array<{ id: number; actual_name: string }>;  // Supabase returns array
  };

  // Get transaction with relations (RLS-protected)
  const { data: transactionData, error: transactionError } = await supabase
    .from('transactions')
    .select(`
      *,
      business:businesses(id, name, tax_number_1, tax_label_1, tax_number_2, tax_label_2),
      location:business_locations(id, name, address, city, state, country, zip_code),
      contact:contacts(id, name, customer_type, email, mobile, address)
    `)
    .eq('id', transactionId)
    .eq('type', 'sell')
    .eq('status', 'final')
    .single();

  if (transactionError || !transactionData) {
    throw new Error('Transaction not found or not finalized');
  }

  // Normalize transaction relations: convert arrays to objects
  const transaction = transactionData as SupabaseTransactionRow;
  const business = transaction.business && transaction.business.length > 0 ? transaction.business[0] : undefined;
  const location = transaction.location && transaction.location.length > 0 ? transaction.location[0] : undefined;
  const contact = transaction.contact && transaction.contact.length > 0 ? transaction.contact[0] : undefined;

  // Get sell lines with product/variation details (RLS-protected)
  const { data: sellLinesData, error: linesError } = await supabase
    .from('transaction_sell_lines')
    .select(`
      *,
      product:products(id, name, sku),
      variation:variations(id, name, sub_sku),
      unit:units(id, actual_name)
    `)
    .eq('transaction_id', transactionId)
    .order('id', { ascending: true });

  if (linesError) {
    throw new Error(`Failed to fetch sell lines: ${linesError.message}`);
  }

  // Normalize sell lines: convert arrays to objects
  const sellLines = (sellLinesData as SupabaseSellLineRow[] || []).map(line => ({
    ...line,
    product: line.product && line.product.length > 0 ? line.product[0] : undefined,
    variation: line.variation && line.variation.length > 0 ? line.variation[0] : undefined,
    unit: line.unit && line.unit.length > 0 ? line.unit[0] : undefined,
  }));

  // Format items
  const items = sellLines.map((line) => {
    // Extract relations to constants for safe access
    const product = line.product;
    const variation = line.variation;
    const unit = line.unit;
    
    return {
      id: line.id,
      product_name: product?.name || 'Unknown Product',
      product_sku: product?.sku || '',
      variation_name: variation?.name || '',
      variation_sku: variation?.sub_sku || '',
      quantity: parseFloat(line.quantity || '0'),
      unit_name: unit?.actual_name || '',
      unit_price: parseFloat(line.unit_price || '0'),
      line_discount_amount: parseFloat(line.line_discount_amount || '0'),
      item_tax: parseFloat(line.item_tax || '0'),
      line_total: parseFloat(line.line_total || '0'),
    };
  });

  // Calculate summary
  const subtotal = parseFloat(transaction.total_before_tax || '0');
  const total_discount = parseFloat(transaction.discount_amount || '0');
  const total_tax = parseFloat(transaction.tax_amount || '0');
  const grand_total = parseFloat(transaction.final_total || '0');
  const total_items = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    transaction: {
      id: transaction.id,
      invoice_no: transaction.invoice_no || '',
      transaction_date: transaction.transaction_date,
      status: transaction.status,
      customer_type: (transaction.customer_type as 'retail' | 'wholesale') || 'retail',
      total_before_tax: subtotal,
      tax_amount: total_tax,
      discount_type: transaction.discount_type as 'fixed' | 'percentage' | undefined,
      discount_amount: total_discount,
      final_total: grand_total,
      additional_notes: transaction.additional_notes || undefined,
    },
    business: {
      id: business?.id || 0,
      name: business?.name || '',
      tax_number_1: business?.tax_number_1 || undefined,
      tax_label_1: business?.tax_label_1 || undefined,
      tax_number_2: business?.tax_number_2 || undefined,
      tax_label_2: business?.tax_label_2 || undefined,
    },
    location: {
      id: location?.id || 0,
      name: location?.name || '',
      address: location?.address || undefined,
      city: location?.city || undefined,
      state: location?.state || undefined,
      country: location?.country || undefined,
      zip_code: location?.zip_code || undefined,
    },
    contact: contact
      ? {
          id: contact.id,
          name: contact.name,
          customer_type: contact.customer_type as 'retail' | 'wholesale' | undefined,
          email: contact.email || undefined,
          mobile: contact.mobile || undefined,
          address: contact.address || undefined,
        }
      : undefined,
    items,
    summary: {
      subtotal,
      total_discount,
      total_tax,
      grand_total,
      total_items,
    },
  };
}

/**
 * Get invoice by invoice number (RLS-protected)
 */
export async function getInvoiceByNumber(invoiceNo: string): Promise<InvoiceData | null> {
  // Get transaction by invoice number (RLS-protected)
  const { data: transaction, error } = await supabase
    .from('transactions')
    .select('id')
    .eq('invoice_no', invoiceNo)
    .eq('type', 'sell')
    .eq('status', 'final')
    .single();

  if (error || !transaction) {
    return null;
  }

  return generateInvoice(transaction.id);
}

