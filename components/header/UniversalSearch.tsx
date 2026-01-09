/**
 * Universal Search Component
 * Global search for Products, Invoices, Customers, Suppliers
 * Features:
 * - Real-time search across multiple entities
 * - Icon auto-hide (Red Mark)
 * - Portal-based results (no clipping)
 * - Keyboard navigation
 * - Direct navigation to entity pages
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, FileText, Users, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { isDemoMode } from '@/lib/config/demoConfig';
import { QuickViewModal } from './QuickViewModal';
import { toast } from 'sonner';

interface SearchResult {
  id: number;
  type: 'product' | 'invoice' | 'customer' | 'supplier';
  title: string;
  subtitle: string;
  url: string;
}

// ZERO-ERROR: Local constant array for instant search (no API delay)
const INSTANT_SEARCH_DATA: SearchResult[] = [
  // Products
  { id: 1, type: 'product', title: 'Atlas Cotton', subtitle: 'SKU: AC-001 | Stock: 125.50M', url: '/inventory?sku=AC-001' },
  { id: 2, type: 'product', title: 'Atlas Silk', subtitle: 'SKU: AS-002 | Stock: 85.00M', url: '/inventory?sku=AS-002' },
  { id: 3, type: 'product', title: 'Atlas Thread', subtitle: 'SKU: AT-003 | Stock: 200.25M', url: '/inventory?sku=AT-003' },
  { id: 4, type: 'product', title: 'Premium Lawn', subtitle: 'SKU: PL-001 | Stock: 50.00M', url: '/inventory?sku=PL-001' },
  { id: 5, type: 'product', title: 'Premium Silk', subtitle: 'SKU: PS-002 | Stock: 75.50M', url: '/inventory?sku=PS-002' },
  { id: 6, type: 'product', title: 'Silk Collection', subtitle: 'SKU: SC-001 | Stock: 95.75M', url: '/inventory?sku=SC-001' },
  { id: 7, type: 'product', title: 'Cotton Blend', subtitle: 'SKU: CB-001 | Stock: 150.00M', url: '/inventory?sku=CB-001' },
  { id: 8, type: 'product', title: 'Cotton Premium', subtitle: 'SKU: CP-002 | Stock: 110.25M', url: '/inventory?sku=CP-002' },
  
  // Invoices
  { id: 101, type: 'invoice', title: 'Invoice #INV-001', subtitle: 'Customer: John Doe | $1,250.00', url: '/sales/invoice/101' },
  { id: 102, type: 'invoice', title: 'Invoice #INV-002', subtitle: 'Customer: Jane Smith | $2,500.00', url: '/sales/invoice/102' },
  { id: 103, type: 'invoice', title: 'Invoice #INV-003', subtitle: 'Customer: Ahmed Ali | $3,750.00', url: '/sales/invoice/103' },
  
  // Customers
  { id: 201, type: 'customer', title: 'John Doe', subtitle: 'Customer | Balance: $500.00', url: '/contacts/customers/201' },
  { id: 202, type: 'customer', title: 'Jane Smith', subtitle: 'Customer | Balance: $1,200.00', url: '/contacts/customers/202' },
  { id: 203, type: 'customer', title: 'Ahmed Ali', subtitle: 'Customer | Balance: $750.00', url: '/contacts/customers/203' },
  { id: 204, type: 'customer', title: 'Sara Khan', subtitle: 'Customer | Balance: $300.00', url: '/contacts/customers/204' },
  
  // Suppliers
  { id: 301, type: 'supplier', title: 'ABC Textiles', subtitle: 'Supplier | Balance: $5,000.00', url: '/contacts/suppliers/301' },
  { id: 302, type: 'supplier', title: 'XYZ Fabrics', subtitle: 'Supplier | Balance: $3,500.00', url: '/contacts/suppliers/302' },
  { id: 303, type: 'supplier', title: 'Premium Suppliers', subtitle: 'Supplier | Balance: $2,750.00', url: '/contacts/suppliers/303' },
];

export function UniversalSearch() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [showQuickView, setShowQuickView] = useState(false);
  const [quickViewData, setQuickViewData] = useState<any>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Update dropdown position
  useEffect(() => {
    if (isFocused && query.length > 0 && wrapperRef.current) {
      const updatePosition = () => {
        const rect = wrapperRef.current!.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      };

      updatePosition();
      const interval = setInterval(updatePosition, 100);

      return () => clearInterval(interval);
    }
  }, [isFocused, query]);

  // Close on outside click (WITH DELAY to prevent vanishing on result click)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        // STICKY FIX: Delay closing to allow result clicks to register
        setTimeout(() => {
          setIsFocused(false);
        }, 250);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ZERO-ERROR: Synchronous search with instant results (NO debounce for first character)
  useEffect(() => {
    const searchTerm = query.trim().toLowerCase();
    
    if (searchTerm.length === 0) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // INSTANT: Show results immediately from local data
    const instantResults = INSTANT_SEARCH_DATA.filter(item =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.subtitle.toLowerCase().includes(searchTerm)
    );
    
    setResults(instantResults);
    setIsSearching(false);
    
    console.log(`🔍 Instant search for "${searchTerm}": ${instantResults.length} results`);

    // OPTIONAL: Async API call for additional results (if needed)
    if (searchTerm.length >= 2 && !isDemoMode()) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        await performSearch(searchTerm);
        setIsSearching(false);
      }, 500); // Only for API results, local results already shown

      return () => clearTimeout(timer);
    }
  }, [query]);

  const performSearch = async (searchTerm: string) => {
    try {
      const searchResults: SearchResult[] = [];

      // Demo mode: Use mock data
      if (isDemoMode()) {
        const mockResults: SearchResult[] = [
          {
            id: 1,
            type: 'product',
            title: 'Atlas Cotton',
            subtitle: 'SKU: AC-001 | Stock: 125.50M',
            url: '/inventory?sku=AC-001',
          },
          {
            id: 101,
            type: 'product',
            title: 'Premium Lawn',
            subtitle: 'SKU: PL-002 | Stock: 50.00M',
            url: '/inventory?sku=PL-002',
          },
          {
            id: 201,
            type: 'product',
            title: 'Silk Collection',
            subtitle: 'SKU: SC-003 | Stock: 75.25M',
            url: '/inventory?sku=SC-003',
          },
          {
            id: 2,
            type: 'invoice',
            title: 'Invoice #INV-001',
            subtitle: 'Customer: John Doe | $1,250.00',
            url: '/sales/invoice/1',
          },
          {
            id: 3,
            type: 'customer',
            title: 'John Doe',
            subtitle: 'Customer | Balance: 500.00',
            url: '/contacts/customers/3',
          },
          {
            id: 4,
            type: 'supplier',
            title: 'ABC Suppliers',
            subtitle: 'Supplier | Balance: 1,250.00',
            url: '/contacts/suppliers/4',
          },
        ];

        const filtered = mockResults.filter(r =>
          r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setResults(filtered);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResults([]);
        return;
      }

      // Get business_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        setResults([]);
        return;
      }

      // Search Products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, sku, stock')
        .eq('business_id', profile.business_id)
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .limit(5);

      if (products) {
        products.forEach(p => {
          searchResults.push({
            id: p.id,
            type: 'product',
            title: p.name,
            subtitle: `SKU: ${p.sku} | Stock: ${(p.stock || 0).toFixed(2)}M`,
            url: `/inventory?sku=${encodeURIComponent(p.sku)}`,
          });
        });
      }

      // Search Customers
      const { data: customers } = await supabase
        .from('contacts')
        .select('id, name, type, balance')
        .eq('business_id', profile.business_id)
        .eq('type', 'customer')
        .ilike('name', `%${searchTerm}%`)
        .limit(5);

      if (customers) {
        customers.forEach(c => {
          searchResults.push({
            id: c.id,
            type: 'customer',
            title: c.name,
            subtitle: `Customer | Balance: $${(c.balance || 0).toFixed(2)}`,
            url: `/contacts/customers/${c.id}`,
          });
        });
      }

      // Search Suppliers
      const { data: suppliers } = await supabase
        .from('contacts')
        .select('id, name, type, balance')
        .eq('business_id', profile.business_id)
        .eq('type', 'supplier')
        .ilike('name', `%${searchTerm}%`)
        .limit(5);

      if (suppliers) {
        suppliers.forEach(s => {
          searchResults.push({
            id: s.id,
            type: 'supplier',
            title: s.name,
            subtitle: `Supplier | Balance: $${(s.balance || 0).toFixed(2)}`,
            url: `/contacts/suppliers/${s.id}`,
          });
        });
      }

      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectResult(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    console.log('🔍 Search result selected:', result.type, result.title);
    
    // Demo mode: Show quick view modal
    if (isDemoMode() && result.id < 1000) {
      console.log('📋 Demo Mode: Showing Quick View');
      
      // Prepare quick view data
      const details: Record<string, string> = {};
      
      if (result.type === 'product') {
        const sku = result.subtitle.match(/SKU: ([^\s|]+)/)?.[1] || '';
        const stock = result.subtitle.match(/Stock: ([^\s]+)/)?.[1] || '0';
        details['SKU'] = sku;
        details['Stock'] = stock;
        details['Price'] = '$25.00';
        details['Category'] = 'Fabric';
        details['Supplier'] = 'ABC Textiles';
      } else if (result.type === 'invoice') {
        details['Invoice Number'] = result.title;
        details['Date'] = new Date().toLocaleDateString();
        details['Amount'] = result.subtitle.match(/\$[\d,.]+/)?.[0] || '$0';
        details['Status'] = 'Paid';
      } else if (result.type === 'customer') {
        details['Type'] = 'Customer';
        details['Balance'] = result.subtitle.match(/\$[\d,.]+/)?.[0] || '$0';
        details['Phone'] = '+92 300 1234567';
        details['Email'] = 'demo@customer.com';
      } else if (result.type === 'supplier') {
        details['Type'] = 'Supplier';
        details['Balance'] = result.subtitle.match(/\$[\d,.]+/)?.[0] || '$0';
        details['Phone'] = '+92 300 7654321';
        details['Email'] = 'demo@supplier.com';
      }
      
      setQuickViewData({
        type: result.type,
        title: result.title,
        subtitle: result.subtitle,
        details,
      });
      setShowQuickView(true);
      
      setQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
      return;
    }
    
    // Map result types to correct URLs
    let navigationUrl = result.url;
    
    if (result.type === 'product') {
      // Navigate to inventory with SKU filter
      const sku = result.subtitle.match(/SKU: ([^\s|]+)/)?.[1] || '';
      navigationUrl = `/inventory?sku=${encodeURIComponent(sku)}`;
    } else if (result.type === 'customer') {
      navigationUrl = `/contacts/customers/${result.id}`;
    } else if (result.type === 'supplier') {
      navigationUrl = `/contacts/suppliers/${result.id}`;
    } else if (result.type === 'invoice') {
      navigationUrl = `/sales/invoice/${result.id}`;
    }
    
    console.log('➡️ Navigating to:', navigationUrl);
    
    // Show loading toast
    toast.loading('Navigating...');
    
    // Navigate
    router.push(navigationUrl);
    
    // Clear search
    setTimeout(() => {
      setQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
      toast.dismiss();
    }, 500);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <Package size={16} className="text-blue-400" />;
      case 'invoice':
        return <FileText size={16} className="text-green-400" />;
      case 'customer':
        return <Users size={16} className="text-purple-400" />;
      case 'supplier':
        return <TrendingUp size={16} className="text-orange-400" />;
      default:
        return <Search size={16} className="text-slate-400" />;
    }
  };

  const shouldShowDropdown = isFocused && query.trim().length >= 2 && (results.length > 0 || isSearching);

  return (
    <>
      <div ref={wrapperRef} className="relative flex-1 max-w-md">
        {/* Search Icon with Auto-Hide */}
        <Search
          size={18}
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none',
            'transition-opacity duration-300',
            (isFocused || query.length > 0) ? 'opacity-0' : 'opacity-100'
          )}
        />

        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products, invoices, customers..."
          className={cn(
            'w-full bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            'transition-all duration-300 placeholder:text-slate-500',
            (isFocused || query.length > 0) ? 'pl-3 pr-10' : 'pl-10 pr-10',
            'py-2'
          )}
        />

        {/* Loading Spinner */}
        {isSearching && (
          <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />
        )}
      </div>

      {/* Portal Results Dropdown */}
      {shouldShowDropdown && typeof window !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 99999,
          }}
          className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="max-h-80 overflow-y-auto">
            {isSearching ? (
              <div className="px-4 py-8 text-center">
                <Loader2 size={24} className="mx-auto text-indigo-400 animate-spin mb-2" />
                <span className="text-sm text-slate-400">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelectResult(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left',
                    selectedIndex === index ? 'bg-slate-800' : ''
                  )}
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {result.title}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {result.subtitle}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                No results found for "{query}"
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

