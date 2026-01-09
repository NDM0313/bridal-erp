/**
 * ProductSearchInput Component
 * High-performance, standalone product search with "Add New" fallback
 * Zero flicker, smooth transitions, professional UX
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Force-Mock Data - OUTSIDE component for reference stability
const MOCK_PRODUCTS = [
  { id: 1, name: "Atlas Cotton", sku: "AC-001", stock: 125.50 },
  { id: 2, name: "Premium Lawn", sku: "PL-002", stock: 50.00 },
  { id: 3, name: "Silk Collection", sku: "SC-003", stock: 75.25 },
  { id: 4, name: "Velvet Deluxe", sku: "VD-004", stock: 10.00 },
  { id: 5, name: "Cotton Blend", sku: "CB-005", stock: 200.00 },
];

export type ProductOption = {
  id: number;
  name: string;
  sku: string;
  stock?: number;
};

type SearchStatus = 'idle' | 'searching' | 'success' | 'not-found';

interface ProductSearchInputProps {
  products?: ProductOption[];
  onSelect: (product: ProductOption) => void;
  onAddNew: (productName: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ProductSearchInput({
  products: externalProducts,
  onSelect,
  onAddNew,
  placeholder = 'Type product name or SKU...',
  autoFocus = false,
}: ProductSearchInputProps) {
  // Use external products if provided, otherwise use mock data
  const products = externalProducts && externalProducts.length > 0 ? externalProducts : MOCK_PRODUCTS;
  
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<ProductOption[]>([]);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce logic with 500ms delay
  useEffect(() => {
    if (query === debouncedQuery) {
      setIsDebouncing(false);
      return;
    }
    
    setIsDebouncing(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setIsDebouncing(false);
    }, 500);
    
    return () => clearTimeout(handler);
  }, [query, debouncedQuery]);

  // Hardened Filtering Logic - NO products dependency to prevent flickering
  useEffect(() => {
    const searchTerm = debouncedQuery.trim().toLowerCase();
    
    if (searchTerm.length === 0) {
      setResults([]);
      setStatus('idle');
      return;
    }

    setStatus('searching');
    
    const timer = setTimeout(() => {
      // Search in both Name and SKU
      const filtered = MOCK_PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.sku.toLowerCase().includes(searchTerm)
      );

      console.log(`🔍 Query: "${searchTerm}" | Found: ${filtered.length}`);
      
      setResults(filtered);
      setStatus(filtered.length > 0 ? 'success' : 'not-found');
    }, 150); // Fast response for smoother feel

    return () => clearTimeout(timer);
  }, [debouncedQuery]); // Removed 'products' dependency to stop flickering

  // Icon visibility logic - Red Mark Fix
  const isTyping = isFocused || query.trim().length > 0;

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasAddOption = status === 'not-found';
    const maxIndex = results.length - 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowDropdown(true);
      setSelectedIndex(prev => {
        if (hasAddOption) {
          // Can navigate to "Add New" button (index = results.length)
          return Math.min(prev + 1, results.length);
        }
        return results.length > 0 ? Math.min(prev + 1, maxIndex) : -1;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowDropdown(true);
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      if (hasAddOption && (selectedIndex === results.length || results.length === 0)) {
        // Trigger Add New
        if (debouncedQuery.trim()) {
          onAddNew(debouncedQuery.trim());
          setQuery('');
          setShowDropdown(false);
          setSelectedIndex(-1);
        }
      } else if (selectedIndex >= 0 && results[selectedIndex]) {
        // Select product
        const selected = results[selectedIndex];
        onSelect(selected);
        setQuery('');
        setShowDropdown(false);
        setSelectedIndex(-1);
      } else if (results.length > 0) {
        // Select first product
        onSelect(results[0]);
        setQuery('');
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedIndex(-1);
    setShowDropdown(false);
    setStatus('idle');
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // UI Visibility Lock - Show dropdown for any active status
  const shouldShowDropdown = showDropdown && query.trim() && (status === 'searching' || status === 'success' || status === 'not-found');

  return (
    <div className="relative w-full">
      {/* Icon or Loading Spinner */}
      {isDebouncing ? (
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

      {/* Input Field - Red Mark Fix: Padding shifts smoothly */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
          setSelectedIndex(-1);
        }}
        onFocus={() => {
          setIsFocused(true);
          if (query.trim()) {
            setShowDropdown(true);
          }
        }}
        onBlur={() => {
          setIsFocused(false);
          setTimeout(() => setShowDropdown(false), 200);
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

      {/* Dropdown Results - UI Visibility Lock */}
      {shouldShowDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-[#1E293B] border border-indigo-900/40 rounded-lg max-h-60 overflow-y-auto z-50 shadow-2xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Searching State */}
          {status === 'searching' && (
            <div className="px-4 py-3 text-xs text-gray-300 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-indigo-400" />
              <span>Searching...</span>
            </div>
          )}

          {/* Success State - Show Results */}
          {status === 'success' && results.length > 0 && (
            <>
              {results.slice(0, 5).map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(product);
                    setQuery('');
                    setShowDropdown(false);
                    setSelectedIndex(-1);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 hover:bg-gray-700/50 text-white transition-colors",
                    selectedIndex === index && "bg-gray-700/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white">{product.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>SKU: {product.sku}</span>
                        <span className="text-indigo-400">
                          Stock: {(Number(product.stock || 0)).toFixed(2)}M
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Not Found State - Show Add New (ONLY when status is 'not-found') */}
          {status === 'not-found' && (
            <div className="p-4 space-y-3 bg-[#1E293B]">
              <div className="text-sm text-gray-300 text-center">
                No products found
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onAddNew(debouncedQuery.trim());
                  setQuery('');
                  setShowDropdown(false);
                  setSelectedIndex(-1);
                }}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md",
                  "bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400",
                  "border border-indigo-500/30 transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
                  selectedIndex === results.length && "ring-2 ring-indigo-500/50 bg-indigo-600/30"
                )}
              >
                <PlusCircle size={16} />
                <span className="text-sm font-medium">
                  Add "{debouncedQuery.trim()}" as New Product
                </span>
              </button>
            </div>
          )}

          {/* Idle State (query too short) */}
          {status === 'idle' && debouncedQuery.length > 0 && debouncedQuery.length < 3 && (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">
              Type at least 3 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  );
}
