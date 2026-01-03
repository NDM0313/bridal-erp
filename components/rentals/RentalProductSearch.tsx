'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Tag, CalendarOff, Box, BadgeAlert, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { supabase } from '@/utils/supabase/client';
import { Product } from '@/lib/types/modern-erp';
import { listProducts } from '@/lib/services/productService';

export interface SearchProduct {
  id: string | number;
  name: string;
  sku: string;
  image?: string;
  status: 'available' | 'retail_only' | 'unavailable';
  rentPrice: number | null;
  retailPrice: number;
  unavailableReason?: string;
  category?: string;
  brand?: string;
  securityDeposit?: number | null;
}

interface RentalProductSearchProps {
  onSelect: (product: SearchProduct) => void;
  selectedProduct?: SearchProduct | null;
  onAddProduct?: () => void;
}

export const RentalProductSearch = ({ onSelect, selectedProduct, onAddProduct }: RentalProductSearchProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(selectedProduct?.name || '');
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  // Load products from Supabase
  const loadProducts = useCallback(async (searchTerm?: string) => {
    console.log('Loading products with search:', searchTerm || 'all');
    setLoading(true);
    try {
      // Get current user's business_id
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Business not found');
      }

      console.log('Business ID:', profile.business_id);

      // Fetch ALL active products (like product list/search) - not just rentable
      const productsData = await listProducts({
        is_inactive: false,
        search: searchTerm || undefined,
      });

      console.log('Products loaded:', productsData?.length || 0);

      if (!productsData || productsData.length === 0) {
        console.log('No products found');
        setProducts([]);
        setLoading(false);
        return;
      }

      // Get additional product fields from Supabase
      const productIds = productsData.map(p => p.id);
      const { data: productsWithDetails, error: detailsError } = await supabase
        .from('products')
        .select(`
          id,
          image,
          is_rentable,
          rental_price,
          security_deposit_amount,
          rent_duration_unit
        `)
        .in('id', productIds);

      if (detailsError) {
        console.error('Product details query error:', detailsError);
        // Continue without details
      }

      // Create a map of product details
      const productDetailsMap = new Map();
      if (productsWithDetails) {
        productsWithDetails.forEach((p: any) => {
          productDetailsMap.set(p.id, p);
        });
      }

      // productIds already defined above

      // Fetch variations separately
      const { data: variationsData, error: variationsError } = await supabase
        .from('variations')
        .select('id, product_id, name, sub_sku, retail_price, wholesale_price')
        .in('product_id', productIds);

      if (variationsError) {
        console.error('Variations query error:', variationsError);
        // Continue without variations
      }

      // Get unique category and brand IDs
      const categoryIds = [...new Set(productsData.map(p => p.category_id).filter(Boolean))];
      const brandIds = [...new Set(productsData.map(p => p.brand_id).filter(Boolean))];

      // Fetch categories separately
      let categoriesMap = new Map();
      if (categoryIds.length > 0) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', categoryIds);

        if (!categoriesError && categoriesData) {
          categoriesMap = new Map(categoriesData.map(c => [c.id, c.name]));
        }
      }

      // Fetch brands separately
      let brandsMap = new Map();
      if (brandIds.length > 0) {
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('id, name')
          .in('id', brandIds);

        if (!brandsError && brandsData) {
          brandsMap = new Map(brandsData.map(b => [b.id, b.name]));
        }
      }

      // Group variations by product_id
      const variationsByProduct = new Map<number, any[]>();
      if (variationsData) {
        variationsData.forEach((v: any) => {
          if (!variationsByProduct.has(v.product_id)) {
            variationsByProduct.set(v.product_id, []);
          }
          variationsByProduct.get(v.product_id)!.push(v);
        });
      }

      // Map products to SearchProduct format
      const mappedProducts: SearchProduct[] = productsData.map((product: Product) => {
        const details = productDetailsMap.get(product.id) || {};
        
        let status: SearchProduct['status'] = 'available';
        let unavailableReason: string | undefined;

        if (!details.is_rentable) {
          status = 'retail_only';
          unavailableReason = 'Retail only';
        }

        // Get retail price from first variation if available
        const productVariations = variationsByProduct.get(product.id) || [];
        const firstVariation = productVariations.length > 0 ? productVariations[0] : null;
        const retailPrice = firstVariation?.retail_price || 0;

        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          image: details.image || undefined,
          status,
          unavailableReason,
          rentPrice: details.rental_price || null,
          retailPrice,
          securityDeposit: details.security_deposit_amount || null,
          category: product.category_id ? categoriesMap.get(product.category_id) : undefined,
          brand: product.brand_id ? brandsMap.get(product.brand_id) : undefined,
        };
      });
      
      console.log('Mapped products:', mappedProducts.length);
      setProducts(mappedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error,
      });
      // Fallback to empty array
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load products when dropdown opens or when user types
  useEffect(() => {
    if (open || inputValue.trim()) {
      const searchTerm = inputValue.trim();
      loadProducts(searchTerm || undefined);
    }
  }, [open, inputValue, loadProducts]);

  // Update input when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      setInputValue(selectedProduct.name);
    }
  }, [selectedProduct]);

  const handleSelect = (product: SearchProduct) => {
    if (product.status === 'unavailable') return;
    onSelect(product);
    setOpen(false);
    setInputValue(product.name);
  };

  const filteredProducts = inputValue.trim()
    ? products.filter((p) => {
        const searchTerm = inputValue.toLowerCase().trim();
        // Search in product name, SKU, and variations' sub_sku
        const matchesName = p.name.toLowerCase().includes(searchTerm);
        const matchesSku = p.sku.toLowerCase().includes(searchTerm);
        const matchesCategory = p.category?.toLowerCase().includes(searchTerm);
        const matchesBrand = p.brand?.toLowerCase().includes(searchTerm);
        
        return matchesName || matchesSku || matchesCategory || matchesBrand;
      })
    : products; // Show all products when input is empty

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
      <Input
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true); // Open dropdown when typing
        }}
        placeholder="Search Bridal Dress (Name/SKU)..."
        className="bg-gray-900 border-gray-700 pl-9 text-white focus:border-pink-500 h-9 w-full"
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
      />

      {/* Dropdown */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div 
            className="absolute z-50 left-0 right-0 mt-1 bg-gray-900 border border-gray-800 rounded-lg shadow-xl max-h-96 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-400 text-sm mb-3">No products found</p>
                {onAddProduct && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpen(false);
                      setTimeout(() => {
                        onAddProduct();
                      }, 100);
                    }}
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  >
                    <Plus size={14} className="mr-2" />
                    Add New Product
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-2">
                {filteredProducts.map((product) => {
                  const isUnavailable = product.status === 'unavailable';

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelect(product)}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors mb-1',
                        isUnavailable
                          ? 'opacity-50 cursor-not-allowed hover:bg-transparent'
                          : 'hover:bg-gray-800'
                      )}
                    >
                      {/* Image */}
                      <div className="h-10 w-10 rounded bg-gray-800 overflow-hidden shrink-0 border border-gray-700">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt=""
                            className={cn('h-full w-full object-cover', isUnavailable && 'grayscale')}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-500">
                            <Box size={16} />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4
                            className={cn(
                              'text-sm font-medium text-white truncate',
                              isUnavailable && 'line-through text-gray-400'
                            )}
                          >
                            {product.name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 font-mono">{product.sku}</p>
                      </div>

                      {/* Badges / Status */}
                      <div className="shrink-0">
                        {isUnavailable ? (
                          <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-900/50">
                            {product.unavailableReason || 'Unavailable'}
                          </Badge>
                        ) : product.status === 'retail_only' ? (
                          <Badge variant="outline" className="bg-yellow-900/20 text-yellow-400 border-yellow-900/50">
                            Retail Only
                          </Badge>
                        ) : product.rentPrice ? (
                          <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-900/50">
                            Rs. {product.rentPrice.toLocaleString()}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

