/**
 * API Client (Axios-based)
 * For Modern ERP modules - Rental, Production, Accounting
 * Extends the existing fetch-based client in lib/api/client.ts
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get backend URL from environment (Next.js uses NEXT_PUBLIC_ prefix)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Get Supabase auth token
 */
async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    // Import supabase client
    const { supabase } = await import('@/utils/supabase/client');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Create Axios instance with default config
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor: Attach auth token to every request
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAuthToken();
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      // Handle specific error codes
      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          console.error('Authentication failed. Please login again.');
          // Optionally: redirect to login
          if (typeof window !== 'undefined') {
            // window.location.href = '/login';
          }
          break;
        case 403:
          console.error('Access forbidden. You do not have permission.');
          break;
        case 404:
          console.error('Resource not found.');
          break;
        case 409:
          // Conflict (e.g., duplicate SKU, date conflict)
          console.error('Conflict:', data?.error?.message || 'Resource conflict');
          break;
        case 422:
          // Validation error
          console.error('Validation error:', data?.error?.message || 'Invalid data');
          break;
        case 500:
          console.error('Server error. Please try again later.');
          break;
        default:
          console.error('Request failed:', data?.error?.message || error.message);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network error. Please check your connection.');
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * API Response wrapper type
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * API Error type
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Helper function to extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiResponse;
    return apiError?.error?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export default apiClient;

