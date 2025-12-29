/**
 * Products API
 */

import { api, ApiResponse } from './client';

export interface Product {
  id: number;
  name: string;
  sku: string;
  type: string;
  unit_id: number;
  secondary_unit_id?: number;
  category_id?: number;
  brand_id?: number;
  alert_quantity?: number;
  is_inactive: boolean;
  business_id: number;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends Product {
  unit?: { id: number; actual_name: string; short_name: string };
  secondary_unit?: { id: number; actual_name: string; base_unit_multiplier: number };
  category?: { id: number; name: string };
  brand?: { id: number; name: string };
}

export interface CreateProductDto {
  name: string;
  sku: string;
  type?: string;
  unit_id: number;
  secondary_unit_id?: number;
  category_id?: number;
  brand_id?: number;
  alert_quantity?: number;
}

export const productsApi = {
  getAll: (params?: { page?: number; per_page?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return api.get<ProductWithRelations[]>(`/products${query ? `?${query}` : ''}`);
  },

  getById: (id: number): Promise<ApiResponse<ProductWithRelations>> =>
    api.get<ProductWithRelations>(`/products/${id}`),

  create: (data: CreateProductDto): Promise<ApiResponse<Product>> =>
    api.post<Product>('/products', data),

  update: (id: number, data: Partial<CreateProductDto>): Promise<ApiResponse<Product>> =>
    api.put<Product>(`/products/${id}`, data),

  delete: (id: number): Promise<ApiResponse<void>> => api.delete<void>(`/products/${id}`),
};

