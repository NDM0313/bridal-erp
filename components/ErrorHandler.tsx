'use client';

import { useEffect } from 'react';

/**
 * Global Error Handler Component
 * Suppresses harmless browser errors like audio/video playback AbortErrors
 */
export function ErrorHandler() {
  useEffect(() => {
    // Suppress harmless AbortError from audio/video playback
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Check if it's the harmless audio/video AbortError
      if (
        error?.name === 'AbortError' ||
        (error?.message && 
         (error.message.includes('play()') && error.message.includes('pause()')) ||
         error.message.includes('The play() request was interrupted'))
      ) {
        // Silently ignore this harmless error
        event.preventDefault();
        return;
      }
      
      // Log other errors normally
      console.error('Unhandled promise rejection:', error);
    };

    // Add event listener
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

