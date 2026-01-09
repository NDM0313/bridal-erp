/**
 * Branch Selection Test Page
 * 
 * Purpose: Debug and verify branch selection functionality
 * Features:
 * - Live localStorage monitoring
 * - Manual test controls
 * - Debug actions
 * - Console output instructions
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useBranchV2 } from '@/lib/context/BranchContextV2';
import { BranchSelectorV2 } from '@/components/header/BranchSelectorV2';
import { cn } from '@/lib/utils';

export default function TestBranchPage() {
  const { activeBranch, branches, switchBranch, loading } = useBranchV2();
  const [localStorageState, setLocalStorageState] = useState<any>({});

  // Refresh localStorage state every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalStorageState({
        branch_id: localStorage.getItem('active_branch_id_v2'),
        branches_cache: localStorage.getItem('branches_cache_v2'),
        timestamp: Date.now(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSwitch = (branchId: number | "ALL") => {
    console.log(`[${Date.now()}] 🧪 MANUAL TEST: Switching to branch`, branchId);
    switchBranch(branchId);
  };

  const handleClearLocalStorage = () => {
    localStorage.removeItem('active_branch_id_v2');
    localStorage.removeItem('branches_cache_v2');
    console.log('🧹 localStorage cleared');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">🧪 Branch Selection Test Page</h1>

        {/* Branch Selector Component */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Branch Selector Component</h2>
          <BranchSelectorV2 />
        </div>

        {/* Context State */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Context State</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-slate-400">Loading:</span>{' '}
              <span className={loading ? 'text-yellow-400' : 'text-green-400'}>
                {loading ? 'true' : 'false'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Active Branch:</span>{' '}
              <span className="text-indigo-400">
                {activeBranch ? `${activeBranch.name} (ID: ${activeBranch.id})` : 'null'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Total Branches:</span>{' '}
              <span className="text-blue-400">{branches.length}</span>
            </div>
          </div>
        </div>

        {/* localStorage State */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">localStorage State (Live)</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-slate-400">active_branch_id_v2:</span>{' '}
              <span className="text-green-400">{localStorageState.branch_id || 'null'}</span>
            </div>
            <div>
              <span className="text-slate-400">branches_cache_v2:</span>{' '}
              <span className="text-purple-400">
                {localStorageState.branches_cache ? `${localStorageState.branches_cache.length} chars` : 'null'}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Last updated: {new Date(localStorageState.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Manual Test Buttons */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Manual Test Controls</h2>
          <div className="space-y-3">
            {branches.map((branch) => (
              <button
                key={branch.id.toString()}
                onMouseDown={(e) => e.preventDefault()} // prevent blur
                onClick={() => handleManualSwitch(branch.id)}
                className={cn(
                  "w-full px-4 py-3 rounded-lg border text-left transition-all",
                  activeBranch?.id === branch.id
                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                    : "bg-slate-800 border-slate-700 hover:border-slate-600"
                )}
              >
                <div className="font-medium flex items-center gap-2">
                  <span>{branch.name}</span>
                  {branch.id === "ALL" && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-200">
                      VIEW ONLY
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-400">
                  ID: {branch.id.toString()} | Code: {branch.code}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Debug Actions */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Debug Actions</h2>
          <div className="space-y-2">
            <button
              onClick={handleClearLocalStorage}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              🧹 Clear localStorage & Reload
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors ml-2"
            >
              🔄 Reload Page
            </button>
            <button
              onClick={() => {
                console.log('📊 Context State:', { activeBranch, branches, loading });
                console.log('💾 localStorage:', {
                  branch_id: localStorage.getItem('active_branch_id_v2'),
                  branches_cache: localStorage.getItem('branches_cache_v2'),
                });
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors ml-2"
            >
              📊 Log State to Console
            </button>
          </div>
        </div>

        {/* Console Output */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">📝 Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li>Open browser DevTools Console (F12)</li>
            <li>Click on a branch in the dropdown or manual buttons</li>
            <li>Watch the console logs with timestamps</li>
            <li>After page reload, verify active branch matches selection</li>
            <li>Check localStorage state updates in real-time</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

