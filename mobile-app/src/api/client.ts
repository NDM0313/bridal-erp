/**
 * API Client
 * Base client for all API calls
 * Handles authentication, error handling, retry logic
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  code: string;
  message: string;
  details?: any;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Make API request with error handling
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Handle non-2xx responses
      if (!response.ok) {
        const error: ApiError = {
          code: data.error?.code || 'UNKNOWN_ERROR',
          message: data.error?.message || 'An error occurred',
          details: data.error?.details,
        };

        // Handle specific error codes
        if (response.status === 401) {
          error.code = 'UNAUTHORIZED';
          error.message = 'Session expired. Please login again.';
        } else if (response.status === 403) {
          error.code = 'INSUFFICIENT_PERMISSIONS';
          error.message = data.error?.message || 'You do not have permission to perform this action.';
        } else if (response.status === 404) {
          error.code = 'NOT_FOUND';
          error.message = 'Resource not found.';
        } else if (response.status === 422) {
          error.code = 'VALIDATION_ERROR';
          error.message = data.error?.message || 'Validation failed.';
        }

        throw error;
      }

      // Return data if success response
      if (data.success !== false) {
        return data.data || data;
      }

      throw {
        code: data.error?.code || 'UNKNOWN_ERROR',
        message: data.error?.message || 'An error occurred',
      };
    } catch (error: any) {
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.',
        };
      }

      // Re-throw API errors
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

// Singleton instance
export const apiClient = new ApiClient();
