/**
 * Modern Product List Component
 * Cleaned up from Figma export, integrated with Supabase
 * Includes placeholder states, RoleGuard, and RLS compliance
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Edit, 
  Trash, 
  Eye,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RoleGuard, AdminOnly } from '@/components/auth/RoleGuard';
import { Skeleton, TableSkeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState, EmptyProducts } from '@/components/placeholders/EmptyState';
import { ErrorState } from '@/components/placeholders/ErrorState';
import { listProducts, createProduct, updateProduct, type Product } from '@/lib/services/productService';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { getCardClasses } from '@/lib/design-system/tokens';

interface ProductWithRelations extends Product {
  category?: { name: string };
  unit?: { actual_name: string };
  stock?: number;
  status?: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export function ModernProductList() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadProducts();
  }, [searchTerm, categoryFilter, statusFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication
      const { supabase } = await import('@/utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // Load products with filters
      const data = await listProducts({
        search: searchTerm || undefined,
        category_id: categoryFilter !== 'all' ? parseInt(categoryFilter) : undefined,
        is_inactive: statusFilter === 'inactive' ? true : statusFilter === 'active' ? false : undefined,
      });

      // Get default location for stock queries
      const { data: defaultLocation } = await supabase
        .from('business_locations')
        .select('id')
        .limit(1)
        .maybeSingle();

      // Get variations for products to calculate stock
      const productIds = data.map(p => p.id);
      const { data: variations } = await supabase
        .from('variations')
        .select('id, product_id')
        .in('product_id', productIds);

      const variationIds = variations?.map(v => v.id) || [];

      // Get stock for all variations at default location
      const { data: stockData } = await supabase
        .from('variation_location_details')
        .select('variation_id, qty_available')
        .in('variation_id', variationIds)
        .eq('location_id', defaultLocation?.id || 0);

      // Create stock map: variation_id -> qty_available
      const stockMap = new Map<number, number>();
      stockData?.forEach(s => {
        stockMap.set(s.variation_id, parseFloat(s.qty_available?.toString() || '0'));
      });

      // Group stock by product_id
      const productStockMap = new Map<number, number>();
      variations?.forEach(v => {
        const stock = stockMap.get(v.id) || 0;
        const current = productStockMap.get(v.product_id) || 0;
        productStockMap.set(v.product_id, current + stock);
      });

      // Transform products to include stock and status
      const productsWithStock = data.map((product) => {
        const stock = productStockMap.get(product.id) || 0;
        const alertQty = product.alert_quantity || 0;
        
        let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
        if (stock === 0) {
          status = 'Out of Stock';
        } else if (alertQty > 0 && stock <= alertQty) {
          status = 'Low Stock';
        }

        return {
          ...product,
          stock,
          status,
        };
      });

      setProducts(productsWithStock);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      // Use backend API for delete (ensures proper authorization)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const { supabase } = await import('@/utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      // Reload products
      loadProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const filteredProducts = products.filter(p => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'in_stock' && p.status === 'In Stock') return true;
    if (statusFilter === 'low_stock' && p.status === 'Low Stock') return true;
    if (statusFilter === 'out_of_stock' && p.status === 'Out of Stock') return true;
    return false;
  });

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={loadProducts}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Management</h1>
          <p className="text-slate-400">Manage your catalog, stock levels, and prices.</p>
        </div>
        <div className="flex gap-3">
          <RoleGuard permission="canCreateProducts">
            <Button 
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              onClick={() => router.push('/products/new')}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={cn(getCardClasses(), 'p-4 flex flex-col md:flex-row gap-4 justify-between')}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search by name, SKU, or category..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none bg-slate-950 border border-slate-800 rounded-lg pl-4 pr-10 py-2 text-slate-300 focus:outline-none focus:border-blue-500 h-10 text-sm"
            >
              <option value="all">All Categories</option>
              {/* TODO: Load categories from Supabase */}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-slate-950 border border-slate-800 rounded-lg pl-4 pr-10 py-2 text-slate-300 focus:outline-none focus:border-blue-500 h-10 text-sm"
            >
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className={cn(getCardClasses(), 'p-6')}>
          <TableSkeleton rows={5} columns={7} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className={cn(getCardClasses(), 'p-12')}>
          <EmptyProducts onCreate={() => router.push('/products/new')} />
        </div>
      ) : (
        <div className={cn(getCardClasses(), 'overflow-hidden')}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 text-sm">
                  <th className="p-4 font-medium whitespace-nowrap">Product Name</th>
                  <th className="p-4 font-medium whitespace-nowrap">SKU</th>
                  <th className="p-4 font-medium whitespace-nowrap">Category</th>
                  <th className="p-4 font-medium whitespace-nowrap">Unit</th>
                  <th className="p-4 font-medium whitespace-nowrap">Stock</th>
                  <th className="p-4 font-medium whitespace-nowrap">Status</th>
                  <th className="p-4 font-medium whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 text-sm divide-y divide-slate-800/50">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4 font-medium text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs text-slate-500">
                          {product.name.substring(0, 2).toUpperCase()}
                        </div>
                        {product.name}
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">{product.sku}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-md bg-slate-800 text-xs text-slate-400 border border-slate-700">
                        {product.category?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{product.unit?.actual_name || 'N/A'}</td>
                    <td className="p-4">{product.stock || 0}</td>
                    <td className="p-4">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium border',
                        product.status === 'In Stock' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                        product.status === 'Low Stock' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        product.status === 'Out of Stock' && 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                      )}>
                        {product.status || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <RoleGuard permission="canEditProducts">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                            onClick={() => router.push(`/products/${product.id}/edit`)}
                          >
                            <Edit size={16} />
                          </Button>
                        </RoleGuard>
                        <AdminOnly>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash size={16} />
                          </Button>
                        </AdminOnly>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="p-4 border-t border-slate-800/50 flex items-center justify-between text-sm text-slate-500">
            <span>Showing {filteredProducts.length} products</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 border-slate-800 text-slate-400 hover:text-white" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" className="h-8 border-slate-800 text-slate-400 hover:text-white" disabled>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

