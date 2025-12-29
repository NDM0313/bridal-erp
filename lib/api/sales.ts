/**
 * Sales API
 */

import { api, ApiResponse } from './client';

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
  contact?: { id: number; name: string };
  location?: { id: number; name: string };
  items?: Array<{
    id: number;
    variation_id: number;
    quantity: number;
    unit_id: number;
    unit_price: number;
    line_total: number;
    variation?: { id: number; name: string; sub_sku: string };
    product?: { id: number; name: string; sku: string };
    unit?: { id: number; actual_name: string };
  }>;
}

export const salesApi = {
  create: (data: CreateSaleDto): Promise<ApiResponse<Sale>> =>
    api.post<Sale>('/sales', data),

  getAll: (params?: {
    page?: number;
    per_page?: number;
    location_id?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse<Sale[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.location_id) queryParams.append('location_id', params.location_id.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const query = queryParams.toString();
    return api.get<Sale[]>(`/sales${query ? `?${query}` : ''}`);
  },

  getById: (id: number): Promise<ApiResponse<Sale>> => api.get<Sale>(`/sales/${id}`),

  complete: (id: number): Promise<ApiResponse<Sale>> =>
    api.post<Sale>(`/sales/${id}/complete`),
};

