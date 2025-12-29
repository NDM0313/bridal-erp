/**
 * Accounting Routes
 * Handles financial accounts and fund transfers with double-entry accounting
 */

import express from 'express';
import { authenticateUser, attachBusinessContext, requirePermission } from '../middleware/auth.js';
import { auditLogger } from '../middleware/auditLogger.js';
import {
  createFundTransfer,
  getFundTransfers,
  getFinancialAccounts,
  createFinancialAccount,
} from '../services/fundTransferService.js';

const router = express.Router();

/**
 * GET /api/v1/accounting/accounts
 * Get all financial accounts
 */
router.get(
  '/accounts',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const accounts = await getFinancialAccounts(req.businessId);

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/accounting/accounts
 * Create a new financial account
 * Requires: admin or manager role
 */
router.post(
  '/accounts',
  authenticateUser,
  attachBusinessContext,
  requirePermission('settings.edit'),
  async (req, res, next) => {
    try {
      const account = await createFinancialAccount(
        req.body,
        req.businessId,
        req.user.id
      );

      // Log audit trail
      const { createAuditLog } = await import('../services/auditService.js');
      createAuditLog({
        businessId: req.businessId,
        userId: req.user.id,
        userRole: req.userRole,
        action: 'financial_account_created',
        entityType: 'financial_account',
        entityId: account.id,
        details: {
          name: account.name,
          type: account.type,
          openingBalance: account.opening_balance,
        },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      }).catch((err) => console.error('Audit log failed:', err));

      res.status(201).json({
        success: true,
        data: account,
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_ACCOUNT_NAME',
            message: error.message,
          },
        });
      }
      if (error.message.includes('Missing required')) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/accounting/transfers
 * Get all fund transfers
 */
router.get(
  '/transfers',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        perPage: parseInt(req.query.per_page) || 20,
        accountId: req.query.account_id ? parseInt(req.query.account_id) : null,
        startDate: req.query.start_date || null,
        endDate: req.query.end_date || null,
      };

      const result = await getFundTransfers(req.businessId, options);

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

/**
 * POST /api/v1/accounting/transfers
 * Create a fund transfer (creates double-entry transactions)
 * Requires: admin or manager role
 */
router.post(
  '/transfers',
  authenticateUser,
  attachBusinessContext,
  requirePermission('settings.edit'),
  async (req, res, next) => {
    try {
      const transfer = await createFundTransfer(
        req.body,
        req.businessId,
        req.user.id
      );

      // Log audit trail
      const { createAuditLog } = await import('../services/auditService.js');
      createAuditLog({
        businessId: req.businessId,
        userId: req.user.id,
        userRole: req.userRole,
        action: 'fund_transfer_created',
        entityType: 'fund_transfer',
        entityId: transfer.id,
        details: {
          fromAccountId: transfer.from_account_id,
          toAccountId: transfer.to_account_id,
          amount: transfer.amount,
        },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      }).catch((err) => console.error('Audit log failed:', err));

      res.status(201).json({
        success: true,
        data: transfer,
      });
    } catch (error) {
      if (error.message.includes('Insufficient balance')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: error.message,
          },
        });
      }
      if (error.message.includes('cannot be the same')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      if (error.message.includes('Missing required')) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      next(error);
    }
  }
);

export default router;

