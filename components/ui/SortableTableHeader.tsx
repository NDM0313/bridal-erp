'use client';

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: SortDirection } | null;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
}: SortableTableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort?.direction : null;

  const handleClick = () => {
    onSort(sortKey);
  };

  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-800/50 transition-colors',
        isActive && 'text-indigo-400',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <div className="flex flex-col">
          {direction === 'asc' ? (
            <ArrowUp size={12} className="text-indigo-400" />
          ) : direction === 'desc' ? (
            <ArrowDown size={12} className="text-indigo-400" />
          ) : (
            <ArrowUpDown size={12} className="text-slate-500 opacity-50" />
          )}
        </div>
      </div>
    </th>
  );
}

