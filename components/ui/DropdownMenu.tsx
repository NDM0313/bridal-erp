/**
 * Dropdown Menu Component (Simple implementation)
 */

import React, { HTMLAttributes, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { MoreVertical } from 'lucide-react';

interface DropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
}

export const DropdownMenuContent = ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn('py-1', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuTrigger = ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return <div {...props}>{children}</div>;
};

export const DropdownMenu = ({ children, trigger }: DropdownMenuProps) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close menu function to pass to children
  const closeMenu = () => {
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Check if dropdown should open upward (near bottom of viewport)
      if (triggerRef.current && dropdownRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownHeight = dropdownRef.current.offsetHeight || 300;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // If less space below than dropdown height, open upward
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setPosition('top');
        } else {
          setPosition('bottom');
        }
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Calculate dropdown position for portal
  const getDropdownPosition = () => {
    if (!triggerRef.current) return { top: 0, right: 0 };
    
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 192; // w-48 = 192px
    
    return {
      top: position === 'top' 
        ? rect.top - (dropdownRef.current?.offsetHeight || 300) - 4
        : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    };
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <div 
        ref={triggerRef} 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      {open && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop to cover other elements and hide other 3-dots buttons */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{ 
              pointerEvents: 'auto',
              backgroundColor: 'transparent'
            }}
          />
          {/* Dropdown menu - rendered via portal */}
          <div 
            ref={dropdownRef}
            className="fixed w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-[9999] overflow-hidden"
            style={{ 
              ...getDropdownPosition(),
              zIndex: 9999
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Close menu if clicking on a menu item (event delegation)
              const target = e.target as HTMLElement;
              if (target.closest('[data-menu-item]')) {
                // Close immediately for Edit action to prevent backdrop interference
                const menuItem = target.closest('[data-menu-item]');
                const isEditAction = menuItem?.textContent?.includes('Edit');
                if (isEditAction) {
                  closeMenu(); // Close immediately, no delay
                } else {
                  setTimeout(() => closeMenu(), 150);
                }
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            {children}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

interface DropdownMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  onClick?: () => void;
}

export const DropdownMenuItem = ({ className, onClick, children, onClose, ...props }: DropdownMenuItemProps & { onClose?: () => void }) => {
  return (
    <div
      data-menu-item
      className={cn(
        'px-4 py-2 text-sm text-gray-300 cursor-pointer hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center gap-2',
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClick) {
          onClick();
        }
        // Close menu after click
        if (onClose) {
          setTimeout(() => onClose(), 100);
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};

