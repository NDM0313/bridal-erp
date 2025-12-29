/**
 * Audit Service
 * Logs role-sensitive actions for audit trail
 * 
 * SECURITY: Only backend can create audit logs (immutable)
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * Create audit log entry
 * @param {object} logData - Audit log data
 * @param {number} logData.businessId - Business ID
 * @param {string} logData.userId - User ID (UUID)
 * @param {string} logData.userRole - User role
 * @param {string} logData.action - Action performed
 * @param {string} logData.entityType - Entity type (e.g., 'product', 'transaction')
 * @param {number} logData.entityId - Entity ID
 * @param {object} logData.details - Additional details (JSON)
 * @param {string} logData.ipAddress - IP address (optional)
 * @param {string} logData.userAgent - User agent (optional)
 */
export async function createAuditLog(logData) {
  const {
    businessId,
    userId,
    userRole,
    action,
    entityType,
    entityId = null,
    details = null,
    ipAddress = null,
    userAgent = null,
  } = logData;

  // Validate required fields
  if (!businessId || !userId || !userRole || !action || !entityType) {
    throw new Error('Missing required audit log fields');
  }

  // Validate role
  const validRoles = ['admin', 'manager', 'cashier', 'auditor'];
  if (!validRoles.includes(userRole)) {
    throw new Error(`Invalid role: ${userRole}`);
  }

  // Use service_role to bypass RLS (audit logs are system-level)
  const { data, error } = await supabaseAdmin.from('audit_logs').insert({
    business_id: businessId,
    user_id: userId,
    user_role: userRole,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ? JSON.stringify(details) : null,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`);
  }

  return data;
}

/**
 * Get audit logs for a business
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Audit logs
 */
export async function getAuditLogs(businessId, options = {}) {
  const {
    page = 1,
    perPage = 50,
    userId = null,
    action = null,
    entityType = null,
    dateFrom = null,
    dateTo = null,
  } = options;

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (action) {
    query = query.eq('action', action);
  }

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  // Get total count
  const { count } = await supabaseAdmin
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);

  return {
    data: data || [],
    meta: {
      page,
      perPage,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / perPage),
    },
  };
}

