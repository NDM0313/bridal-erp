/**
 * Audit Logger Middleware
 * Automatically logs role-sensitive actions
 * 
 * SECURITY: Only backend can create audit logs (immutable)
 */

import { createAuditLog } from '../services/auditService.js';

/**
 * Middleware to log actions to audit trail
 * Must be placed AFTER the handler, not before
 * @param {string} action - Action name (e.g., 'product_created')
 * @param {string} entityType - Entity type (e.g., 'product')
 * @param {function} getEntityId - Function to extract entity ID from response
 */
export function auditLogger(action, entityType, getEntityId = (res) => res.locals.entityId) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after response
    res.json = function (data) {
      // Call original json
      originalJson(data);

      // Log to audit trail (async, don't block response)
      if (data.success && req.user && req.businessId && req.userRole) {
        const entityId = getEntityId(res) || (data.data?.id ? data.data.id : null) || (req.params?.id ? parseInt(req.params.id) : null);

        createAuditLog({
          businessId: req.businessId,
          userId: req.user.id,
          userRole: req.userRole,
          action,
          entityType,
          entityId,
          details: {
            method: req.method,
            path: req.path,
            body: req.body,
          },
          ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
          userAgent: req.headers['user-agent'] || null,
        }).catch((error) => {
          // Log error but don't fail request
          console.error('Failed to create audit log:', error);
        });
      }
    };

    next();
  };
}

/**
 * Helper to extract entity ID from response data
 */
export function extractEntityId(field = 'id') {
  return (res) => {
    return res.locals.entityId || (res.locals.data?.[field] ? res.locals.data[field] : null);
  };
}

