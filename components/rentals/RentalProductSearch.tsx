'use client';

import React, { useState, useEffect } from 'react';
import { Search, Tag, CalendarOff, Box, BadgeAlert } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import apiClient, { ApiResponse } from '@/lib/api/apiClient';
import { Product } from '@/lib/types/modern-erp';

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
}

export const RentalProductSearch = ({ onSelect, selectedProduct }: RentalProductSearchProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(selectedProduct?.name || '');
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Load rentable products from API
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<ApiResponse<Product[]>>('/rentals/products');
        if (response.data?.data) {
          // Map products to SearchProduct format
          const mappedProducts: SearchProduct[] = response.data.data.map((product) => {
            let status: SearchProduct['status'] = 'available';
            let unavailableReason: string | undefined;

            if (!product.is_rentable) {
              status = 'retail_only';
              unavailableReason = 'Retail only';
            }

            return {
              id: product.id,
              name: product.name,
              sku: product.sku,
              image: product.image,
              status,
              unavailableReason,
              rentPrice: product.rental_price || null,
              retailPrice: 0, // Will need to get from variations
              securityDeposit: product.security_deposit_amount || null,
            };
          });
          setProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
        // Fallback to empty array
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadProducts();
    }
  }, [open]);

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

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      p.sku.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
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
          <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg shadow-xl max-h-96 overflow-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No products found</div>
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

