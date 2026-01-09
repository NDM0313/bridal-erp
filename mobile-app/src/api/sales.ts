/**
 * Sales API
 * Handles sales-related API calls
 */

import { apiClient } from './client.js';

export interface Sale {
  id: number;
  invoice_no: string;
  final_total: number;
  status: 'draft' | 'final';
  payment_status: 'paid' | 'partial' | 'due';
  transaction_date: string;
  contact_id?: number;
  location_id: number;
}

export interface CreateSaleRequest {
  locationId: number;
  contactId?: number;
  customerType?: 'retail' | 'wholesale';
  items: Array<{
    productId: number;
    variationId: number;
    unitId: number;
    quantity: number;
  }>;
  paymentMethod?: string;
  discountType?: 'fixed' | 'percentage';
  discountAmount?: number;
  status?: 'draft' | 'final';
}

export interface SaleResponse {
  transaction: Sale;
  items: any[];
}

/**
 * Get sales list
 */
export async function getSales(params?: {
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<Sale[]> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.per_page) queryParams.append('per_page', params.per_page.toString());

  const endpoint = `/api/v1/sales${queryParams.toString() ? `?${queryParams}` : ''}`;
  return apiClient.get<Sale[]>(endpoint);
}

/**
 * Get sale by ID
 */
export async function getSaleById(id: number): Promise<Sale> {
  return apiClient.get<Sale>(`/api/v1/sales/${id}`);
}

/**
 * Create sale
 */
export async function createSale(data: CreateSaleRequest): Promise<SaleResponse> {
  return apiClient.post<SaleResponse>('/api/v1/sales', data);
}

/**
 * Complete draft sale
 */
export async function completeSale(saleId: number): Promise<Sale> {
  return apiClient.post<Sale>(`/api/v1/sales/${saleId}/complete`);
}
