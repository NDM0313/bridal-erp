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
import { useBranchV2 } from '@/lib/context/BranchContextV2';

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
  editedPrice?: number; // User-edited price per unit
  discountAmount?: number; // Discount amount for this item
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
  const { activeBranch } = useBranchV2();
  const activeBranchId = activeBranch?.id ? Number(activeBranch.id) : null;
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
  const [todaysSales, setTodaysSales] = useState(0);
  const [editingPrice, setEditingPrice] = useState<number | null>(null); // variationId being edited
  const [editingDiscount, setEditingDiscount] = useState<number | null>(null); // variationId being edited

  useEffect(() => {
    if (activeBranchId) {
      loadProducts();
      loadCategories();
      loadBrands();
      loadTodaysSales();
    }
  }, [activeBranchId]);

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
      if (!activeBranchId) {
        setStockMap(new Map());
        return;
      }

      const branchIdNum = Number(activeBranchId);
      console.log('🔍 BRANCH FILTER [ModernPOS.loadStock]', { branchIdNum, type: typeof branchIdNum });
      
      const { data: stockData, error } = await supabase
        .from('variation_location_details')
        .select('variation_id, qty_available')
        .in('variation_id', variationIds)
        .eq('location_id', branchIdNum); // CRITICAL: Filter by active branch (ensure number)

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
      if (!activeBranchId) {
        setTodaysSales(0);
        return;
      }

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

      // CRITICAL: Filter by active branch
      const branchIdNum = Number(activeBranchId);
      console.log('🔍 BRANCH FILTER [ModernPOS.loadTodaysSales]', { branchIdNum, type: typeof branchIdNum });
      
      const { data: sales, error } = await supabase
        .from('transactions')
        .select('final_total')
        .eq('business_id', profile.business_id)
        .eq('type', 'sell')
        .eq('status', 'final')
        .eq('location_id', branchIdNum) // CRITICAL: Filter by branch (ensure number)
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
        editedPrice: undefined, // No custom price initially
        discountAmount: 0, // No discount initially
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

  // Calculate totals (use edited price if available, apply item discounts)
  // Subtotal BEFORE discount
  const subtotalBeforeDiscount = cart.reduce((sum, item) => {
    const unitPrice = item.editedPrice !== undefined ? item.editedPrice : item.retailPrice;
    const itemSubtotal = unitPrice * item.quantity;
    return sum + itemSubtotal;
  }, 0);
  
  // Total discount from all items
  const totalDiscount = cart.reduce((sum, item) => {
    return sum + (item.discountAmount || 0);
  }, 0);
  
  // Subtotal AFTER discount
  const subtotal = subtotalBeforeDiscount - totalDiscount;
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const handlePayment = async (paymentMethod: 'Cash' | 'Card') => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // CRITICAL: Validate branch selection - cannot create sale for "All Locations"
    if (activeBranch?.id === 'ALL') {
      toast.error('Cannot create sale for "All Locations"', {
        description: 'Please select a specific branch to create a sale.',
        duration: 5000,
      });
      return;
    }

    if (!activeBranchId) {
      toast.error('No branch selected', {
        description: 'Please select a branch first to create a sale.',
        duration: 5000,
      });
      return;
    }

    try {
      setProcessing(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Use active branch ID directly (already validated above)
      const locationId = Number(activeBranchId);

      // Get business_id from profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        throw new Error('Business not found');
      }

      // Generate invoice number
      const invoiceNo = `POS-${Date.now()}`;

      // Calculate totals with edited prices and discounts
      let totalBeforeTax = 0;
      const processedItems = [];

      for (const item of cart) {
        const unitPrice = item.editedPrice !== undefined ? item.editedPrice : item.retailPrice;
        const itemSubtotal = unitPrice * item.quantity;
        const itemDiscount = item.discountAmount || 0;
        const itemTotal = itemSubtotal - itemDiscount;
        
        totalBeforeTax += itemTotal;
        
        processedItems.push({
          product_id: item.productId,
          variation_id: item.variationId,
          quantity: item.quantity,
          unit_id: item.unitId,
          unit_price: unitPrice,
          line_discount_amount: itemDiscount,
          line_total: itemTotal,
        });
      }

      const taxAmount = totalBeforeTax * 0.1;
      const finalTotal = totalBeforeTax + taxAmount;

      // Create transaction directly in Supabase
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          business_id: profile.business_id,
          location_id: locationId,
          type: 'sell',
          status: 'final',
          payment_status: 'paid',
          customer_type: 'retail',
          invoice_no: invoiceNo,
          transaction_date: new Date().toISOString(),
          total_before_tax: totalBeforeTax,
          tax_amount: taxAmount,
          discount_amount: 0, // No global discount
          final_total: finalTotal,
          additional_notes: customerName ? `Customer: ${customerName}` : null,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction error:', transactionError);
        throw new Error(`Failed to create transaction: ${transactionError.message}`);
      }

      // Create transaction sell lines
      const sellLines = processedItems.map(item => ({
        transaction_id: transaction.id,
        product_id: item.product_id,
        variation_id: item.variation_id,
        quantity: item.quantity,
        unit_id: item.unit_id,
        unit_price: item.unit_price,
        line_discount_amount: item.line_discount_amount,
        line_total: item.line_total,
      }));

      const { error: linesError } = await supabase
        .from('transaction_sell_lines')
        .insert(sellLines);

      if (linesError) {
        // Rollback transaction
        await supabase.from('transactions').delete().eq('id', transaction.id);
        console.error('Sell lines error:', linesError);
        throw new Error(`Failed to create sell lines: ${linesError.message}`);
      }

      // Update stock for each item
      for (const item of cart) {
        const variation = products.find(v => v.id === item.variationId);
        if (!variation?.product?.enable_stock) continue;

        // Get unit multiplier for conversion
        const { data: unitData } = await supabase
          .from('units')
          .select('base_unit_id, base_unit_multiplier')
          .eq('id', item.unitId)
          .single();

        let qtyInPieces = item.quantity;
        if (unitData?.base_unit_multiplier) {
          qtyInPieces = item.quantity * parseFloat(unitData.base_unit_multiplier.toString());
        }

        // Get current stock
        const { data: currentStock } = await supabase
          .from('variation_location_details')
          .select('qty_available')
          .eq('variation_id', item.variationId)
          .eq('location_id', locations.id)
          .single();

        if (currentStock) {
          const currentQty = parseFloat(currentStock.qty_available?.toString() || '0');
          const newQty = Math.max(0, currentQty - qtyInPieces);

          // Update stock
          const { error: stockError } = await supabase
            .from('variation_location_details')
            .update({ qty_available: newQty.toString() })
            .eq('variation_id', item.variationId)
            .eq('location_id', locations.id);

          if (stockError) {
            console.error('Stock update error:', stockError);
            // Don't throw - log but continue
          }
        }
      }

      // Create account transaction for the sale
      try {
        const { createAccountTransactionForSale } = await import('@/lib/services/accountingService');
        await createAccountTransactionForSale(
          profile.business_id,
          transaction.id,
          finalTotal,
          paymentMethod === 'Cash' ? 'Cash' : 'Card',
          session.user.id,
          `POS Sale - Invoice ${invoiceNo}`
        );
      } catch (accountingError) {
        console.error('Failed to create accounting entry:', accountingError);
        // Don't fail the sale - just log the error
      }

      toast.success(`${paymentMethod} payment of ${formatCurrency(finalTotal)} processed successfully!`);
      setCart([]);
      setCustomerName('');
      loadTodaysSales();
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
    <div className="fixed inset-0 h-screen w-screen flex flex-col bg-[#111827] z-50">
      {/* Header */}
      <div className="bg-[#111827] border-b border-gray-800 px-6 py-4 flex-shrink-0">
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
                  const price = variation.retail_price;
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

          {/* Cart Items - Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                <ShoppingCart size={64} className="mb-4 opacity-30" />
                <p className="text-lg font-medium">Cart is empty</p>
                <p className="text-sm mt-1">Add products to get started</p>
              </div>
            ) : (
              cart.map(item => {
                const itemStock = stockMap.get(item.variationId) || 0;
                const unitPrice = item.editedPrice !== undefined ? item.editedPrice : item.retailPrice;
                const itemSubtotal = unitPrice * item.quantity;
                const itemDiscount = item.discountAmount || 0;
                const itemTotal = itemSubtotal - itemDiscount;
                
                return (
                  <div
                    key={item.variationId}
                    className="bg-gray-800/50 p-5 rounded-xl border border-gray-700 flex-shrink-0"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-base font-semibold text-white flex-1">{item.name}</h4>
                      <p className="text-base font-bold text-blue-400 ml-3">
                        {formatCurrency(itemTotal)}
                      </p>
                    </div>
                    
                    {/* Clickable Price Display/Edit */}
                    <div className="mb-3">
                      {editingPrice === item.variationId ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          autoFocus
                          value={unitPrice || ''}
                          onBlur={() => setEditingPrice(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingPrice(null);
                            }
                          }}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            setCart(prev => prev.map(cartItem => 
                              cartItem.variationId === item.variationId
                                ? { ...cartItem, editedPrice: newPrice }
                                : cartItem
                            ));
                          }}
                          className="w-full bg-gray-900 border border-blue-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p 
                          onClick={() => setEditingPrice(item.variationId)}
                          className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 transition-colors"
                        >
                          {formatCurrency(unitPrice)} x {item.quantity}
                        </p>
                      )}
                    </div>
                    
                    {/* Clickable Discount Display/Edit */}
                    <div className="mb-4">
                      {editingDiscount === item.variationId ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          autoFocus
                          placeholder="Discount Amount"
                          value={itemDiscount || ''}
                          onBlur={() => setEditingDiscount(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingDiscount(null);
                            }
                          }}
                          onChange={(e) => {
                            const newDiscount = parseFloat(e.target.value) || 0;
                            setCart(prev => prev.map(cartItem => 
                              cartItem.variationId === item.variationId
                                ? { ...cartItem, discountAmount: newDiscount }
                                : cartItem
                            ));
                          }}
                          className="w-full bg-gray-900 border border-blue-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p 
                          onClick={() => setEditingDiscount(item.variationId)}
                          className={cn(
                            "text-xs cursor-pointer transition-colors",
                            itemDiscount > 0 
                              ? "text-orange-400 hover:text-orange-300" 
                              : "text-gray-500 hover:text-gray-400"
                          )}
                        >
                          {itemDiscount > 0 ? `Discount: -${formatCurrency(itemDiscount)}` : 'Click to add discount'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.variationId, -1)}
                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors border border-gray-700 bg-gray-900"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-base font-semibold w-10 text-center text-white">{item.quantity}</span>
                      <button
                        onClick={() => {
                          if (item.quantity + 1 > itemStock) {
                            toast.warning(`Only ${itemStock} items available in stock`);
                          } else {
                            updateQuantity(item.variationId, 1);
                          }
                        }}
                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors border border-gray-700 bg-blue-600 border-blue-500"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Totals & Actions - Fixed at Bottom */}
          <div className="p-6 bg-[#111827] border-t border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-10 flex-shrink-0">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span>
                <span className="text-white font-medium">{formatCurrency(subtotalBeforeDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm text-orange-400">
                <span>Discount</span>
                <span className="font-medium">-{formatCurrency(totalDiscount)}</span>
              </div>
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
