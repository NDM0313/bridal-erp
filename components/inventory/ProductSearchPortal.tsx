/**
 * ProductSearchPortal Component
 * NUCLEAR OPTION: Uses React Portal to escape any z-index/overflow issues
 * Renders dropdown at document.body level for guaranteed visibility
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Loader2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// MOCK_PRODUCTS - OUTSIDE component with more "at" matches
const MOCK_PRODUCTS = [
  { id: 1, name: "Atlas Cotton", sku: "AC-001", stock: 125.50 },
  { id: 2, name: "Atlas Silk", sku: "AS-002", stock: 50.00 },
  { id: 3, name: "Atlas Thread", sku: "AT-003", stock: 75.25 },
  { id: 4, name: "Premium Lawn", sku: "PL-004", stock: 200.00 },
  { id: 5, name: "Silk Collection", sku: "SC-005", stock: 89.99 },
  { id: 6, name: "Velvet Deluxe", sku: "VD-006", stock: 10.00 },
  { id: 7, name: "Cotton Blend", sku: "CB-007", stock: 150.00 },
  { id: 8, name: "Linen Classic", sku: "LC-008", stock: 45.50 },
];

export type ProductOption = {
  id: number;
  name: string;
  sku: string;
  stock?: number;
  variations?: VariationOption[];
};

export type VariationOption = {
  id: number;
  product_id: number;
  variation_name: string;
  variation_sku?: string;
  stock?: number;
  price?: number;
};

type SearchResultItem = {
  type: 'product' | 'variation';
  product: ProductOption;
  variation?: VariationOption;
  displayName: string;
  displaySku: string;
  stock: number;
};

type SearchStatus = 'idle' | 'searching' | 'success' | 'not-found';

interface ProductSearchPortalProps {
  products?: ProductOption[];
  onSelect: (product: ProductOption & { variation_id?: number; variation_name?: string }) => void;
  onAddNew: (productName: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onQueryChange?: (query: string) => void;
  fetchVariations?: (productId: number) => Promise<VariationOption[]>;
}

export function ProductSearchPortal({
  products: externalProducts,
  onSelect,
  onAddNew,
  placeholder = 'Type product name or SKU...',
  autoFocus = false,
  onQueryChange,
  fetchVariations,
}: ProductSearchPortalProps) {
  const products = externalProducts && externalProducts.length > 0 ? externalProducts : MOCK_PRODUCTS;
  
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [productVariations, setProductVariations] = useState<Map<number, VariationOption[]>>(new Map());
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch variations for a product (if fetchVariations prop is provided)
  const loadVariations = async (productId: number) => {
    if (!fetchVariations || productVariations.has(productId)) return;
    
    try {
      const variations = await fetchVariations(productId);
      setProductVariations(prev => new Map(prev).set(productId, variations));
    } catch (error) {
      console.error('Failed to load variations:', error);
    }
  };

  // SYNCHRONOUS FILTERING - Filter INSTANTLY on every keystroke inside onChange
  const handleQueryChange = async (newQuery: string) => {
    setQuery(newQuery);
    setSelectedIndex(-1);
    
    if (onQueryChange) {
      onQueryChange(newQuery);
    }

    // INSTANT FILTER - No waiting!
    const searchTerm = newQuery.trim().toLowerCase();
    if (searchTerm.length === 0) {
      setResults([]);
      setStatus('idle');
      return;
    }

    // Filter products immediately (use the products prop or MOCK_PRODUCTS)
    const productsToSearch = products.length > 0 ? products : MOCK_PRODUCTS;
    const matchedProducts = productsToSearch.filter(p => 
      p.name.toLowerCase().includes(searchTerm) || 
      p.sku.toLowerCase().includes(searchTerm)
    );
    
    // Expand products with variations into separate result items
    const expandedResults: SearchResultItem[] = [];
    
    for (const product of matchedProducts) {
      // Check if product has variations (either pre-loaded or need to fetch)
      const variations = product.variations || productVariations.get(product.id) || [];
      
      if (variations.length > 0) {
        // Add each variation as a separate result item
        for (const variation of variations) {
          // Also filter variations by name/SKU
          const variationMatch = 
            variation.variation_name?.toLowerCase().includes(searchTerm) ||
            variation.variation_sku?.toLowerCase().includes(searchTerm);
          
          if (variationMatch || product.name.toLowerCase().includes(searchTerm) || product.sku.toLowerCase().includes(searchTerm)) {
            expandedResults.push({
              type: 'variation',
              product,
              variation,
              displayName: `${product.name} - ${variation.variation_name}`,
              displaySku: variation.variation_sku || product.sku,
              stock: variation.stock || product.stock || 0,
            });
          }
        }
      } else {
        // No variations - add product as-is
        expandedResults.push({
          type: 'product',
          product,
          displayName: product.name,
          displaySku: product.sku,
          stock: product.stock || 0,
        });
        
        // If fetchVariations is provided, try to load variations in background
        if (fetchVariations) {
          loadVariations(product.id);
        }
      }
    }
    
    setResults(expandedResults);
    console.log(`🔍 Portal Query: "${searchTerm}" | Products: ${matchedProducts.length} | Expanded Results: ${expandedResults.length}`);
    
    // Update status with slight delay
    setStatus('searching');
    setTimeout(() => {
      setStatus(expandedResults.length > 0 ? 'success' : 'not-found');
    }, 150);
  };

  // Update dropdown position when input moves or resizes - ULTRA SMOOTH with RAF
  useEffect(() => {
    if (!isFocused || !inputRef.current) return;

    let rafId: number | null = null;

    const updatePosition = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4, // Use viewport position, not scroll offset
          left: rect.left,
          width: rect.width,
        });
      }
    };

    // Smooth position update using requestAnimationFrame
    const smoothUpdatePosition = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        updatePosition();
        rafId = null;
      });
    };

    // Initial position
    updatePosition();

    // Listen to scroll (capture phase for better performance) and resize
    window.addEventListener('scroll', smoothUpdatePosition, { capture: true, passive: true });
    window.addEventListener('resize', smoothUpdatePosition, { passive: true });

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', smoothUpdatePosition, { capture: true });
      window.removeEventListener('resize', smoothUpdatePosition);
    };
  }, [isFocused, query]);

  // Icon visibility logic - Red Mark Fix
  const isTyping = isFocused || query.trim().length > 0;

  // Re-filter when variations are loaded (trigger re-search)
  useEffect(() => {
    if (query.trim().length > 0 && productVariations.size > 0) {
      // Trigger re-filter by calling handleQueryChange
      const currentQuery = query;
      handleQueryChange(currentQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productVariations]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasAddOption = status === 'not-found' && query.trim().length >= 3;
    const maxIndex = results.length - 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        if (hasAddOption) return Math.min(prev + 1, results.length);
        return results.length > 0 ? Math.min(prev + 1, maxIndex) : -1;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      if (hasAddOption && (selectedIndex === results.length || results.length === 0)) {
        onAddNew(query.trim());
        setQuery('');
        setResults([]);
        setSelectedIndex(-1);
        if (onQueryChange) onQueryChange('');
      } else if (selectedIndex >= 0 && results[selectedIndex]) {
        const selected = results[selectedIndex];
        // Pass variation data if it's a variation
        onSelect({
          ...selected.product,
          variation_id: selected.variation?.id,
          variation_name: selected.variation?.variation_name,
        });
        setQuery('');
        setResults([]);
        setSelectedIndex(-1);
        if (onQueryChange) onQueryChange('');
      } else if (results.length > 0) {
        const first = results[0];
        onSelect({
          ...first.product,
          variation_id: first.variation?.id,
          variation_name: first.variation?.variation_name,
        });
        setQuery('');
        setResults([]);
        setSelectedIndex(-1);
        if (onQueryChange) onQueryChange('');
      }
    } else if (e.key === 'Escape') {
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    setStatus('idle');
    if (onQueryChange) onQueryChange('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Force dropdown visibility when focused and has text
  const shouldShowDropdown = isFocused && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Icon or Loading Spinner */}
      {status === 'searching' ? (
        <Loader2
          className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin z-10"
          size={16}
        />
      ) : (
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-all duration-300 ease-in-out z-10",
            isTyping ? "opacity-0 -translate-x-2 pointer-events-none" : "opacity-100"
          )}
          size={18}
        />
      )}

      {/* Input Field - Red Mark Fix */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setTimeout(() => setIsFocused(false), 200);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full h-10 rounded-md bg-[#0F172A] border border-gray-800 text-white pr-10 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50",
          isTyping ? "pl-3" : "pl-10"
        )}
      />

      {/* Clear Button */}
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all duration-200 ease-in-out z-10"
        >
          <X size={16} />
        </button>
      )}

      {/* PORTAL DROPDOWN - Rendered at document.body for nuclear visibility */}
      {shouldShowDropdown && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed bg-[#1E293B] border border-indigo-900/40 rounded-lg max-h-60 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 999999,
            boxShadow: '0 10px 40px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.1)',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Show Results (Synchronous) */}
          {results.length > 0 ? (
            <>
              {results.slice(0, 10).map((item, index) => (
                <button
                  key={`${item.product.id}-${item.variation?.id || 'base'}-${index}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect({
                      ...item.product,
                      variation_id: item.variation?.id,
                      variation_name: item.variation?.variation_name,
                    });
                    setQuery('');
                    setResults([]);
                    setSelectedIndex(-1);
                    if (onQueryChange) onQueryChange('');
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 hover:bg-gray-700/50 text-white transition-colors",
                    selectedIndex === index && "bg-gray-700/50",
                    item.type === 'variation' && "pl-6 border-l-2 border-indigo-500/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {item.type === 'variation' && (
                          <span className="text-indigo-400 text-xs">↳</span>
                        )}
                        <div className="font-medium text-white">{item.displayName}</div>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>SKU: {item.displaySku}</span>
                        <span className="text-indigo-400">
                          Stock: {parseFloat(String(item.stock || 0)).toFixed(2)}M
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          ) : (
            <>
              {/* Add New Button - Only when confirmed not-found */}
              {query.trim().length >= 3 && status === 'not-found' ? (
                <div className="p-4 space-y-3 bg-[#1E293B]">
                  <div className="text-sm text-gray-300 text-center">
                    No products found
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onAddNew(query.trim());
                      setQuery('');
                      setResults([]);
                      setSelectedIndex(-1);
                      if (onQueryChange) onQueryChange('');
                    }}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md",
                      "bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400",
                      "border border-indigo-500/30 transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    )}
                  >
                    <PlusCircle size={16} />
                    <span className="text-sm font-medium">
                      Add "{query.trim()}" as New Product
                    </span>
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 text-xs text-gray-400 text-center">
                  {query.trim().length < 3 ? 'Type at least 3 characters...' : 'Searching...'}
                </div>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

