'use client';

import { useEffect, useState } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { reportsApi, type InventoryItem } from '@/lib/api/reports';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, Package } from 'lucide-react';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    loadInventory();
  }, [lowStockOnly]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await reportsApi.getInventory({ low_stock_only: lowStockOnly });
      if (response.success && response.data) {
        setInventory(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Inventory</h1>
            <p className="mt-1 text-sm text-slate-400">Current stock levels</p>
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-300">Show low stock only</span>
          </label>
        </div>

        {loading ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <Skeleton className="h-64" />
          </div>
        ) : inventory.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <EmptyState
              icon={Package}
              title="No inventory items found"
              description="Inventory items will appear here once products are added and stock is tracked."
            />
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Stock (Pieces)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Stock (Box)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Alert Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-950/50 divide-y divide-slate-800">
                  {inventory.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-100">{item.productName}</div>
                        <div className="text-sm text-slate-400">{item.variationName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-400">{item.subSku}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-400">{item.locationName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-100">{item.qtyInPieces}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-400">
                          {item.qtyInSecondaryUnit
                            ? `${item.qtyInSecondaryUnit.toFixed(2)} ${item.secondaryUnit}`
                            : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-400">{item.alertQuantity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.isLowStock ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Package className="h-3 w-3 mr-1" />
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}

