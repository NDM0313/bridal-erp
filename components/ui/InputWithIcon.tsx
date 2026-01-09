/**
 * InputWithIcon Component
 * A reusable input component that automatically hides the icon when user types or focuses
 * 
 * Features:
 * - Icon hides on focus
 * - Icon hides when value is present
 * - Smooth transition animation
 * - Supports left and right icon placement
 */

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputWithIconProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  iconClassName?: string;
  containerClassName?: string;
}

export const InputWithIcon = forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ 
    className, 
    icon, 
    iconPosition = 'left', 
    iconClassName = '',
    containerClassName = '',
    value,
    ...props 
  }, ref) => {
    const hasValue = value !== undefined && value !== null && value !== '';
    
    return (
      <div className={cn('relative group', containerClassName)}>
        {icon && (
          <div 
            className={cn(
              'absolute top-1/2 -translate-y-1/2 transition-opacity duration-200 pointer-events-none',
              iconPosition === 'left' ? 'left-4' : 'right-4',
              hasValue ? 'opacity-0' : 'opacity-100 group-focus-within:opacity-0',
              iconClassName
            )}
          >
            {icon}
          </div>
        )}
        <input
          ref={ref}
          value={value}
          className={cn(
            'w-full bg-[#0f1628] text-white border border-gray-700/50 rounded-lg py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-600',
            icon && iconPosition === 'left' ? 'pl-12 pr-4' : icon && iconPosition === 'right' ? 'pl-4 pr-12' : 'px-4',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

InputWithIcon.displayName = 'InputWithIcon';

