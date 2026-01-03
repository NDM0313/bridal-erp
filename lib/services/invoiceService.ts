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
  payments?: {
    total_paid: number;
    credit_due: number;
    extra_payments: number;
    payment_details: Array<{
      amount: number;
      method: string;
      date: string;
    }>;
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

  // Get transaction (RLS-protected) - allow any status
  const { data: transactionData, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('type', 'sell')
    .single();

  if (transactionError) {
    console.error('Transaction error:', transactionError);
    throw new Error(`Transaction not found: ${transactionError.message}`);
  }

  if (!transactionData) {
    throw new Error('Transaction not found');
  }

  // Get business details separately
  let business;
  if (transactionData.business_id) {
    const { data: businessData } = await supabase
      .from('businesses')
      .select('id, name, tax_number_1, tax_label_1, tax_number_2, tax_label_2')
      .eq('id', transactionData.business_id)
      .single();
    business = businessData || undefined;
  }

  // Get location details separately
  let location;
  if (transactionData.location_id) {
    const { data: locationData } = await supabase
      .from('business_locations')
      .select('id, name, address, city, state, country, zip_code')
      .eq('id', transactionData.location_id)
      .single();
    location = locationData || undefined;
  }

  // Get contact details separately
  let contact;
  if (transactionData.contact_id) {
    const { data: contactData } = await supabase
      .from('contacts')
      .select('id, name, customer_type, email, mobile, address')
      .eq('id', transactionData.contact_id)
      .single();
    contact = contactData || undefined;
  }

  const transaction = transactionData as any;

  // Get sell lines (RLS-protected)
  const { data: sellLinesData, error: linesError } = await supabase
    .from('transaction_sell_lines')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('id', { ascending: true });

  if (linesError) {
    throw new Error(`Failed to fetch sell lines: ${linesError.message}`);
  }

  // Fetch product/variation/unit details separately for each line
  const sellLines = await Promise.all((sellLinesData || []).map(async (line: any) => {
    let product, variation, unit;

    if (line.product_id) {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('id', line.product_id)
        .single();
      
      if (productError) {
        console.error(`Error fetching product ${line.product_id}:`, productError);
      }
      product = productData ? [productData] : [];
    }

    if (line.variation_id) {
      const { data: variationData, error: variationError } = await supabase
        .from('variations')
        .select('id, name, sub_sku')
        .eq('id', line.variation_id)
        .single();
      
      if (variationError) {
        console.error(`Error fetching variation ${line.variation_id}:`, variationError);
      }
      variation = variationData ? [variationData] : [];
    }

    if (line.unit_id) {
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('id, actual_name')
        .eq('id', line.unit_id)
        .single();
      
      if (unitError) {
        console.error(`Error fetching unit ${line.unit_id}:`, unitError);
      }
      unit = unitData ? [unitData] : [];
    }

    return {
      ...line,
      product: product || [],
      variation: variation || [],
      unit: unit || [],
    };
  }));

  // Normalize sell lines: convert arrays to objects
  const normalizedSellLines = (sellLines as SupabaseSellLineRow[] || []).map(line => ({
    ...line,
    product: line.product && line.product.length > 0 ? line.product[0] : undefined,
    variation: line.variation && line.variation.length > 0 ? line.variation[0] : undefined,
    unit: line.unit && line.unit.length > 0 ? line.unit[0] : undefined,
  }));

  // Format items - use normalizedSellLines instead of sellLines
  const items = normalizedSellLines.map((line) => {
    // Extract relations to constants for safe access
    const product = line.product;
    const variation = line.variation;
    const unit = line.unit;
    
    // Get SKU: prefer variation SKU, fallback to product SKU
    const variationSku = variation?.sub_sku || '';
    const productSku = product?.sku || '';
    const finalSku = variationSku || productSku;
    
    // Debug logging
    if (!finalSku) {
      console.warn(`No SKU found for line ${line.id}:`, {
        product_id: line.product_id,
        variation_id: line.variation_id,
        product_sku: productSku,
        variation_sku: variationSku,
      });
    }
    
    return {
      id: line.id,
      product_name: product?.name || 'Unknown Product',
      product_sku: productSku,
      variation_name: variation?.name || '',
      variation_sku: variationSku,
      quantity: parseFloat(line.quantity?.toString() || '0'),
      unit_name: unit?.actual_name || '',
      unit_price: parseFloat(line.unit_price?.toString() || '0'),
      line_discount_amount: parseFloat(line.line_discount_amount?.toString() || '0'),
      item_tax: parseFloat(line.item_tax?.toString() || '0'),
      line_total: parseFloat(line.line_total?.toString() || '0'),
    };
  });

  // Calculate summary
  const subtotal = parseFloat(transaction.total_before_tax || '0');
  const total_discount = parseFloat(transaction.discount_amount || '0');
  const total_tax = parseFloat(transaction.tax_amount || '0');
  const grand_total = parseFloat(transaction.final_total || '0');
  const total_items = items.reduce((sum, item) => sum + item.quantity, 0);

  // Fetch payment data from account_transactions
  let payments = undefined;
  try {
    const { data: paymentData, error: paymentError } = await supabase
      .from('account_transactions')
      .select('amount, type, transaction_date, description')
      .eq('reference_type', 'sell')
      .eq('reference_id', transaction.id)
      .order('transaction_date', { ascending: true });

    if (!paymentError && paymentData && paymentData.length > 0) {
      // Calculate total paid (sum of all credit transactions for this sale)
      const total_paid = paymentData
        .filter(p => p.type === 'credit')
        .reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0);

      const credit_due = Math.max(0, grand_total - total_paid);
      const extra_payments = Math.max(0, total_paid - grand_total);

      payments = {
        total_paid,
        credit_due,
        extra_payments: extra_payments > 0 ? extra_payments : 0,
        payment_details: paymentData
          .filter(p => p.type === 'credit')
          .map(p => ({
            amount: parseFloat(p.amount?.toString() || '0'),
            method: p.description?.includes('Cash') ? 'Cash' : 
                   p.description?.includes('Card') ? 'Card' : 
                   p.description?.includes('Bank') ? 'Bank Transfer' : 'Other',
            date: p.transaction_date || '',
          })),
      };
    }
  } catch (err) {
    console.error('Error fetching payment data:', err);
    // Continue without payment data if fetch fails
  }

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
    payments,
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

