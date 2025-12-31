/**
 * ProductNameCell Component
 * Composite cell showing Image + Name + SKU
 * Follows Products.md documentation
 */

'use client';

import { Image as ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ProductNameCellProps {
  image?: string | null;
  name: string;
  sku: string;
  className?: string;
}

export function ProductNameCell({ image, name, sku, className }: ProductNameCellProps) {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Image or Placeholder */}
      <Avatar className="h-10 w-10 rounded-lg border border-gray-700 bg-gray-800 flex-shrink-0">
        {image ? (
          <AvatarImage src={image} alt={name} className="object-cover" />
        ) : (
          <AvatarFallback className="bg-gray-800 text-gray-400 text-xs font-medium">
            {initials}
          </AvatarFallback>
        )}
      </Avatar>

      {/* Name + SKU */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white text-sm truncate">{name}</div>
        <div className="text-xs text-gray-500 truncate">{sku}</div>
      </div>
    </div>
  );
}

