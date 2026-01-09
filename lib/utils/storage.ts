/**
 * Safe localStorage Utilities
 * Purpose: Handle localStorage quota exceeded errors gracefully
 * Status: CRITICAL PRODUCTION REQUIREMENT
 * Date: January 8, 2026
 */

/**
 * Safely set item in localStorage with quota handling
 * @param key Storage key
 * @param value String value to store
 * @returns true if successful, false if failed
 */
export const setLocalStorage = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    // Handle QuotaExceededError specifically
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('❌ localStorage quota exceeded');
      
      // Strategy 1: Remove old cache entries
      const cacheKeys = [
        'branches_cache_v2',
        'user_preferences',
        'recent_searches',
        'cached_products',
        'temp_data',
      ];
      
      let freedSpace = false;
      
      for (const cacheKey of cacheKeys) {
        try {
          const item = localStorage.getItem(cacheKey);
          if (item && item.length > 1000) {
            // Remove large cached items
            localStorage.removeItem(cacheKey);
            console.log(`🧹 Removed ${cacheKey} (${item.length} chars) to free space`);
            freedSpace = true;
          }
        } catch (cleanupError) {
          console.warn(`Failed to remove ${cacheKey}:`, cleanupError);
        }
      }
      
      // Strategy 2: Retry after cleanup
      if (freedSpace) {
        try {
          localStorage.setItem(key, value);
          console.log('✅ Retry successful after cleanup');
          return true;
        } catch (retryError) {
          console.error('❌ Retry failed after cleanup:', retryError);
        }
      }
      
      // Strategy 3: User notification
      console.error('💾 localStorage full. Cannot save data.');
      alert(
        'Storage is full. Please clear browser cache or use private browsing mode.\n\n' +
        'Go to: Settings → Privacy → Clear Browsing Data'
      );
      return false;
    }
    
    // Handle other localStorage errors
    if (e instanceof DOMException && e.name === 'SecurityError') {
      console.error('❌ localStorage access denied (SecurityError)');
      alert('Unable to save data. localStorage might be disabled in your browser.');
      return false;
    }
    
    // Unknown error
    console.error('❌ localStorage error:', e);
    return false;
  }
};

/**
 * Safely get item from localStorage
 * @param key Storage key
 * @returns Value if found and accessible, null otherwise
 */
export const getLocalStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error('❌ localStorage read error:', e);
    return null;
  }
};

/**
 * Safely remove item from localStorage
 * @param key Storage key
 * @returns true if successful, false if failed
 */
export const removeLocalStorage = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('❌ localStorage remove error:', e);
    return false;
  }
};

/**
 * Safely clear all localStorage
 * @returns true if successful, false if failed
 */
export const clearLocalStorage = (): boolean => {
  try {
    localStorage.clear();
    return true;
  } catch (e) {
    console.error('❌ localStorage clear error:', e);
    return false;
  }
};

/**
 * Check if localStorage is available
 * @returns true if available, false otherwise
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get current localStorage usage
 * @returns Object with used and total bytes (approximate)
 */
export const getLocalStorageUsage = (): { used: number; total: number; percentage: number } => {
  try {
    let used = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          // Approximate size: key length + value length in bytes
          used += (key.length + value.length) * 2; // UTF-16 encoding
        }
      }
    }
    
    // Most browsers limit localStorage to 5-10MB (we use 5MB as safe estimate)
    const total = 5 * 1024 * 1024; // 5MB in bytes
    const percentage = (used / total) * 100;
    
    return { used, total, percentage };
  } catch {
    return { used: 0, total: 0, percentage: 0 };
  }
};

/**
 * Clean up old or large items from localStorage
 * @param maxSizePerItem Maximum size in bytes for a single item
 * @returns Number of items removed
 */
export const cleanupLocalStorage = (maxSizePerItem: number = 100000): number => {
  let removedCount = 0;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = (key.length + value.length) * 2; // UTF-16
          
          // Remove if too large
          if (size > maxSizePerItem) {
            keysToRemove.push(key);
          }
        }
      }
    }
    
    // Remove flagged items
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        removedCount++;
        console.log(`🧹 Cleaned up: ${key}`);
      } catch (e) {
        console.warn(`Failed to remove ${key}:`, e);
      }
    });
    
    console.log(`✅ Cleanup complete: ${removedCount} items removed`);
    return removedCount;
  } catch (e) {
    console.error('❌ Cleanup failed:', e);
    return 0;
  }
};

