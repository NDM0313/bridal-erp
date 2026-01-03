"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  const [mounted, setMounted] = React.useState(false);
  const dialogContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // NUCLEAR FIX: Manual TAB key handler at Dialog level
  React.useEffect(() => {
    if (!open || !mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle TAB key
      if (e.key !== 'Tab') return;

      const container = dialogContainerRef.current;
      if (!container) return;

      // Get all focusable elements within the dialog
      const getFocusableElements = (): HTMLElement[] => {
        const selector = [
          'a[href]',
          'button:not([disabled])',
          'textarea:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(', ');
        
        return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
          (el) => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          }
        );
      };

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // Check if focus is within dialog
      if (!container.contains(activeElement)) {
        // Focus escaped - bring it back
        e.preventDefault();
        e.stopPropagation();
        firstElement.focus();
        return;
      }

      // Handle Shift+Tab (backward)
      if (e.shiftKey) {
        if (activeElement === firstElement) {
          e.preventDefault();
          e.stopPropagation();
          lastElement.focus();
        }
      } 
      // Handle Tab (forward)
      else {
        if (activeElement === lastElement) {
          e.preventDefault();
          e.stopPropagation();
          firstElement.focus();
        }
      }
    };

    // Attach to document to catch all TAB presses
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  const dialogContent = (
    <div 
      ref={dialogContainerRef}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ pointerEvents: 'auto' }}
      onKeyDown={(e) => {
        // Additional TAB handling at container level
        if (e.key === 'Tab') {
          const container = dialogContainerRef.current;
          if (!container) return;

          const getFocusableElements = (): HTMLElement[] => {
            const selector = [
              'a[href]',
              'button:not([disabled])',
              'textarea:not([disabled])',
              'input:not([disabled])',
              'select:not([disabled])',
              '[tabindex]:not([tabindex="-1"])',
            ].join(', ');
            
            return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
              (el) => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
              }
            );
          };

          const focusableElements = getFocusableElements();
          if (focusableElements.length === 0) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          const activeElement = document.activeElement as HTMLElement;

          if (!container.contains(activeElement)) {
            e.preventDefault();
            e.stopPropagation();
            firstElement.focus();
            return;
          }

          if (e.shiftKey) {
            if (activeElement === firstElement) {
              e.preventDefault();
              e.stopPropagation();
              lastElement.focus();
            }
          } else {
            if (activeElement === lastElement) {
              e.preventDefault();
              e.stopPropagation();
              firstElement.focus();
            }
          }
        }
      }}
      onClick={(e) => {
        // Only close if clicking directly on the outer container (backdrop)
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onOpenChange(false);
        }
      }}
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[200]"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(false);
        }}
      />
      {/* Dialog content wrapper - Force portal isolation with stopPropagation */}
      <div 
        className="relative pointer-events-auto"
        style={{ 
          zIndex: 201,
          pointerEvents: 'auto',
          // Ensure inputs can receive focus
          isolation: 'isolate'
        }}
        onClick={(e) => {
          // CRITICAL: Always stop propagation to prevent parent Sheet from closing
          // But DO NOT prevent default - allow inputs to focus and work normally
          e.stopPropagation();
          // Note: We don't call preventDefault() so inputs can focus and type normally
        }}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onOpenAutoFocus?: (e: Event) => void;
  onPointerDownOutside?: (e: Event) => void;
  onInteractOutside?: (e: Event) => void;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onOpenAutoFocus, onPointerDownOutside, onInteractOutside, ...props }, ref) => {
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);

    // Focus trap implementation - prevent TAB from escaping dialog
    React.useEffect(() => {
      const element = contentRef.current;
      if (!element) return;

      // Get all focusable elements within the dialog
      const getFocusableElements = (): HTMLElement[] => {
        const selector = [
          'a[href]',
          'button:not([disabled])',
          'textarea:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(', ');
        
        return Array.from(element.querySelectorAll<HTMLElement>(selector)).filter(
          (el) => {
            // Filter out hidden elements
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          }
        );
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        // Only handle TAB key
        if (e.key !== 'Tab') return;

        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        // Check if focus is within dialog
        if (!element.contains(activeElement)) {
          // Focus escaped - bring it back to first element
          e.preventDefault();
          firstElement.focus();
          return;
        }

        // Handle Shift+Tab (backward)
        if (e.shiftKey) {
          if (activeElement === firstElement || activeElement === element) {
            e.preventDefault();
            lastElement.focus();
          }
        } 
        // Handle Tab (forward)
        else {
          if (activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      // Attach keydown listener to dialog content
      element.addEventListener('keydown', handleKeyDown);

      // Also prevent focus from escaping on focusin - AGGRESSIVE
      const handleFocusIn = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        // If focus moves outside dialog, bring it back IMMEDIATELY
        if (!element.contains(target)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          const focusableElements = getFocusableElements();
          if (focusableElements.length > 0) {
            // Use setTimeout to ensure focus happens after event propagation
            setTimeout(() => {
              focusableElements[0].focus();
            }, 0);
          }
        }
      };

      // Also listen at document level to catch any escaped focus
      const handleDocumentFocusIn = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        if (!element.contains(target)) {
          // Check if target is in a different portal (like Sheet)
          const isInSheet = target.closest('[data-radix-portal]') && 
                          !target.closest('[style*="z-index: 200"]') &&
                          !target.closest('[style*="z-index: 201"]');
          
          if (isInSheet) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const focusableElements = getFocusableElements();
            if (focusableElements.length > 0) {
              setTimeout(() => {
                focusableElements[0].focus();
              }, 0);
            }
          }
        }
      };

      // Use capture phase to catch focus events early
      element.addEventListener('focusin', handleFocusIn, true);
      document.addEventListener('focusin', handleDocumentFocusIn, true);

      return () => {
        element.removeEventListener('keydown', handleKeyDown);
        element.removeEventListener('focusin', handleFocusIn, true);
        document.removeEventListener('focusin', handleDocumentFocusIn, true);
      };
    }, []);

    // Handle focus trap disabling props
    React.useEffect(() => {
      if (onOpenAutoFocus) {
        const handleOpenAutoFocus = (e: Event) => {
          e.preventDefault();
          onOpenAutoFocus(e);
        };
        const element = contentRef.current;
        if (element) {
          element.addEventListener('focusin', handleOpenAutoFocus as any);
          return () => {
            element.removeEventListener('focusin', handleOpenAutoFocus as any);
          };
        }
      }
    }, [onOpenAutoFocus]);

    return (
      <div
        ref={contentRef}
        className={cn(
          "relative z-[201] grid w-full max-w-lg gap-4 border border-gray-800 bg-gray-900 p-6 shadow-lg rounded-lg pointer-events-auto",
          className
        )}
        style={{ 
          pointerEvents: 'auto',
          // Ensure inputs can receive focus
          isolation: 'isolate'
        }}
        tabIndex={-1}
        onPointerDown={(e) => {
          // Prevent pointer events from bubbling to Sheet
          if (onPointerDownOutside && e.target === e.currentTarget) {
            e.preventDefault();
            onPointerDownOutside(e as any);
          }
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          // Stop propagation to prevent Sheet from intercepting
          e.stopPropagation();
        }}
        // CRITICAL: NO onClick handlers here that interfere with inputs
        {...props}
      >
        {children}
      </div>
    );
  }
);
DialogContent.displayName = "DialogContent";

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const DialogHeader = ({ className, children, ...props }: DialogHeaderProps) => {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
DialogHeader.displayName = "DialogHeader";

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn(
          "text-lg font-semibold leading-none tracking-tight text-white",
          className
        )}
        {...props}
      >
        {children}
      </h2>
    );
  }
);
DialogTitle.displayName = "DialogTitle";

interface DialogDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-gray-400", className)}
      {...props}
    >
      {children}
    </p>
  );
});
DialogDescription.displayName = "DialogDescription";

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const DialogFooter = ({ className, children, ...props }: DialogFooterProps) => {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
DialogFooter.displayName = "DialogFooter";

// Additional components for compatibility
const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, ...props }, ref) => {
  return (
    <button ref={ref} {...props}>
      {children}
    </button>
  );
});
DialogTrigger.displayName = "DialogTrigger";

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    onClose?: () => void;
  }
>(({ onClose, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClose) onClose();
      }}
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-gray-900 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none"
      {...props}
    >
      {children || <X className="h-4 w-4" />}
      <span className="sr-only">Close</span>
    </button>
  );
});
DialogClose.displayName = "DialogClose";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
