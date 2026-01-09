"use client";

import { useEffect } from "react";

export function GlobalBodyFix() {
  // Industry-Standard ERP Fix: Aggressively prevent aria-hidden and pointer-events from locking the UI
  useEffect(() => {
    const forceBodyInteraction = () => {
      // Force pointer-events back to auto if it's been set to none
      if (document.body.style.pointerEvents === 'none' || document.body.style.pointerEvents === '') {
        document.body.style.pointerEvents = 'auto';
      }
      // Remove aria-hidden attribute if it exists
      if (document.body.hasAttribute('aria-hidden')) {
        document.body.removeAttribute('aria-hidden');
      }
      // Fix layout shift from scrollbar padding
      if (document.body.style.paddingRight && document.body.style.paddingRight !== '0px') {
        document.body.style.paddingRight = '0px';
      }
      // Remove inert attribute if present
      if (document.body.hasAttribute('inert')) {
        document.body.removeAttribute('inert');
      }
    };

    // MutationObserver: Watch for any changes to body attributes/styles
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          forceBodyInteraction();
        }
      });
    });

    // Observe body for attribute and style changes (including subtree for nested modals)
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['aria-hidden', 'inert', 'style'],
      childList: true, // Watch for modal additions
      subtree: true // Watch nested elements
    });

    // Also check immediately on mount
    forceBodyInteraction();

    // Periodic check (every 100ms) as a safety net
    const intervalId = setInterval(forceBodyInteraction, 100);

    // Cleanup
    return () => {
      observer.disconnect();
      clearInterval(intervalId);
      // Final cleanup on unmount
      forceBodyInteraction();
    };
  }, []);

  return null;
}

