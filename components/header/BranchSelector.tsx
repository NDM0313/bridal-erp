/**
 * Branch Selector Component
 * Professional dropdown for switching branches
 * Features:
 * - Active branch display
 * - Branch switching
 * - Portal-based dropdown (no clipping)
 * - Loading state
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useBranchV2 } from '@/lib/context/BranchContextV2';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

export function BranchSelector() {
  const { activeBranch, branches, switchBranch, loading } = useBranchV2();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        const rect = buttonRef.current!.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Controlled blur handling to prevent immediate close (same pattern as variation/packing fixes)
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        // Delay close so click inside dropdown registers
        blurTimeoutRef.current = setTimeout(() => setIsOpen(false), 150);
      }
    };
    document.addEventListener('mousedown', handleMouseDown, { capture: true });
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, { capture: true });
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

  const handleSelectBranch = (branch: typeof branches[0]) => {
    console.log('🏢 User clicked branch:', branch.name, '(ID:', branch.id, ')');
    
    // Close dropdown AFTER click registers
    setTimeout(() => setIsOpen(false), 80);
    
    // Call switchBranch which will handle localStorage and reload
    switchBranch(branch.id);
    
    // Note: Page will reload automatically, so no toast needed
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
      tabIndex={0}
      onFocus={() => {
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault(); // prevent immediate blur
          setIsOpen((prev) => !prev);
        }}
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

      {/* Portal Dropdown - ZERO-ERROR: z-index 99999 for maximum visibility */}
      {isOpen && typeof window !== 'undefined' && createPortal(
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
          <div className="max-h-64 overflow-y-auto">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => handleSelectBranch(branch)}
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
        </div>,
        document.body
      )}
    </div>
  );
}

