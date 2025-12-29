/**
 * Reports API
 */

import { api, ApiResponse } from './client';

export interface InventoryItem {
  variationId: number;
  variationName: string;
  subSku: string;
  productId: number;
  productName: string;
  sku: string;
  category: string;
  locationId: number;
  locationName: string;
  qtyAvailable: number;
  qtyInPieces: number;
  qtyInSecondaryUnit?: number;
  secondaryUnit?: string;
  baseUnit: string;
  alertQuantity: number;
  isLowStock: boolean;
}

export interface InventoryReport {
  data: InventoryItem[];
  summary: {
    totalVariations: number;
    totalLocations: number;
    lowStockItems: number;
    totalStockValue: number;
  };
}

export interface SalesSummary {
  summary: {
    totalSales: number;
    totalTransactions: number;
    retailSales: number;
    wholesaleSales: number;
    totalItems: number;
    averageTransactionValue: number;
  };
  period: {
    dateFrom: string;
    dateTo: string;
  };
  data: unknown[];
}

export interface PurchaseSummary {
  summary: {
    totalPurchases: number;
    totalTransactions: number;
    totalItems: number;
    uniqueSuppliers: number;
    averageTransactionValue: number;
  };
  period: {
    dateFrom: string;
    dateTo: string;
  };
  data: unknown[];
}

export const reportsApi = {
  getInventory: (params?: {
    location_id?: number;
    product_id?: number;
    category_id?: number;
    low_stock_only?: boolean;
  }): Promise<ApiResponse<InventoryReport>> => {
    const queryParams = new URLSearchParams();
    if (params?.location_id) queryParams.append('location_id', params.location_id.toString());
    if (params?.product_id) queryParams.append('product_id', params.product_id.toString());
    if (params?.category_id) queryParams.append('category_id', params.category_id.toString());
    if (params?.low_stock_only) queryParams.append('low_stock_only', 'true');

    const query = queryParams.toString();
    return api.get<InventoryReport>(`/reports/inventory${query ? `?${query}` : ''}`);
  },

  getSales: (params?: {
    date_from?: string;
    date_to?: string;
    location_id?: number;
  }): Promise<ApiResponse<SalesSummary>> => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.location_id) queryParams.append('location_id', params.location_id.toString());

    const query = queryParams.toString();
    return api.get<SalesSummary>(`/reports/sales${query ? `?${query}` : ''}`);
  },

  getPurchases: (params?: {
    date_from?: string;
    date_to?: string;
    location_id?: number;
  }): Promise<ApiResponse<PurchaseSummary>> => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.location_id) queryParams.append('location_id', params.location_id.toString());

    const query = queryParams.toString();
    return api.get<PurchaseSummary>(`/reports/purchases${query ? `?${query}` : ''}`);
  },
};

