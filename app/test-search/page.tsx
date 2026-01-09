/**
 * Test Page for ProductSearchInput Component
 * Sandbox environment to verify search behavior, transitions, and "Add New" logic
 */

'use client';

import { useState } from 'react';
import { ProductSearchInput, ProductOption } from '@/components/inventory/ProductSearchInput';

// Mock product data for testing
const MOCK_PRODUCTS: ProductOption[] = [
  { id: 1, name: 'Atlas Fabric', sku: 'ATL-001', stock: 125.50 },
  { id: 2, name: 'Silk Premium', sku: 'SLK-002', stock: 45.75 },
  { id: 3, name: 'Cotton Blend', sku: 'CTN-003', stock: 200.00 },
  { id: 4, name: 'Velvet Deluxe', sku: 'VLV-004', stock: 10.25 },
  { id: 5, name: 'Linen Classic', sku: 'LIN-005', stock: 0.00 },
  { id: 6, name: 'Polyester Mix', sku: 'PLY-006', stock: 89.99 },
  { id: 7, name: 'Wool Blend', sku: 'WOL-007', stock: 34.50 },
  { id: 8, name: 'Denim Heavy', sku: 'DNM-008', stock: 156.80 },
];

export default function TestSearchPage() {
  const [lastSelected, setLastSelected] = useState<ProductOption | null>(null);
  const [lastAddNewName, setLastAddNewName] = useState<string>('');
  const [eventLog, setEventLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const handleSelect = (product: ProductOption) => {
    setLastSelected(product);
    addLog(`✅ Selected: ${product.name} (SKU: ${product.sku})`);
  };

  const handleAddNew = (name: string) => {
    setLastAddNewName(name);
    addLog(`➕ Add New triggered: "${name}"`);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            🧪 ProductSearchInput Test Sandbox
          </h1>
          <p className="text-gray-400 text-sm">
            Test the search component in isolation to verify behavior
          </p>
        </div>

        {/* Test Instructions */}
        <div className="bg-[#111827] border border-gray-800 rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold text-white mb-3">🎯 Test Checklist:</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <span className="text-indigo-400 font-mono">1.</span>
              <span>Type slowly and watch the <strong className="text-white">icon fade out</strong> smoothly (opacity-0)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-400 font-mono">2.</span>
              <span>Verify text <strong className="text-white">slides left</strong> (pl-10 → pl-3) with no overlap</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-400 font-mono">3.</span>
              <span>Type "xyz" (non-existent) and wait <strong className="text-white">500ms</strong> - "Add New" should appear</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-400 font-mono">4.</span>
              <span>Type "at" and verify "Atlas" shows up in dropdown</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-400 font-mono">5.</span>
              <span>Check all stock numbers show <strong className="text-white">exactly 2 decimals</strong> (e.g., 125.50M)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-400 font-mono">6.</span>
              <span>Use <strong className="text-white">Arrow keys</strong> to navigate, <strong className="text-white">Enter</strong> to select</span>
            </div>
          </div>
        </div>

        {/* Search Component */}
        <div className="bg-[#111827] border border-gray-800 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Search Component</h2>
          <ProductSearchInput
            products={MOCK_PRODUCTS}
            onSelect={handleSelect}
            onAddNew={handleAddNew}
            autoFocus={true}
          />
        </div>

        {/* Debug Output */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Last Selected */}
          <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Last Selected Product</h3>
            {lastSelected ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white font-medium">{lastSelected.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">SKU:</span>
                  <span className="text-indigo-400">{lastSelected.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Stock:</span>
                  <span className="text-emerald-400">{(lastSelected.stock || 0).toFixed(2)}M</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <pre className="text-xs text-gray-500 overflow-x-auto">
                    {JSON.stringify(lastSelected, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm text-center py-4">
                No product selected yet
              </div>
            )}
          </div>

          {/* Last Add New */}
          <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Add New Triggered</h3>
            {lastAddNewName ? (
              <div className="space-y-2">
                <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-lg p-3">
                  <div className="text-indigo-400 font-medium text-sm mb-1">Product Name:</div>
                  <div className="text-white text-lg">"{lastAddNewName}"</div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  This would open the Add Product modal with the name pre-filled
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm text-center py-4">
                No "Add New" triggered yet
              </div>
            )}
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Event Log (Last 10)</h3>
          {eventLog.length > 0 ? (
            <div className="space-y-1 font-mono text-xs">
              {eventLog.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    "px-2 py-1 rounded",
                    log.includes('✅') ? "text-emerald-400 bg-emerald-500/5" : "text-indigo-400 bg-indigo-500/5"
                  )}
                >
                  {log}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm text-center py-4">
              No events yet. Start searching!
            </div>
          )}
        </div>

        {/* Available Products Reference */}
        <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Available Products (Mock Data)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {MOCK_PRODUCTS.map((product) => (
              <div
                key={product.id}
                className="bg-[#0B0F1A] border border-gray-800 rounded px-3 py-2 text-xs"
              >
                <div className="text-white font-medium">{product.name}</div>
                <div className="text-gray-400 mt-0.5">
                  SKU: {product.sku} • Stock: {product.stock.toFixed(2)}M
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

