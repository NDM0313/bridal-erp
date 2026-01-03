'use client';

import { Skeleton } from './SkeletonLoader';
import { cn } from '@/lib/utils';

interface StatsSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Stats Cards Skeleton Loader
 * Matches the exact layout of stats cards for smooth transitions
 */
export function StatsSkeleton({ count = 4, className }: StatsSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton variant="text" className="h-4 w-24 mb-2" />
              <Skeleton variant="text" className="h-8 w-16" />
            </div>
            <Skeleton variant="circular" className="h-12 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

