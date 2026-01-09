/**
 * Branch Selector V2 - Simplified & Bulletproof
 * 
 * Key Improvements:
 * - No Portal (for debugging)
 * - Direct DOM rendering
 * - stopPropagation on clicks
 * - onMouseDown prevents blur
 * - Comprehensive logging
 */

'use client';

import React, { useRef, useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useBranchV2 } from '@/lib/context/BranchContextV2';
import { cn } from '@/lib/utils';

export function BranchSelectorV2() {
  const { activeBranch, branches, switchBranch, loading } = useBranchV2();
  const [isOpen, setIsOpen] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent focus loss before toggle
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsOpen((prev) => !prev);
  };

  const handleBlur = () => {
    // Delay closing so click can register (same pattern as variation/packing fix)
    blurTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 120);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  };

  const handleSelectBranch = (branchId: number | 'ALL', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const timestamp = Date.now();
    console.log(`[${timestamp}] 🖱️ User clicked branch ID: ${branchId}`);
    
    // Close dropdown
    setTimeout(() => setIsOpen(false), 50); // allow click to register before closing
    
    // Switch branch (will reload page)
    switchBranch(branchId);
  };

  if (loading || !activeBranch) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
        <Building2 size={16} className="text-slate-400 animate-pulse" />
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  return (
    <div
      className="relative"
      tabIndex={0}
      onBlur={handleBlur}
      onFocus={handleFocus}
    >
      <button
        type="button"
        onMouseDown={handleToggle} // prevents immediate blur, toggles reliably
        className={cn(
          'flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border transition-all',
          'hover:bg-slate-800 hover:border-indigo-500/50',
          isOpen ? 'border-indigo-500 bg-slate-800' : 'border-slate-700'
        )}
      >
        <Building2 size={16} className="text-indigo-400" />
        <div className="flex flex-col items-start min-w-[120px]">
          <span className="text-xs text-slate-400">Branch</span>
          <span className="text-sm font-medium text-white truncate max-w-[150px]">
            {activeBranch.name}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-slate-400 transition-transform',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </button>

      {/* Simple dropdown - NO PORTAL for debugging */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50"
        >
          <div className="max-h-64 overflow-y-auto">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={(e) => handleSelectBranch(branch.id, e)}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors text-left',
                  activeBranch.id === branch.id ? 'bg-indigo-500/10' : ''
                )}
              >
                <div className="flex flex-col">
                  <span className={cn(
                    'text-sm font-medium',
                    activeBranch.id === branch.id ? 'text-indigo-300' : 'text-white'
                  )}>
                    {branch.name}
                  </span>
                  {branch.code && (
                    <span className="text-xs text-slate-400">{branch.code}</span>
                  )}
                  {branch.location && (
                    <span className="text-xs text-slate-500">{branch.location}</span>
                  )}
                </div>
                {activeBranch.id === branch.id && (
                  <Check size={16} className="text-indigo-400" />
                )}
              </button>
            ))}
          </div>

          {branches.length === 0 && (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              No branches found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

