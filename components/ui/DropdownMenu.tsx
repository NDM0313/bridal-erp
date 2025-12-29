/**
 * Dropdown Menu Component (Simple implementation)
 */

import { HTMLAttributes, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MoreVertical } from 'lucide-react';

interface DropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
}

export const DropdownMenu = ({ children, trigger }: DropdownMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
            {children}
          </div>
        </>
      )}
    </div>
  );
};

interface DropdownMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  onClick?: () => void;
}

export const DropdownMenuItem = ({ className, onClick, children, ...props }: DropdownMenuItemProps) => {
  return (
    <div
      className={cn(
        'px-4 py-2 text-sm text-gray-300 cursor-pointer hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

