/**
 * Audit Logs Routes
 * Handles audit log viewing
 * 
 * SECURITY: Only admin, manager, and auditor can view audit logs
 */

import express from 'express';
import { authenticateUser, attachBusinessContext, requireRole } from '../middleware/auth.js';
import { getAuditLogs } from '../services/auditService.js';

const router = express.Router();

/**
 * GET /api/v1/audit
 * Get audit logs for the business
 * Requires: admin, manager, or auditor role
 */
router.get(
  '/',
  authenticateUser,
  attachBusinessContext,
  requireRole('admin', 'manager', 'auditor'),
  async (req, res, next) => {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        perPage: parseInt(req.query.per_page) || 50,
        userId: req.query.user_id || null,
        action: req.query.action || null,
        entityType: req.query.entity_type || null,
        dateFrom: req.query.date_from || null,
        dateTo: req.query.date_to || null,
      };

      const result = await getAuditLogs(req.businessId, options);

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

