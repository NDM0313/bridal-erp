'use client';

import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { 
  Package, Search, Filter, Download, RefreshCw, Warehouse, 
  TrendingUp, Plus, ArrowRightLeft, Settings2, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/placeholders/TableSkeleton';
import { StatsSkeleton } from '@/components/placeholders/StatsSkeleton';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { useInventory } from '@/lib/hooks/useInventory';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { StockAdjustmentDrawer } from '@/components/inventory/StockAdjustmentDrawer';
import { StockTransferDrawer } from '@/components/inventory/StockTransferDrawer';
import { VirtualizedTable } from '@/components/ui/VirtualizedTable';

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

// Memoized table row component
const InventoryRow = memo(({ item }: { item: InventoryItem }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            In Stock
          </Badge>
        );
      case 'low_stock':
        return (
          <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
            Low Stock
          </Badge>
        );
      case 'out_of_stock':
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
            Out of Stock
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <tr 
      key={item.id} 
      className="hover:bg-slate-900/50 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-3">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={item.product_name}
              className="h-10 w-10 rounded-lg object-cover border border-slate-800"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <ImageIcon className="h-5 w-5 text-slate-500" />
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-slate-100">{item.product_name}</div>
            <div className="text-sm text-slate-400">{item.variation_name}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="text-sm text-slate-300 font-mono">{item.sub_sku || item.sku}</div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="text-sm text-slate-300">{item.category_name || '-'}</div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className={cn(
          "text-sm font-medium",
          item.stock_status === 'out_of_stock' ? "text-red-400" :
          item.stock_status === 'low_stock' ? "text-orange-400" : "text-slate-100"
        )}>
          {item.qty_available} {item.unit_name}
        </div>
        {item.alert_quantity > 0 && (
          <div className="text-xs text-slate-500 mt-1">Alert: {item.alert_quantity}</div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="text-sm text-slate-300">{formatCurrency(item.stock_value)}</div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {getStatusBadge(item.stock_status)}
      </td>
    </tr>
  );
});

InventoryRow.displayName = 'InventoryRow';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [adjustmentDrawerOpen, setAdjustmentDrawerOpen] = useState(false);
  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false);

  // Use React Query hook - instant cached data, background refresh
  const { data, isLoading, error, refetch } = useInventory();

  const inventory = data?.inventory || [];
  const stats = data?.stats || {
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalStockValue: 0,
  };

  // Extract categories from inventory data using useMemo to prevent infinite loops
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(inventory.map(item => item.category_name).filter(Boolean))];
    return uniqueCategories.map((name, idx) => ({ id: idx, name: name as string }));
  }, [inventory]);

  // Memoized filtered inventory
  const filteredInventory = useMemo(() => {
    let filtered = inventory;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(term) ||
        item.variation_name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        item.sub_sku.toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category_name === selectedCategory);
    }

    return filtered;
  }, [inventory, searchTerm, selectedCategory]);

  // Memoized callbacks
  const handleAdjustmentSuccess = useCallback(() => {
    setAdjustmentDrawerOpen(false);
    refetch();
    toast.success('Stock adjusted successfully');
  }, [refetch]);

  const handleTransferSuccess = useCallback(() => {
    setTransferDrawerOpen(false);
    refetch();
    toast.success('Stock transferred successfully');
  }, [refetch]);

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        {/* Header - Fixed height */}
        <div className="flex items-center justify-between h-16">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Inventory Management</h1>
            <p className="mt-1 text-sm text-slate-400">Track stock levels, adjust inventory, and transfer stock between locations</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setAdjustmentDrawerOpen(true)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Adjust Stock
            </Button>
            <Button
              variant="outline"
              onClick={() => setTransferDrawerOpen(true)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transfer Stock
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards - Fixed height skeleton */}
        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Items</p>
                  <p className="text-2xl font-bold text-slate-100 mt-1">{stats.totalItems}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Package className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Low Stock</p>
                  <p className="text-2xl font-bold text-orange-400 mt-1">{stats.lowStockItems}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Package className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">{stats.outOfStockItems}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <Package className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Stock Value</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(stats.totalStockValue)}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters - Fixed height */}
        <div className="h-14 flex items-center gap-4 p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search products, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#111827] border-slate-800 text-slate-200 placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[#111827] border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table - Skeleton matches exact layout */}
        {isLoading ? (
          <TableSkeleton rows={10} columns={6} />
        ) : error ? (
          <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <EmptyState
              icon={Package}
              title="Failed to load inventory"
              description={error instanceof Error ? error.message : 'Unknown error'}
            />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <EmptyState
              icon={Package}
              title="No inventory items found"
              description={searchTerm || selectedCategory !== 'all'
                ? "Try adjusting your filters to see more results."
                : "Inventory items will appear here once products are added and stock is tracked."}
            />
          </div>
        ) : filteredInventory.length > 20 ? (
          // Use virtualized table for large datasets (>20 rows)
          <VirtualizedTable
            data={filteredInventory}
            columns={[
              { 
                key: 'product', 
                header: 'Product', 
                width: 250, 
                render: (item) => (
                  <div className="flex items-center gap-3">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.product_name}
                        className="h-10 w-10 rounded-lg object-cover border border-slate-800"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                        <ImageIcon className="h-5 w-5 text-slate-500" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-slate-100">{item.product_name}</div>
                      <div className="text-xs text-slate-400">{item.variation_name}</div>
                    </div>
                  </div>
                )
              },
              { key: 'sku', header: 'SKU', width: 150, render: (item) => <span className="text-slate-300 font-mono text-sm">{item.sub_sku || item.sku}</span> },
              { key: 'category', header: 'Category', width: 150, render: (item) => <span className="text-slate-300">{item.category_name || '-'}</span> },
              { 
                key: 'stock', 
                header: 'Current Stock', 
                width: 180, 
                render: (item) => (
                  <div>
                    <div className={cn(
                      "text-sm font-medium",
                      item.stock_status === 'out_of_stock' ? "text-red-400" :
                      item.stock_status === 'low_stock' ? "text-orange-400" : "text-slate-100"
                    )}>
                      {item.qty_available} {item.unit_name}
                    </div>
                    {item.alert_quantity > 0 && (
                      <div className="text-xs text-slate-500 mt-1">Alert: {item.alert_quantity}</div>
                    )}
                  </div>
                )
              },
              { key: 'value', header: 'Stock Value', width: 150, render: (item) => <span className="text-slate-300">{formatCurrency(item.stock_value)}</span> },
              { 
                key: 'status', 
                header: 'Status', 
                width: 120, 
                render: (item) => {
                  const variants = {
                    in_stock: { className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'In Stock' },
                    low_stock: { className: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Low Stock' },
                    out_of_stock: { className: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Out of Stock' },
                  };
                  const variant = variants[item.stock_status];
                  return <Badge className={variant.className}>{variant.label}</Badge>;
                }
              },
            ]}
            height={600}
            rowHeight={70}
          />
        ) : (
          <div className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Stock Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-950/50 divide-y divide-slate-800">
                  {filteredInventory.map((item) => (
                    <InventoryRow key={item.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Stock Adjustment Drawer */}
      <StockAdjustmentDrawer
        isOpen={adjustmentDrawerOpen}
        onClose={() => setAdjustmentDrawerOpen(false)}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* Stock Transfer Drawer */}
      <StockTransferDrawer
        isOpen={transferDrawerOpen}
        onClose={() => setTransferDrawerOpen(false)}
        onSuccess={handleTransferSuccess}
      />
    </ModernDashboardLayout>
  );
}
