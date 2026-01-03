'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface InventoryItem {
  id: number;
  product_id: number;
  variation_id: number;
  product_name: string;
  variation_name: string;
  sku: string;
  sub_sku: string;
  category_name?: string;
  image_url?: string;
  qty_available: number;
  alert_quantity: number;
  unit_name: string;
  purchase_price: number;
  stock_value: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockValue: number;
}

interface InventoryQueryResult {
  inventory: InventoryItem[];
  stats: InventoryStats;
}

/**
 * Custom hook for Inventory data with React Query
 * Implements stale-while-revalidate pattern
 */
export function useInventory() {
  return useQuery<InventoryQueryResult>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) throw new Error('Business profile not found');

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, business_id, purchase_price, category_id, image_url')
        .eq('business_id', profile.business_id)
        .order('name');

      if (productsError) throw productsError;

      if (!productsData || productsData.length === 0) {
        return {
          inventory: [],
          stats: {
            totalItems: 0,
            lowStockItems: 0,
            outOfStockItems: 0,
            totalStockValue: 0,
          },
        };
      }

      const productIds = productsData.map(p => p.id);

      // Fetch variations
      const { data: variations, error: variationsError } = await supabase
        .from('variations')
        .select('id, name, sub_sku, product_id, qty_available, alert_quantity, unit_id')
        .in('product_id', productIds);

      if (variationsError) throw variationsError;

      // Fetch units
      const unitIds = [...new Set((variations || []).map((v: any) => v.unit_id).filter(Boolean))];
      const { data: unitsData } = await supabase
        .from('units')
        .select('id, name')
        .in('id', unitIds.length > 0 ? unitIds : [0]);

      const unitsMap = new Map((unitsData || []).map((u: any) => [u.id, u.name]));

      // Fetch categories
      const categoryIds = [...new Set(productsData.map(p => p.category_id).filter(Boolean))];
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds.length > 0 ? categoryIds : [0]);

      const categoriesMap = new Map((categoriesData || []).map((c: any) => [c.id, c.name]));

      // Combine data
      const inventory: InventoryItem[] = (variations || [])
        .map((variation: any) => {
          const product = productsData.find((p: any) => p.id === variation.product_id);
          if (!product) return null;

          const qtyAvailable = variation.qty_available || 0;
          const alertQty = variation.alert_quantity || 0;
          const purchasePrice = product.purchase_price || 0;
          const stockValue = qtyAvailable * purchasePrice;
          const unitName = unitsMap.get(variation.unit_id) || 'Pieces';
          const categoryName = product.category_id ? categoriesMap.get(product.category_id) : undefined;

          let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
          if (qtyAvailable === 0) {
            stockStatus = 'out_of_stock';
          } else if (qtyAvailable <= alertQty) {
            stockStatus = 'low_stock';
          }

          return {
            id: variation.id,
            product_id: product.id,
            variation_id: variation.id,
            product_name: product.name || 'Unknown',
            variation_name: variation.name || 'Default',
            sku: product.sku || '',
            sub_sku: variation.sub_sku || product.sku || '',
            category_name: categoryName,
            image_url: product.image_url,
            qty_available: qtyAvailable,
            alert_quantity: alertQty,
            unit_name: unitName,
            purchase_price: purchasePrice,
            stock_value: stockValue,
            stock_status: stockStatus,
          };
        })
        .filter((item): item is InventoryItem => item !== null);

      // Calculate stats
      const totalItems = inventory.length;
      const lowStockItems = inventory.filter(item => item.stock_status === 'low_stock').length;
      const outOfStockItems = inventory.filter(item => item.stock_status === 'out_of_stock').length;
      const totalStockValue = inventory.reduce((sum, item) => sum + item.stock_value, 0);

      return {
        inventory,
        stats: {
          totalItems,
          lowStockItems,
          outOfStockItems,
          totalStockValue,
        },
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - inventory data is fresh for 5 min
  });
}

/**
 * Optimistic mutation for stock adjustment
 */
export function useStockAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adjustmentData: any) => {
      // The actual mutation is handled in StockAdjustmentDrawer
      // This just invalidates the cache
      return adjustmentData;
    },
    onSuccess: () => {
      // Invalidate and refetch inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock adjusted successfully');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to adjust stock');
    },
  });
}

/**
 * Optimistic mutation for stock transfer
 */
export function useStockTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferData: any) => {
      // The actual mutation is handled in StockTransferDrawer
      // This just invalidates the cache
      return transferData;
    },
    onSuccess: () => {
      // Invalidate and refetch inventory
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock transferred successfully');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to transfer stock');
    },
  });
}

