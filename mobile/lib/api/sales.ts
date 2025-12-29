/**
 * Sales API for Mobile
 */

import { api, ApiResponse, offlineQueue } from './client';

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
}

export const salesApi = {
  create: async (data: CreateSaleDto, isOnline: boolean = true): Promise<ApiResponse<Sale>> => {
    if (!isOnline) {
      // Queue for offline sync
      await offlineQueue.add({ data, type: 'sale' });
      return {
        success: true,
        data: {
          id: Date.now(),
          invoice_no: 'OFFLINE-' + Date.now(),
          type: 'sell',
          status: 'draft',
          customer_type: data.customerType || 'retail',
          final_total: 0,
          transaction_date: new Date().toISOString(),
        } as Sale,
      };
    }
    return api.post<Sale>('/sales', data);
  },

  getAll: async (params?: {
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
};

