/**
 * StockCell Component
 * Displays stock quantity with color coding
 * Red if < 10 (or < min_stock_level), Green if >= 10
 * Follows Products.md documentation
 */

'use client';

import { cn } from '@/lib/utils';

interface StockCellProps {
  quantity: number;
  minLevel?: number;
  className?: string;
}

export function StockCell({ quantity, minLevel, className }: StockCellProps) {
  // Use minLevel if available, otherwise default to 10
  const threshold = minLevel && minLevel > 0 ? minLevel : 10;
  const isLowStock = quantity < threshold;

  return (
    <span
      className={cn(
        'text-sm font-medium',
        isLowStock ? 'text-red-400' : 'text-green-400',
        className
      )}
    >
      {quantity} units
    </span>
  );
}

