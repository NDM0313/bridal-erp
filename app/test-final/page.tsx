/**
 * Final Test Page - Side-by-Side Comparison
 * ProductSearchFinal vs ProductSearchPortal
 */

'use client';

import { useState } from 'react';
import { ProductSearchFinal, ProductOption } from '@/components/inventory/ProductSearchFinal';
import { ProductSearchPortal } from '@/components/inventory/ProductSearchPortal';
import { Check, AlertCircle, Zap, Rocket } from 'lucide-react';

// Mock products for reference
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

export default function TestFinalPage() {
  // State for ProductSearchFinal (Standard)
  const [queryStandard, setQueryStandard] = useState<string>('');
  const [selectedStandard, setSelectedStandard] = useState<ProductOption | null>(null);
  const [addNewStandard, setAddNewStandard] = useState<string>('');
  
  // State for ProductSearchPortal (Nuclear)
  const [queryPortal, setQueryPortal] = useState<string>('');
  const [selectedPortal, setSelectedPortal] = useState<ProductOption | null>(null);
  const [addNewPortal, setAddNewPortal] = useState<string>('');
  
  // Shared event log
  const [eventLog, setEventLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 14)]);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold text-white">
            🚀 Search Component Comparison
          </h1>
          <p className="text-gray-400">
            Side-by-side test: Standard vs Portal (Nuclear Option)
          </p>
        </div>

        {/* Critical Test Instructions */}
        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-indigo-300 mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            🎯 Critical "at" Bug Test:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-[#0F172A] border border-indigo-500/20 rounded-lg p-4">
              <div className="text-white font-semibold mb-2">Step 1: Type "a"</div>
              <div className="text-gray-400 text-xs">Should show 3 Atlas products</div>
            </div>
            <div className="bg-[#0F172A] border border-indigo-500/20 rounded-lg p-4">
              <div className="text-white font-semibold mb-2">Step 2: Type "at"</div>
              <div className="text-gray-400 text-xs">Atlas products should STAY visible</div>
            </div>
            <div className="bg-[#0F172A] border border-indigo-500/20 rounded-lg p-4">
              <div className="text-white font-semibold mb-2">Step 3: Type "atl"</div>
              <div className="text-gray-400 text-xs">All 3 Atlas should STILL be there</div>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Standard Version */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-300 mb-2 flex items-center gap-2">
                <Zap size={20} />
                Standard Version
              </h2>
              <p className="text-xs text-gray-400">Absolute positioned dropdown</p>
            </div>
            
            <div className="bg-[#111827] border border-gray-800 rounded-lg p-6">
              <ProductSearchFinal
                onSelect={(product) => {
                  setSelectedStandard(product);
                  addLog(`✅ Standard: Selected ${product.name}`);
                }}
                onAddNew={(name) => {
                  setAddNewStandard(name);
                  addLog(`➕ Standard: Add New "${name}"`);
                }}
                onQueryChange={setQueryStandard}
                autoFocus={false}
              />
            </div>

            {/* Standard Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111827] border border-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Query</div>
                <div className="text-indigo-400 font-mono text-sm">"{queryStandard}"</div>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Selected</div>
                <div className="text-white text-sm truncate">{selectedStandard?.name || 'None'}</div>
              </div>
            </div>
            {addNewStandard && (
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3">
                <div className="text-xs text-indigo-400 mb-1">Add New Triggered:</div>
                <div className="text-white font-semibold">"{addNewStandard}"</div>
              </div>
            )}
          </div>

          {/* RIGHT: Portal Version (Nuclear) */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-purple-300 mb-2 flex items-center gap-2">
                <Rocket size={20} />
                Portal Version (Nuclear)
              </h2>
              <p className="text-xs text-gray-400">Rendered at document.body level</p>
            </div>
            
            <div className="bg-[#111827] border border-gray-800 rounded-lg p-6">
              <ProductSearchPortal
                onSelect={(product) => {
                  setSelectedPortal(product);
                  addLog(`✅ Portal: Selected ${product.name}`);
                }}
                onAddNew={(name) => {
                  setAddNewPortal(name);
                  addLog(`➕ Portal: Add New "${name}"`);
                }}
                onQueryChange={setQueryPortal}
                autoFocus={false}
              />
            </div>

            {/* Portal Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111827] border border-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Query</div>
                <div className="text-purple-400 font-mono text-sm">"{queryPortal}"</div>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Selected</div>
                <div className="text-white text-sm truncate">{selectedPortal?.name || 'None'}</div>
              </div>
            </div>
            {addNewPortal && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                <div className="text-xs text-purple-400 mb-1">Add New Triggered:</div>
                <div className="text-white font-semibold">"{addNewPortal}"</div>
              </div>
            )}
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">📋 Event Log (Real-time)</h3>
          {eventLog.length > 0 ? (
            <div className="space-y-1 font-mono text-xs max-h-48 overflow-y-auto">
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
            <div className="text-gray-600 text-sm text-center py-4">
              No events yet. Start searching in either component!
            </div>
          )}
        </div>

        {/* Available Products Reference */}
        <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">📦 Available Products (Mock Data)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {MOCK_PRODUCTS.map((product) => (
              <div
                key={product.id}
                className="bg-[#0B0F1A] border border-gray-700 rounded px-3 py-2"
              >
                <div className="text-white font-medium text-sm">{product.name}</div>
                <div className="text-gray-400 text-xs mt-1">
                  {product.sku} • {product.stock.toFixed(2)}M
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Guide */}
        <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-emerald-300 mb-3 flex items-center gap-2">
            <Check size={20} />
            Which One Works Better?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-white font-semibold mb-2">✅ Standard Version</div>
              <ul className="text-gray-400 space-y-1 text-xs">
                <li>• Uses absolute positioning</li>
                <li>• Stays within parent container</li>
                <li>• May be clipped by overflow:hidden</li>
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold mb-2">🚀 Portal Version (Nuclear)</div>
              <ul className="text-gray-400 space-y-1 text-xs">
                <li>• Rendered at document.body</li>
                <li>• Escapes ALL parent constraints</li>
                <li>• Guaranteed visibility (z-index 999999)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Console Output Reminder */}
        <div className="bg-[#111827] border border-gray-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">💻 Console Output</h3>
          <div className="text-xs text-gray-500">
            Open browser DevTools Console (F12) to see real-time search logs:
            <code className="block mt-2 bg-[#0B0F1A] border border-gray-700 rounded px-2 py-1 text-indigo-400">
              🔍 Query: "at" | Results: 3
            </code>
            <code className="block mt-1 bg-[#0B0F1A] border border-gray-700 rounded px-2 py-1 text-purple-400">
              🔍 Portal Query: "at" | Results: 3
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
