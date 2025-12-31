/**
 * Modern POS Component
 * Clean implementation based on POS Module Documentation
 * Dark theme, touch-friendly, with retail/wholesale pricing toggle
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
  XCircle, 
  ShoppingCart,
  Tag,
  User,
  ArrowLeft,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Skeleton, CardGridSkeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { ErrorState } from '@/components/placeholders/ErrorState';
import { salesApi, type CreateSaleDto } from '@/lib/api/sales';
import { cn } from '@/lib/utils';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';

// Format currency helper
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('PKR', 'PKR ');
};

interface CartItem {
  variationId: number;
  productId: number;
  name: string;
  retailPrice: number;
  wholesalePrice: number;
  quantity: number;
  unitId: number;
  image?: string | null;
}

interface Variation {
  id: number;
  product_id: number;
  retail_price: number;
  wholesale_price: number;
  unit_id: number;
  product?: {
    id: number;
    name: string;
    sku: string;
    category_id: number | null;
    brand_id: number | null;
    unit_id: number | null;
    image?: string | null;
    enable_stock?: boolean | null;
    is_inactive?: boolean | null;
  };
}

export function ModernPOS() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [activeBrand, setActiveBrand] = useState<number | 'all'>('all');
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [stockMap, setStockMap] = useState<Map<number, number>>(new Map());
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [todaysSales, setTodaysSales] = useState(0);
  const [isWholesale, setIsWholesale] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadBrands();
    loadTodaysSales();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        throw new Error('Business not found');
      }

      // Get product IDs for this business
      const { data: businessProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('business_id', profile.business_id)
        .limit(1000);

      if (productsError) {
        throw new Error(`Failed to load products: ${productsError.message}`);
      }

      if (!businessProducts || businessProducts.length === 0) {
        setProducts([]);
        return;
      }

      const businessProductIds = businessProducts.map(p => p.id);

      // Load variations for these products
      const { data: variationsList, error: variationsListError } = await supabase
        .from('variations')
        .select('id, product_id, retail_price, wholesale_price')
        .in('product_id', businessProductIds)
        .is('deleted_at', null)
        .order('product_id', { ascending: true });

      if (variationsListError) {
        throw new Error(`Failed to load variations: ${variationsListError.message}`);
      }

      if (!variationsList || variationsList.length === 0) {
        setProducts([]);
        return;
      }

      // Get unique product IDs from variations
      const uniqueProductIds = [...new Set(variationsList.map((v: any) => v.product_id))];

      // Load products
      const { data: productsList, error: productsListError } = await supabase
        .from('products')
        .select('id, name, sku, category_id, brand_id, unit_id, image, enable_stock, is_inactive')
        .in('id', uniqueProductIds)
        .eq('business_id', profile.business_id)
        .order('name', { ascending: true });

      if (productsListError) {
        throw new Error(`Failed to load products: ${productsListError.message}`);
      }

      // Combine variations with products
      const variationsData = variationsList.map((v: any) => {
        const product = productsList?.find((p: any) => p.id === v.product_id);
        return {
          ...v,
          product: product || null
        };
      });

      const normalizedVariations: Variation[] = (variationsData || [])
        .filter((v: any) => {
          const product = v.product;
          return product && product.is_inactive !== true;
        })
        .map((v: any) => {
          const product = v.product;
          return {
            id: v.id,
            product_id: v.product_id,
            retail_price: parseFloat(v.retail_price || 0),
            wholesale_price: parseFloat(v.wholesale_price || 0),
            unit_id: v.unit_id || product?.unit_id || 0,
            product: {
              id: product.id,
              name: product.name || 'Unknown Product',
              sku: product.sku || '',
              category_id: product.category_id,
              brand_id: product.brand_id,
              unit_id: product.unit_id,
              image: product.image || null,
              enable_stock: product.enable_stock ?? false,
              is_inactive: product.is_inactive ?? false,
            },
          };
        });

      setProducts(normalizedVariations);
      
      if (normalizedVariations.length > 0) {
        await loadStock(normalizedVariations.map(v => v.id));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
      setError(errorMessage);
      console.error('Load products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) return;

      const { data: cats, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('business_id', profile.business_id)
        .order('name');

      if (error) throw error;
      setCategories(cats || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadBrands = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) return;

      const { data: brandsData, error } = await supabase
        .from('brands')
        .select('id, name')
        .eq('business_id', profile.business_id)
        .order('name');

      if (error) throw error;
      setBrands(brandsData || []);
    } catch (err) {
      console.error('Failed to load brands:', err);
    }
  };

  const loadStock = async (variationIds: number[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: locations } = await supabase
        .from('business_locations')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (!locations?.id) return;

      const { data: stockData, error } = await supabase
        .from('variation_location_details')
        .select('variation_id, qty_available')
        .in('variation_id', variationIds)
        .eq('location_id', locations.id);

      if (error) throw error;

      const newStockMap = new Map<number, number>();
      stockData?.forEach(s => {
        newStockMap.set(s.variation_id, parseFloat(s.qty_available?.toString() || '0'));
      });
      setStockMap(newStockMap);
    } catch (err) {
      console.error('Failed to load stock:', err);
    }
  };

  const loadTodaysSales = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: sales, error } = await supabase
        .from('transactions')
        .select('final_total')
        .eq('business_id', profile.business_id)
        .eq('type', 'sell')
        .eq('status', 'final')
        .gte('transaction_date', today.toISOString());

      if (error) throw error;

      const total = sales?.reduce((sum, s) => sum + parseFloat(s.final_total?.toString() || '0'), 0) || 0;
      setTodaysSales(total);
    } catch (err) {
      console.error('Failed to load today\'s sales:', err);
    }
  };

  const addToCart = (variation: Variation) => {
    if (!variation.product) {
      toast.error('Product information is missing');
      return;
    }

    const product = variation.product;
    const stock = stockMap.get(variation.id) ?? 0;
    const enableStock = product.enable_stock ?? false;

    // Check stock availability only if stock tracking is enabled
    if (enableStock && stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.variationId === variation.id);
      
      if (existing) {
        const newQty = existing.quantity + 1;
        // Check if adding more would exceed stock (only if stock tracking is enabled)
        if (enableStock && newQty > stock) {
          toast.warning(`Only ${stock} items available in stock`);
          return prev;
        }
        return prev.map(item => 
          item.variationId === variation.id 
            ? { ...item, quantity: newQty } 
            : item
        );
      }
      
      return [...prev, {
        variationId: variation.id,
        productId: variation.product_id,
        name: product.name,
        retailPrice: variation.retail_price || 0,
        wholesalePrice: variation.wholesale_price || 0,
        quantity: 1,
        unitId: variation.unit_id || 0,
        image: product.image || null,
      }];
    });

    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (variationId: number) => {
    setCart(prev => prev.filter(item => item.variationId !== variationId));
  };

  const updateQuantity = (variationId: number, delta: number) => {
    const stock = stockMap.get(variationId) || 0;
    setCart(prev => prev.map(item => {
      if (item.variationId === variationId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
          return item;
        }
        if (delta > 0 && newQty > stock) {
          toast.warning(`Only ${stock} items available in stock`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const filteredProducts = products.filter(v => {
    if (!v.product) return false;
    
    const matchesSearch = !searchQuery || 
      (v.product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       v.product.sku?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const categoryMatch = activeCategory === 'all' 
      ? true 
      : (typeof activeCategory === 'string' ? parseInt(activeCategory) : activeCategory) === v.product.category_id;
    
    const brandMatch = activeBrand === 'all' 
      ? true 
      : (typeof activeBrand === 'string' ? parseInt(activeBrand) : activeBrand) === v.product.brand_id;
    
    return matchesSearch && categoryMatch && brandMatch;
  });

  // Calculate totals based on pricing mode
  const subtotal = cart.reduce((sum, item) => {
    const price = isWholesale ? item.wholesalePrice : item.retailPrice;
    return sum + (price * item.quantity);
  }, 0);
  
  const discountAmount = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * 0.1; // 10% tax
  const total = afterDiscount + tax;

  const handlePayment = async (paymentMethod: 'Cash' | 'Card') => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Validate discount
    if (discount < 0 || discount > 100) {
      toast.error('Discount must be between 0 and 100%');
      return;
    }

    try {
      setProcessing(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

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

      const saleData: CreateSaleDto = {
        locationId: locations.id,
        customerType: isWholesale ? 'wholesale' : 'retail',
        items: cart.map(item => ({
          variationId: item.variationId,
          quantity: item.quantity,
          unitId: item.unitId,
        })),
        paymentMethod: paymentMethod,
        discountType: discount > 0 ? 'percentage' : undefined,
        discountAmount: discount > 0 ? discount : undefined,
        additionalNotes: customerName ? `Customer: ${customerName}` : undefined,
        status: 'final',
      };

      const response = await salesApi.create(saleData);

      if (response.success) {
        toast.success(`${paymentMethod} payment of ${formatCurrency(total)} processed successfully!`);
        setCart([]);
        setCustomerName('');
        setDiscount(0);
        setIsWholesale(false);
        loadTodaysSales();
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
    <div className="h-screen flex flex-col bg-[#111827]">
      {/* Header */}
      <div className="bg-[#111827] border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-blue-500">POS Terminal</h1>
              <p className="text-sm text-gray-400">Point of Sale System</p>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-11 pr-4 h-11 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2">
              <Calendar size={18} className="text-gray-400" />
              <span className="text-sm text-gray-400">Today:</span>
              <span className="text-sm font-semibold text-white">{formatCurrency(todaysSales)}</span>
            </div>
            <button
              onClick={() => setShowMobileCart(!showMobileCart)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              <ShoppingCart size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products Area - Left */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category Pills */}
          <div className="px-6 py-4 border-b border-gray-800 bg-[#111827]">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                  activeCategory === 'all'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                )}
              >
                All Items
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                    activeCategory === cat.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            {loading ? (
              <CardGridSkeleton count={12} />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No products found"
                description={searchQuery || activeCategory !== 'all' || activeBrand !== 'all' 
                  ? "Try adjusting your filters or search query."
                  : "No products available."}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map(variation => {
                  const price = isWholesale ? variation.wholesale_price : variation.retail_price;
                  const stock = stockMap.get(variation.id) ?? 0;
                  const enableStock = variation.product?.enable_stock ?? false;
                  const isOutOfStock = enableStock && stock <= 0;
                  const productImage = variation.product?.image;
                  const productName = variation.product?.name || 'Unknown Product';

                  return (
                    <div
                      key={variation.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isOutOfStock) {
                          addToCart(variation);
                        } else {
                          toast.error('Product is out of stock');
                        }
                      }}
                      className={cn(
                        'group rounded-2xl border-2 overflow-hidden transition-all relative cursor-pointer bg-gradient-to-br from-[#1F2937] to-[#111827]',
                        isOutOfStock
                          ? 'border-gray-700/30 bg-gray-900/30 opacity-50 cursor-not-allowed'
                          : 'border-gray-700/50 hover:border-blue-500/50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                      )}
                    >
                      {/* Stock Badge */}
                      {enableStock && (
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
                          <p className="text-xs font-medium text-white">
                            {isOutOfStock ? 'Out' : stock}
                          </p>
                        </div>
                      )}
                      
                      {/* Wholesale Tag */}
                      {isWholesale && variation.wholesale_price > 0 && (
                        <div className="absolute top-2 left-2 bg-green-500/20 text-green-400 px-2 py-1 rounded-lg">
                          <p className="text-xs font-medium">Wholesale</p>
                        </div>
                      )}

                      <div className="p-4">
                        {/* Product Image or Initials */}
                        {productImage ? (
                          <div className="w-full h-24 mb-3 rounded-lg overflow-hidden bg-gray-800">
                            <img
                              src={productImage}
                              alt={productName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-24 mb-3 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                            <span className="text-2xl font-bold text-blue-400">
                              {productName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        <h3 className="text-base font-semibold text-white mb-1 line-clamp-1">
                          {productName}
                        </h3>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-lg font-bold text-blue-400">{formatCurrency(price)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart Area - Right Side */}
        <div className={cn(
          'w-full lg:w-[460px] flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all absolute lg:relative inset-0 lg:inset-auto z-20 bg-gray-900 border-l border-gray-800',
          showMobileCart ? 'flex' : 'hidden lg:flex'
        )}>
          {/* Cart Header */}
          <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-[#111827]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 rounded-lg">
                <ShoppingCart className="text-blue-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Current Order</h2>
                <p className="text-xs text-gray-400">{cart.length} items</p>
              </div>
              <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-400"
                onClick={() => {
                  setCart([]);
                  setCustomerName('');
                  setDiscount(0);
                }}
              >
                <Trash2 size={18} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-gray-400"
                onClick={() => setShowMobileCart(false)}
              >
                <XCircle size={18} />
              </Button>
            </div>
          </div>

          {/* Customer Name Input */}
          <div className="p-4 bg-[#111827] border-b border-gray-800/50">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <User size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder:text-gray-500 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing Mode Toggle */}
          <div className="p-4 bg-[#111827] border-b border-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag size={18} className="text-gray-400" />
                <span className="text-sm text-gray-400">Pricing Mode</span>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <span className={cn("text-sm font-medium transition-colors", isWholesale ? "text-green-400" : "text-gray-400")}>
                  {isWholesale ? 'Wholesale' : 'Retail'}
                </span>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isWholesale}
                    onChange={(e) => setIsWholesale(e.target.checked)}
                  />
                  <span
                    className={cn(
                      'inline-block h-6 w-11 transform rounded-full transition-colors',
                      isWholesale ? 'bg-green-600' : 'bg-gray-700'
                    )}
                  />
                  <span
                    className={cn(
                      'absolute left-1 top-1 h-4 w-4 transform rounded-full bg-white transition-transform',
                      isWholesale ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Discount Input */}
          <div className="p-4 bg-[#111827] border-b border-gray-800/50">
            <div className="flex items-center gap-3">
              <Tag size={18} className="text-gray-400" />
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={discount || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setDiscount(Math.min(100, Math.max(0, value)));
                  }}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                <ShoppingCart size={64} className="mb-4 opacity-30" />
                <p className="text-lg font-medium">Cart is empty</p>
                <p className="text-sm mt-1">Add products to get started</p>
              </div>
            ) : (
              cart.map(item => {
                const itemStock = stockMap.get(item.variationId) || 0;
                const itemPrice = isWholesale ? item.wholesalePrice : item.retailPrice;
                return (
                  <div
                    key={item.variationId}
                    className="bg-gray-800/50 p-4 rounded-xl border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                      <p className="text-sm font-bold text-blue-400">
                        {formatCurrency(itemPrice * item.quantity)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {formatCurrency(itemPrice)} x {item.quantity}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.variationId, -1)}
                        className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors border border-gray-700 bg-gray-900"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-semibold w-8 text-center text-white">{item.quantity}</span>
                      <button
                        onClick={() => {
                          if (item.quantity + 1 > itemStock) {
                            toast.warning(`Only ${itemStock} items available in stock`);
                          } else {
                            updateQuantity(item.variationId, 1);
                          }
                        }}
                        className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors border border-gray-700 bg-blue-600 border-blue-500"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Totals & Actions */}
          <div className="p-6 bg-[#111827] border-t border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-10">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span>
                <span className="text-white font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-orange-400">
                  <span>Discount ({discount}%)</span>
                  <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-400">
                <span>Tax (10%)</span>
                <span className="text-white font-medium">{formatCurrency(tax)}</span>
              </div>
              <div className="pt-3 border-t border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-2xl font-bold text-blue-400">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Buttons */}
            <RoleGuard permission="canCreateSales">
              <div className="space-y-3">
                <Button
                  onClick={() => handlePayment('Cash')}
                  disabled={cart.length === 0 || processing}
                  isLoading={processing}
                  className={cn(
                    "w-full py-4 text-lg font-bold text-white rounded-xl shadow-lg transition-all",
                    cart.length === 0 || processing
                      ? "bg-gray-700 opacity-50 cursor-not-allowed grayscale"
                      : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 active:scale-[0.98]"
                  )}
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  Cash Payment
                </Button>
                <Button
                  onClick={() => handlePayment('Card')}
                  disabled={cart.length === 0 || processing}
                  isLoading={processing}
                  className={cn(
                    "w-full py-4 text-lg font-bold text-white rounded-xl shadow-lg transition-all",
                    cart.length === 0 || processing
                      ? "bg-gray-700 opacity-50 cursor-not-allowed grayscale"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-[0.98]"
                  )}
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Card Payment
                </Button>
              </div>
            </RoleGuard>
          </div>
        </div>
      </div>

      {/* Mobile Cart Toggle Floating Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30">
        <Button
          onClick={() => setShowMobileCart(!showMobileCart)}
          className="h-16 w-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 p-0 flex items-center justify-center relative"
        >
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center border-2 border-[#111827]">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
