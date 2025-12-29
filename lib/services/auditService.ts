/**
 * Audit Service
 * Log critical actions for audit trail
 * 
 * NOTE: Audit logging should go through backend API
 * to ensure immutability and prevent tampering
 */

import { api, ApiResponse } from '@/lib/api/client';

export interface AuditLog {
  id: number;
  business_id: number;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: number;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CreateAuditLogDto {
  action: string;
  entity_type: string;
  entity_id: number;
  details?: Record<string, unknown>;
}

/**
 * NOTE: Audit logging is handled by backend API
 * This ensures:
 * - Immutability (logs cannot be modified)
 * - Security (backend verifies user and business)
 * - Consistency (all logs follow same format)
 * 
 * Frontend should call backend API after critical actions:
 * - Sale created
 * - Stock updated
 * - Product modified
 * - Transaction finalized
 * 
 * Example:
 * ```typescript
 * // After creating a sale
 * await salesApi.create(saleData);
 * 
 * // Log the action (backend handles this automatically)
 * // Or explicitly:
 * await auditApi.log({
 *   action: 'sale_created',
 *   entity_type: 'transaction',
 *   entity_id: sale.id,
 *   details: { invoice_no: sale.invoice_no }
 * });
 * ```
 */

/**
 * Check if a transaction can be edited
 * Only draft transactions can be edited
 */
export function canEditTransaction(status: string): boolean {
  return status === 'draft';
}

/**
 * Check if a transaction is finalized
 * Finalized transactions cannot be edited
 */
export function isTransactionFinalized(status: string): boolean {
  return status === 'final';
}

/**
 * Validate that a transaction is not finalized before editing
 */
export function validateTransactionEditable(status: string): void {
  if (isTransactionFinalized(status)) {
    throw new Error('Cannot edit finalized transaction. Transaction is locked.');
  }
}

