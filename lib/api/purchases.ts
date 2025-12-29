/**
 * Purchases API
 */

import { api, ApiResponse } from './client';

export interface PurchaseItem {
  variationId: number;
  quantity: number;
  unitId: number;
  purchasePrice?: number;
}

export interface CreatePurchaseDto {
  locationId: number;
  contactId?: number;
  items: PurchaseItem[];
  paymentMethod?: string;
  discountType?: 'fixed' | 'percentage';
  discountAmount?: number;
  additionalNotes?: string;
  status?: 'draft' | 'final';
}

export interface Purchase {
  id: number;
  ref_no: string;
  type: 'purchase';
  status: 'draft' | 'final';
  final_total: number;
  transaction_date: string;
  contact?: { id: number; name: string };
  location?: { id: number; name: string };
  items?: Array<{
    id: number;
    variation_id: number;
    quantity: number;
    unit_id: number;
    purchase_price: number;
    line_total: number;
  }>;
}

export const purchasesApi = {
  create: (data: CreatePurchaseDto): Promise<ApiResponse<Purchase>> =>
    api.post<Purchase>('/purchases', data),

  getAll: (params?: {
    page?: number;
    per_page?: number;
    location_id?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse<Purchase[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.location_id) queryParams.append('location_id', params.location_id.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const query = queryParams.toString();
    return api.get<Purchase[]>(`/purchases${query ? `?${query}` : ''}`);
  },

  getById: (id: number): Promise<ApiResponse<Purchase>> => api.get<Purchase>(`/purchases/${id}`),

  complete: (id: number): Promise<ApiResponse<Purchase>> =>
    api.post<Purchase>(`/purchases/${id}/complete`),
};

