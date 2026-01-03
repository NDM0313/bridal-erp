'use client';

import { Skeleton } from './SkeletonLoader';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Table Skeleton Loader
 * Matches the exact layout of inventory/sales tables for smooth transitions
 */
export function TableSkeleton({ rows = 10, columns = 6, className }: TableSkeletonProps) {
  return (
    <div className={cn('p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-900/50">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton variant="text" className="h-4 w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-slate-950/50 divide-y divide-slate-800">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-900/50">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <Skeleton variant="text" className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

