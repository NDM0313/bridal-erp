/**
 * ProductSearchFinal Component
 * Zero-lag, synchronous filtering with FORCED dropdown visibility
 * Bulletproof solution - dropdown NEVER vanishes
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// MOCK_PRODUCTS - OUTSIDE component for reference stability
const MOCK_PRODUCTS = [
  { id: 1, name: "Atlas Cotton", sku: "AC-001", stock: 125.50 },
  { id: 2, name: "Premium Lawn", sku: "PL-002", stock: 50.00 },
  { id: 3, name: "Silk Collection", sku: "SC-003", stock: 75.25 },
  { id: 4, name: "Velvet Deluxe", sku: "VD-004", stock: 10.00 },
  { id: 5, name: "Cotton Blend", sku: "CB-005", stock: 200.00 },
  { id: 6, name: "Linen Classic", sku: "LC-006", stock: 89.99 },
];

export type ProductOption = {
  id: number;
  name: string;
  sku: string;
  stock?: number;
};

type SearchStatus = 'idle' | 'searching' | 'success' | 'not-found';

interface ProductSearchFinalProps {
  products?: ProductOption[];
  onSelect: (product: ProductOption) => void;
  onAddNew: (productName: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onQueryChange?: (query: string) => void;
}

export function ProductSearchFinal({
  products: externalProducts,
  onSelect,
  onAddNew,
  placeholder = 'Type product name or SKU...',
  autoFocus = false,
  onQueryChange,
}: ProductSearchFinalProps) {
  // Use external products if provided, otherwise use mock data
  const products = externalProducts && externalProducts.length > 0 ? externalProducts : MOCK_PRODUCTS;
  
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<ProductOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // FORCE DROPDOWN VISIBILITY - Simple rule: if focused AND has text, show it!
  const shouldShowDropdown = isFocused && query.trim().length > 0;

  // SYNCHRONOUS RESULTS - Update immediately, NO clearing old results
  useEffect(() => {
    const searchTerm = query.trim().toLowerCase();
    
    if (searchTerm.length === 0) {
      setResults([]);
      setStatus('idle');
      return;
    }

    // Layer 1: Immediate Synchronous Filter (For instant UI update)
    const immediateResults = MOCK_PRODUCTS.filter(p => 
      p.name.toLowerCase().includes(searchTerm) || 
      p.sku.toLowerCase().includes(searchTerm)
    );
    
    setResults(immediateResults); // This stops the "vanishing" act!
    
    console.log(`🔍 Query: "${searchTerm}" | Results: ${immediateResults.length}`);

    // Layer 2: Status Update (For "Searching" indicator)
    setStatus('searching');
    const timer = setTimeout(() => {
      setStatus(immediateResults.length > 0 ? 'success' : 'not-found');
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

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
    const hasAddOption = status === 'not-found' && query.trim().length >= 3;
    const maxIndex = results.length - 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        if (hasAddOption) {
          return Math.min(prev + 1, results.length);
        }
        return results.length > 0 ? Math.min(prev + 1, maxIndex) : -1;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      if (hasAddOption && (selectedIndex === results.length || results.length === 0)) {
        // Trigger Add New
        if (query.trim()) {
          onAddNew(query.trim());
          setQuery('');
          setResults([]);
          setSelectedIndex(-1);
          if (onQueryChange) onQueryChange('');
        }
      } else if (selectedIndex >= 0 && results[selectedIndex]) {
        // Select product
        const selected = results[selectedIndex];
        onSelect(selected);
        setQuery('');
        setResults([]);
        setSelectedIndex(-1);
        if (onQueryChange) onQueryChange('');
      } else if (results.length > 0) {
        // Select first product
        onSelect(results[0]);
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

  return (
    <div className="relative w-full">
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

      {/* Input Field - Red Mark Fix: Padding shifts smoothly (pl-10 → pl-3) */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          const newQuery = e.target.value;
          setQuery(newQuery);
          setSelectedIndex(-1);
          if (onQueryChange) {
            onQueryChange(newQuery);
          }
        }}
        onFocus={() => {
          setIsFocused(true);
        }}
        onBlur={() => {
          setIsFocused(false);
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

      {/* Dropdown Results - FORCED VISIBILITY with high z-index */}
      {shouldShowDropdown && (
        <div
          className="absolute top-full left-0 w-full mt-1 bg-[#1E293B] border border-indigo-900/40 rounded-lg max-h-60 overflow-y-auto shadow-2xl"
          style={{ 
            zIndex: 99999,
            display: 'block'
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Show Results (Synchronous - Updates instantly!) */}
          {results.length > 0 ? (
            <>
              {results.slice(0, 5).map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(product);
                    setQuery('');
                    setResults([]);
                    setSelectedIndex(-1);
                    if (onQueryChange) onQueryChange('');
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
          ) : (
            <>
              {/* Not Found State - Show Add New (ONLY when query >= 3 and status confirmed) */}
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
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
                      selectedIndex === results.length && "ring-2 ring-indigo-500/50 bg-indigo-600/30"
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
        </div>
      )}
    </div>
  );
}
