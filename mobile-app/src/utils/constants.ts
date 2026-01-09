/**
 * App Constants
 */

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
};

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  SALES: 'sales',
  PRODUCTION_WORKER: 'production_worker',
  AUDITOR: 'auditor',
} as const;
