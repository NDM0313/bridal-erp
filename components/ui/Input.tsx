/**
 * Input Component
 * Enhanced with global numeric input handling for auto-clearing zero values
 * 
 * Features:
 * - Auto-clears '0' values on focus for numeric inputs
 * - Prevents leading zeros (e.g., '0500' becomes '500')
 * - Works with both controlled and uncontrolled components
 */

import { InputHTMLAttributes, forwardRef, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', onFocus, onChange, value, ...props }, ref) => {
    // Check if this is a numeric input type
    const isNumeric = type === 'number' || type === 'tel';
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref || internalRef) as React.RefObject<HTMLInputElement>;
    const isFocusedRef = useRef(false);

    // Handle focus for numeric inputs - auto-clear zero values
    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      
      if (isNumeric) {
        // Get the actual displayed value from the input element
        const currentValue = e.target.value;
        const numValue = parseFloat(currentValue);
        
        // Clear if value is exactly 0 (handles '0', '0.0', '0.00', etc.)
        // Only clear if it's a valid zero value (not empty string)
        if (currentValue !== '' && !isNaN(numValue) && numValue === 0) {
          // For controlled components (value prop exists), trigger onChange
          if (onChange && value !== undefined) {
            // Create synthetic change event to clear the value
            const syntheticEvent = {
              ...e,
              target: { ...e.target, value: '' },
              currentTarget: { ...e.currentTarget, value: '' },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          } else {
            // For uncontrolled components, directly set value
            e.target.value = '';
            // Trigger input event for consistency
            e.target.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
      
      // Call original onFocus if provided
      if (onFocus) {
        onFocus(e);
      }
    }, [isNumeric, onFocus, onChange, value]);

    // Handle change for numeric inputs - prevent leading zeros
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumeric && isFocusedRef.current) {
        let newValue = e.target.value;
        
        // Only process if there's actual input (not empty)
        if (newValue.length > 0) {
          // Remove leading zeros (except for '0.' or '0.5' patterns)
          // This prevents '0500' when typing '500' after '0'
          // Pattern: one or more zeros at start, followed by digits (but not '0.' or '0.5')
          if (newValue.length > 1 && /^0+[1-9]/.test(newValue)) {
            // Remove leading zeros but preserve decimal points
            newValue = newValue.replace(/^0+(?=\d)/, '');
            e.target.value = newValue;
            
            // For controlled components, create new event with corrected value
            if (value !== undefined && onChange) {
              const correctedEvent = {
                ...e,
                target: { ...e.target, value: newValue },
                currentTarget: { ...e.currentTarget, value: newValue },
              } as React.ChangeEvent<HTMLInputElement>;
              onChange(correctedEvent);
              return; // Exit early to prevent double onChange call
            }
          }
        }
      }
      
      // Call original onChange
      if (onChange) {
        onChange(e);
      }
    }, [isNumeric, onChange, value]);

    // Handle blur to reset focus state
    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;
      if (props.onBlur) {
        props.onBlur(e);
      }
    }, [props]);

    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={inputRef}
        value={value}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

