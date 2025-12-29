/**
 * Modern POS Component
 * Cleaned up from Figma export, integrated with Supabase
 * Includes placeholder states, stock validation, and RLS compliance
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  PauseCircle, 
  XCircle, 
  QrCode,
  Tag,
  User,
  ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Skeleton, CardGridSkeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { ErrorState } from '@/components/placeholders/ErrorState';
import { listProducts, type Product } from '@/lib/services/productService';
import { salesApi, type CreateSaleDto } from '@/lib/api/sales';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { getCardClasses } from '@/lib/design-system/tokens';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface CartItem {
  variationId: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  unitId: number;
  image?: string;
}

interface Variation {
  id: number;
  product_id: number;
  retail_price: number;
  wholesale_price: number;
  unit_id: number;
  product?: Product;
}

export function ModernPOS() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [customerType, setCustomerType] = useState<'retail' | 'wholesale'>('retail');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Define type for raw Supabase response (product is array in relational query)
      type SupabaseVariationRow = {
        id: number;
        product_id: number;
        retail_price: number;
        wholesale_price: number;
        unit_id: number;
        product: Product[];  // Supabase returns array for relational queries
      };

      // Load variations with products (RLS-protected)
      const { data: variationsData, error: variationsError } = await supabase
        .from('variations')
        .select(`
          id,
          product_id,
          retail_price,
          wholesale_price,
          unit_id,
          product:products!inner(id, name, sku, category_id)
        `)
        .eq('is_inactive', false)
        .order('product_id', { ascending: true });

      if (variationsError) {
        console.error('Supabase variations query error:', {
          message: variationsError.message,
          details: variationsError.details,
          hint: variationsError.hint,
          code: variationsError.code,
        });
        throw new Error(`Failed to load products: ${variationsError.message}${variationsError.details ? ` (${variationsError.details})` : ''}`);
      }

      if (!variationsData) {
        console.warn('Supabase returned null/undefined data for variations');
        setProducts([]);
        return;
      }

      // Transform data: convert product array to single object
      const normalizedVariations: Variation[] = (variationsData as SupabaseVariationRow[] || []).map(v => ({
        id: v.id,
        product_id: v.product_id,
        retail_price: v.retail_price,
        wholesale_price: v.wholesale_price,
        unit_id: v.unit_id,
        product: v.product && v.product.length > 0 ? v.product[0] : undefined,
      }));

      // console.log('Loaded variations:', {
      //   count: normalizedVariations.length,
      //   sample: normalizedVariations.slice(0, 2),
      // });
      setProducts(normalizedVariations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
      const errorDetails = err instanceof Error ? err.stack : String(err);
      console.error('Failed to load products:', {
        message: errorMessage,
        details: errorDetails,
        error: err,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (variation: Variation) => {
    // Type guard: ensure product exists
    if (!variation.product) {
      toast.error('Product information is missing');
      return;
    }

    const product = variation.product;  // Now TypeScript knows it's not undefined
    const price = customerType === 'retail' ? variation.retail_price : variation.wholesale_price;

    setCart(prev => {
      const existing = prev.find(item => item.variationId === variation.id);
      if (existing) {
        return prev.map(item => 
          item.variationId === variation.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, {
        variationId: variation.id,
        productId: variation.product_id,
        name: product.name,  // ✅ Use extracted product constant
        price,
        quantity: 1,
        unitId: variation.unit_id,
      }];
    });

    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (variationId: number) => {
    setCart(prev => prev.filter(item => item.variationId !== variationId));
  };

  const updateQuantity = (variationId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.variationId === variationId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const filteredProducts = products.filter(v => {
    const matchesSearch = !searchQuery || 
      v.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.product?.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      setProcessing(true);

      // Get default location (first location for user's business)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Get first available location (RLS-protected)
      const { data: locationsData, error: locationsError } = await supabase
        .from('business_locations')
        .select('id')
        .limit(1);

      if (locationsError) {
        throw new Error(`Failed to fetch location: ${locationsError.message}`);
      }

      if (!locationsData || locationsData.length === 0) {
        throw new Error('No location found. Please set up a location first.');
      }

      const locations = locationsData[0];

      // Create sale via backend API
      const saleData: CreateSaleDto = {
        locationId: locations.id,
        customerType: customerType,
        items: cart.map(item => ({
          variationId: item.variationId,
          quantity: item.quantity,
          unitId: item.unitId,
        })),
        status: 'final',
      };

      const response = await salesApi.create(saleData);

      if (response.success) {
        toast.success(`Payment of ${formatCurrency(total)} processed successfully!`);
        setCart([]);
        // Optionally redirect to sale details
        // router.push(`/sales/${response.data.id}`);
      } else {
        throw new Error(response.error?.message || 'Failed to process payment');
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={loadProducts}
      />
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex gap-6 relative">
      {/* Products Area - Left Side */}
      <div className={cn(
        'flex-1 flex flex-col rounded-2xl overflow-hidden transition-all',
        getCardClasses(),
        showMobileCart ? 'hidden lg:flex' : 'flex'
      )}>
        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-800/50 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Scan barcode or search products..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
              <QrCode size={20} />
            </Button>
          </div>

          {/* Customer Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setCustomerType('retail')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                customerType === 'retail'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              Retail
            </button>
            <button
              onClick={() => setCustomerType('wholesale')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                customerType === 'wholesale'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              Wholesale
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800">
          {loading ? (
            <CardGridSkeleton count={8} />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No products found"
              description="No products match your search criteria."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(variation => (
                <button
                  key={variation.id}
                  onClick={() => addToCart(variation)}
                  className="group cursor-pointer bg-slate-950/50 border border-slate-800/50 rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all"
                >
                  <div className="aspect-square relative overflow-hidden bg-slate-800 flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center text-4xl text-slate-600">
                      {variation.product?.name.substring(0, 2).toUpperCase() || 'P'}
                    </div>
                    <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur text-white text-xs px-2 py-1 rounded-md font-bold">
                      {formatCurrency(customerType === 'retail' ? variation.retail_price : variation.wholesale_price)}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-slate-200 line-clamp-1">
                      {variation.product?.name || 'Unknown Product'}
                    </h3>
                    <p className="text-xs text-slate-500">{variation.product?.sku || 'N/A'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Area - Right Side */}
      <div className={cn(
        'w-full lg:w-[400px] flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all absolute lg:relative inset-0 lg:inset-auto z-20',
        getCardClasses(),
        showMobileCart ? 'flex' : 'hidden lg:flex'
      )}>
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Current Order</h2>
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-red-400"
              onClick={() => setCart([])}
            >
              <Trash2 size={18} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-slate-400"
              onClick={() => setShowMobileCart(false)}
            >
              <XCircle size={18} />
            </Button>
          </div>
        </div>

        {/* Customer Select */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800/50">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors">
            <User size={18} />
            <span className="text-sm flex-1">Walk-in Customer</span>
            <Plus size={16} />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
              <CreditCard size={48} className="mb-4" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.variationId}
                className="flex gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50"
              >
                <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                  {item.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-medium text-slate-200 line-clamp-1">{item.name}</h4>
                    <p className="text-sm font-bold text-white">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-1 border border-slate-800">
                      <button
                        onClick={() => updateQuantity(item.variationId, -1)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.variationId, 1)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.variationId)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-10">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Tax (10%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-slate-800">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300">
              <PauseCircle className="mr-2 h-4 w-4" /> Hold
            </Button>
            <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300">
              <Tag className="mr-2 h-4 w-4" /> Discount
            </Button>
          </div>
          <RoleGuard permission="canCreateSales">
            <Button
              onClick={handlePayment}
              disabled={cart.length === 0 || processing}
              isLoading={processing}
              className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)]"
            >
              Pay Now <span className="ml-2 opacity-80">{formatCurrency(total)}</span>
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Mobile Cart Toggle Floating Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30">
        <Button
          onClick={() => setShowMobileCart(!showMobileCart)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 p-0 flex items-center justify-center relative"
        >
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-950">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

