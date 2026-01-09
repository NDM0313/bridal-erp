/**
 * Reusable Dropdown Hook
 * 
 * Fixes common dropdown issues:
 * - Blur closing before click registers
 * - MouseDown preventing blur
 * - Click not registering
 * 
 * This is the PROVEN pattern used in:
 * - Product Variation dropdown ✅
 * - Add Packing dropdown ✅
 * - Branch Selector ✅
 * 
 * Usage:
 *   const { isOpen, setIsOpen, handleToggle, handleItemClick, handleBlur } = useDropdown();
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseDropdownOptions {
  /** Delay before closing on blur (ms). Default: 120 */
  blurDelay?: number;
  /** Delay before closing after item click (ms). Default: 50 */
  clickCloseDelay?: number;
  /** Callback when item is selected */
  onItemSelect?: (item: any) => void;
}

export function useDropdown(options: UseDropdownOptions = {}) {
  const {
    blurDelay = 120,
    clickCloseDelay = 50,
    onItemSelect,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseDownRef = useRef(false);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Toggle dropdown open/close
   */
  const handleToggle = useCallback(() => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsOpen(prev => !prev);
  }, []);

  /**
   * Handle mouseDown on dropdown items
   * Prevents blur from firing before click
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isMouseDownRef.current = true;
    
    // Reset after a short delay
    setTimeout(() => {
      isMouseDownRef.current = false;
    }, 200);
  }, []);

  /**
   * Handle blur event
   * Only closes if mouseDown didn't happen
   */
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't close if mouseDown is active (click is happening)
    if (isMouseDownRef.current) {
      return;
    }

    // Delay close to allow click to register
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      blurTimeoutRef.current = null;
    }, blurDelay);
  }, [blurDelay]);

  /**
   * Handle item click
   * Closes dropdown after a short delay to ensure click registers
   */
  const handleItemClick = useCallback((item: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    // Call onItemSelect callback if provided
    if (onItemSelect) {
      onItemSelect(item);
    }

    // Close dropdown after short delay (ensures click registers)
    clickTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      clickTimeoutRef.current = null;
    }, clickCloseDelay);
  }, [clickCloseDelay, onItemSelect]);

  /**
   * Force close dropdown (useful for external triggers)
   */
  const handleClose = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    setIsOpen,
    handleToggle,
    handleMouseDown,
    handleBlur,
    handleItemClick,
    handleClose,
  };
}
