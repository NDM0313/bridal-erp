/**
 * Create New Button Component
 * Dropdown button for quick actions (New Sale, New Purchase, Add Product, Add User)
 * Matches Figma design specifications
 */

'use client';

import { useState } from 'react';
import { Plus, ShoppingBag, ShoppingCart, Package, User, ChevronDown } from 'lucide-react';
import { Button } from './Button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function CreateNewButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const menuItems = [
    {
      label: 'New Sale',
      icon: ShoppingCart,
      onClick: () => {
        router.push('/dashboard/sales/new');
        setIsOpen(false);
      },
    },
    {
      label: 'New Purchase',
      icon: ShoppingBag,
      onClick: () => {
        router.push('/purchases/new');
        setIsOpen(false);
      },
    },
    {
      label: 'Add Product',
      icon: Package,
      onClick: () => {
        router.push('/products/new');
        setIsOpen(false);
      },
    },
    {
      label: 'Add User',
      icon: User,
      onClick: () => {
        router.push('/dashboard/users/new');
        setIsOpen(false);
      },
    },
  ];

  return (
    <div className="relative">
      <Button
        variant="primary"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-blue-500/20"
      >
        <Plus size={18} />
        <span className="hidden sm:inline">Create New</span>
        <ChevronDown size={16} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-gray-800 transition-colors',
                    index > 0 && index < menuItems.length && 'border-t border-gray-800'
                  )}
                >
                  <Icon size={18} className="text-gray-400" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

