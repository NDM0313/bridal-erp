/**
 * Switch Component
 * Toggle switch for pricing mode (Retail/Wholesale)
 * Follows POS.md documentation
 */

'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <label className="flex items-center gap-3 cursor-pointer">
        {label && <span className="text-sm text-gray-400">{label}</span>}
        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900">
          <input
            type="checkbox"
            className="sr-only"
            ref={ref}
            checked={checked}
            onChange={handleChange}
            {...props}
          />
          <span
            className={cn(
              'inline-block h-6 w-11 transform rounded-full transition-transform',
              checked
                ? 'bg-green-600'
                : 'bg-gray-700'
            )}
          />
          <span
            className={cn(
              'absolute left-1 top-1 h-4 w-4 transform rounded-full bg-white transition-transform',
              checked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </div>
      </label>
    );
  }
);

Switch.displayName = 'Switch';

