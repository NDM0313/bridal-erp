/**
 * Stock Adjustment Routes
 * Handles all stock adjustment API endpoints
 */

import express from 'express';
import { authenticateUser, attachBusinessContext, requirePermission } from '../middleware/auth.js';
import {
  createAdjustment,
  getAdjustments,
  getAdjustmentById,
  completeAdjustment,
} from '../services/adjustmentService.js';

const router = express.Router();

/**
 * POST /api/v1/adjustments
 * Create a new stock adjustment
 * Requires: admin or manager role
 */
router.post(
  '/',
  authenticateUser,
  attachBusinessContext,
  requirePermission('stock.adjust'),
  async (req, res, next) => {
    try {
      const result = await createAdjustment(req.body, req.businessId, req.user.id);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error.message.includes('Missing required')) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }
      if (error.message.includes('Insufficient stock')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: error.message,
          },
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/adjustments
 * Get all stock adjustments with pagination and filters
 */
router.get(
  '/',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        perPage: parseInt(req.query.per_page) || 20,
        locationId: req.query.location_id ? parseInt(req.query.location_id) : null,
        status: req.query.status || null,
        dateFrom: req.query.date_from || null,
        dateTo: req.query.date_to || null,
      };

      const result = await getAdjustments(req.businessId, options);

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
 * GET /api/v1/adjustments/:id
 * Get single adjustment by ID
 */
router.get(
  '/:id',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const transactionId = parseInt(req.params.id);
      if (isNaN(transactionId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid adjustment ID',
          },
        });
      }

      const adjustment = await getAdjustmentById(transactionId, req.businessId);

      res.json({
        success: true,
        data: adjustment,
      });
    } catch (error) {
      if (error.message === 'Adjustment not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/adjustments/:id/complete
 * Complete a draft adjustment
 */
router.post(
  '/:id/complete',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const transactionId = parseInt(req.params.id);
      if (isNaN(transactionId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid adjustment ID',
          },
        });
      }

      const transaction = await completeAdjustment(transactionId, req.businessId);

      res.json({
        success: true,
        data: transaction,
        message: 'Adjustment completed successfully',
      });
    } catch (error) {
      if (error.message === 'Adjustment not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
      if (error.message.includes('already finalized')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ALREADY_FINALIZED',
            message: error.message,
          },
        });
      }
      if (error.message.includes('Insufficient stock')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: error.message,
          },
        });
      }
      next(error);
    }
  }
);

export default router;

