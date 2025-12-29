/**
 * Reports API for Mobile
 */

import { api, ApiResponse } from './client';

export interface InventoryItem {
  variationId: number;
  variationName: string;
  productName: string;
  locationName: string;
  qtyAvailable: number;
  qtyInPieces: number;
  isLowStock: boolean;
}

export interface InventoryReport {
  data: InventoryItem[];
  summary: {
    totalVariations: number;
    lowStockItems: number;
  };
}

export interface SalesSummary {
  summary: {
    totalSales: number;
    totalTransactions: number;
    retailSales: number;
    wholesaleSales: number;
    averageTransactionValue: number;
  };
}

export const reportsApi = {
  getInventory: (params?: {
    location_id?: number;
    low_stock_only?: boolean;
  }): Promise<ApiResponse<InventoryReport>> => {
    const queryParams = new URLSearchParams();
    if (params?.location_id) queryParams.append('location_id', params.location_id.toString());
    if (params?.low_stock_only) queryParams.append('low_stock_only', 'true');

    const query = queryParams.toString();
    return api.get<InventoryReport>(`/reports/inventory${query ? `?${query}` : ''}`);
  },

  getSales: (params?: {
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse<SalesSummary>> => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const query = queryParams.toString();
    return api.get<SalesSummary>(`/reports/sales${query ? `?${query}` : ''}`);
  },
};

