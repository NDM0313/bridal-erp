/**
 * Authentication API
 * Handles login, logout, user info
 */

import { apiClient } from './client.js';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export interface User {
  id: string;
  email: string;
  role: string;
  businessId: number;
}

export interface LoginResponse {
  user: User;
  token: string;
}

/**
 * Login with email and password
 * Uses Supabase Auth or backend auth endpoint
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  // Option 1: Direct Supabase Auth (recommended)
  // Option 2: Backend auth endpoint (if exists)
  
  // For now, we'll use a backend endpoint pattern
  // In production, use Supabase Auth directly
  
  const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
    email,
    password,
  });

  // Store token securely
  if (response.token) {
    await SecureStore.setItemAsync(TOKEN_KEY, response.token);
    apiClient.setToken(response.token);
  }

  // Store user data
  if (response.user) {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
  }

  return response;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  // Clear stored data
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  apiClient.setToken(null);
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const userData = await SecureStore.getItemAsync(USER_KEY);
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get stored token
 */
export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

/**
 * Initialize auth (restore session)
 */
export async function initializeAuth(): Promise<User | null> {
  const token = await getStoredToken();
  if (token) {
    apiClient.setToken(token);
    const user = await getCurrentUser();
    if (user) {
      // Verify token is still valid by fetching user info
      try {
        const response = await apiClient.get<User>('/api/v1/auth/me');
        // Update stored user if role changed
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response));
        return response;
      } catch (error: any) {
        // Token invalid, clear storage
        if (error.code === 'UNAUTHORIZED') {
          await logout();
        }
        return null;
      }
    }
  }
  return null;
}
