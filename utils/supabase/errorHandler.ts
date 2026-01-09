/**
 * Supabase Error Handler Utility
 * Handles network errors, rate limiting, and provides user-friendly messages
 */

export interface SupabaseError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error?.message || error?.toString() || '';
  const errorCode = error?.code;
  
  // Network-related error codes and messages
  const networkIndicators = [
    'Failed to fetch',
    'NetworkError',
    'Network request failed',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_CONNECTION_REFUSED',
    'ERR_CONNECTION_TIMED_OUT',
    'ERR_NAME_NOT_RESOLVED',
  ];
  
  return (
    networkIndicators.some(indicator => 
      errorMessage.includes(indicator)
    ) ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ETIMEDOUT' ||
    errorCode === 'ENOTFOUND'
  );
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';
  
  // Network errors
  if (isNetworkError(error)) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  
  // Supabase specific errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique constraint violation
        return 'This item already exists. Please use a different name.';
      case '23503': // Foreign key violation
        return 'Cannot delete this item because it is being used elsewhere.';
      case '42501': // Insufficient privilege
        return 'You do not have permission to perform this action.';
      case 'PGRST116': // Not found
        return 'The requested item was not found.';
      case '42703': // Undefined column
        return 'Database column not found. Please contact support.';
      case 'PGRST204': // No rows returned
        return 'No data found.';
      default:
        break;
    }
  }
  
  // Error message priority
  if (error.message) return error.message;
  if (error.details) return error.details;
  if (error.hint) return error.hint;
  if (typeof error === 'string') return error;
  
  return 'An error occurred. Please try again.';
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on non-network errors (except on first attempt)
      if (attempt > 0 && !isNetworkError(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Safe Supabase operation wrapper
 */
export async function safeSupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options?: {
    retry?: boolean;
    maxRetries?: number;
    onError?: (error: any) => void;
  }
): Promise<{ data: T | null; error: any }> {
  const { retry = true, maxRetries = 2, onError } = options || {};
  
  try {
    if (retry) {
      return await retryWithBackoff(operation, maxRetries);
    }
    return await operation();
  } catch (error: any) {
    const friendlyMessage = getErrorMessage(error);
    
    if (onError) {
      onError(error);
    }
    
    return {
      data: null,
      error: {
        ...error,
        message: friendlyMessage,
        originalError: error,
      },
    };
  }
}

