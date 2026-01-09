/**
 * Example: How to use useDropdown hook
 * 
 * This shows the CORRECT pattern for any dropdown in the system.
 * Copy this pattern when creating new dropdowns.
 */

'use client';

import React from 'react';
import { useDropdown } from '@/lib/hooks/useDropdown';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownItem {
  id: number | string;
  label: string;
  value: any;
}

interface DropdownExampleProps {
  items: DropdownItem[];
  selectedItem?: DropdownItem;
  onSelect: (item: DropdownItem) => void;
  placeholder?: string;
}

export function DropdownExample({ 
  items, 
  selectedItem, 
  onSelect, 
  placeholder = 'Select...' 
}: DropdownExampleProps) {
  const {
    isOpen,
    handleToggle,
    handleMouseDown,
    handleBlur,
    handleItemClick,
  } = useDropdown({
    onItemSelect: onSelect,
  });

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        onBlur={handleBlur}
        className={cn(
          'flex items-center justify-between w-full px-4 py-2',
          'bg-slate-800 border border-slate-700 rounded-lg',
          'hover:bg-slate-700 transition-colors',
          isOpen && 'border-indigo-500'
        )}
      >
        <span className="text-white">
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'text-slate-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50">
          <div className="max-h-64 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={handleMouseDown}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3',
                  'hover:bg-slate-800 transition-colors text-left',
                  selectedItem?.id === item.id && 'bg-indigo-500/10'
                )}
              >
                <span className={cn(
                  'text-sm',
                  selectedItem?.id === item.id ? 'text-indigo-300' : 'text-white'
                )}>
                  {item.label}
                </span>
                {selectedItem?.id === item.id && (
                  <Check size={16} className="text-indigo-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
