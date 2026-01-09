/**
 * ProductActionsMenu Component
 * 3-dots menu with actions: Print Barcode, Duplicate, History, Delete
 * Follows Products.md documentation
 */

'use client';

import { MoreVertical, Printer, Copy, History, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Product } from '@/lib/types/modern-erp';

interface ProductActionsMenuProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onView?: (product: Product) => void;
  onPrintBarcode?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  onViewHistory?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function ProductActionsMenu({
  product,
  onEdit,
  onView,
  onPrintBarcode,
  onDuplicate,
  onViewHistory,
  onDelete,
}: ProductActionsMenuProps) {
  return (
    <DropdownMenu
      trigger={
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <MoreVertical size={18} />
        </Button>
      }
    >
      {onView && (
        <DropdownMenuItem onClick={() => onView(product)}>
          <Eye size={14} className="inline mr-2" />
          View Details
        </DropdownMenuItem>
      )}
      {onEdit && (
        <DropdownMenuItem 
          onClick={(e) => {
            // Immediately close dropdown and prevent event bubbling
            e?.stopPropagation?.();
            // Call onEdit handler
            onEdit(product);
          }}
        >
          <Edit size={14} className="inline mr-2" />
          Edit Product
        </DropdownMenuItem>
      )}
      {onPrintBarcode && (
        <DropdownMenuItem onClick={() => onPrintBarcode(product)}>
          <Printer size={14} className="inline mr-2" />
          Print Barcode
        </DropdownMenuItem>
      )}
      {onDuplicate && (
        <DropdownMenuItem onClick={() => onDuplicate(product)}>
          <Copy size={14} className="inline mr-2" />
          Duplicate Product
        </DropdownMenuItem>
      )}
      {onViewHistory && (
        <DropdownMenuItem onClick={() => onViewHistory(product)}>
          <History size={14} className="inline mr-2" />
          View Stock History
        </DropdownMenuItem>
      )}
      <div className="border-t border-gray-700 my-1" />
      {onDelete && (
        <DropdownMenuItem
          onClick={() => onDelete(product)}
          className="text-red-400 hover:bg-red-900/20"
        >
          <Trash2 size={14} className="inline mr-2" />
          Delete Product
        </DropdownMenuItem>
      )}
    </DropdownMenu>
  );
}

