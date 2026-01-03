'use client';

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Array<{
    key: string;
    header: string;
    width: number;
    render?: (item: T) => React.ReactNode;
  }>;
  rowHeight?: number;
  height?: number;
  className?: string;
}

/**
 * Virtualized Table Component (Custom Implementation)
 * Only renders visible rows for performance with large datasets
 * Use when table has more than 20 rows
 * Custom implementation to avoid react-window compatibility issues with Turbopack
 */
export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 60,
  height = 600,
  className,
}: VirtualizedTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalWidth = useMemo(() => columns.reduce((sum, col) => sum + col.width, 0), [columns]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.ceil(height / rowHeight);
    const end = Math.min(start + visibleCount + 2, data.length); // +2 for buffer
    return { start: Math.max(0, start - 1), end }; // -1 for buffer
  }, [scrollTop, rowHeight, height, data.length]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Render visible rows
  const visibleRows = useMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end).map((item, index) => {
      const actualIndex = visibleRange.start + index;
      return (
        <div
          key={actualIndex}
          style={{
            position: 'absolute',
            top: actualIndex * rowHeight,
            height: rowHeight,
            width: '100%',
          }}
          className={cn(
            "flex items-center border-b border-slate-800 hover:bg-slate-900/50 transition-colors",
            actualIndex % 2 === 0 ? "bg-slate-950/50" : "bg-slate-900/30"
          )}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              style={{ width: column.width }}
              className="px-4 py-3 text-sm text-slate-200"
            >
              {column.render ? column.render(item) : String(item[column.key] || '—')}
            </div>
          ))}
        </div>
      );
    });
  }, [data, visibleRange, rowHeight, columns]);

  const totalHeight = data.length * rowHeight;

  return (
    <div className={cn("rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center bg-slate-900/50 border-b border-slate-800 sticky top-0 z-10">
        {columns.map((column) => (
          <div
            key={column.key}
            style={{ width: column.width }}
            className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider"
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtualized Body */}
      {data.length === 0 ? (
        <div className="p-12 text-center text-slate-400">No data available</div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            height: height - 60, // Subtract header height
            overflowY: 'auto',
            position: 'relative',
          }}
          className="scrollbar-thin scrollbar-thumb-slate-800"
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            {visibleRows}
          </div>
        </div>
      )}
    </div>
  );
}

