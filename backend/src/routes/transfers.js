/**
 * Stock Transfer Routes
 * Handles all stock transfer API endpoints
 */

import express from 'express';
import { authenticateUser, attachBusinessContext } from '../middleware/auth.js';
import {
  createTransfer,
  getTransfers,
  getTransferById,
  completeTransfer,
} from '../services/transferService.js';

const router = express.Router();

/**
 * POST /api/v1/transfers
 * Create a new stock transfer
 */
router.post(
  '/',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const result = await createTransfer(req.body, req.businessId, req.user.id);

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
      if (error.message.includes('cannot be the same')) {
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
 * GET /api/v1/transfers
 * Get all stock transfers with pagination and filters
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

      const result = await getTransfers(req.businessId, options);

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
 * GET /api/v1/transfers/:id
 * Get single transfer by ID
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
            message: 'Invalid transfer ID',
          },
        });
      }

      const transfer = await getTransferById(transactionId, req.businessId);

      res.json({
        success: true,
        data: transfer,
      });
    } catch (error) {
      if (error.message === 'Transfer not found') {
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
 * POST /api/v1/transfers/:id/complete
 * Complete a draft transfer
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
            message: 'Invalid transfer ID',
          },
        });
      }

      const transaction = await completeTransfer(transactionId, req.businessId);

      res.json({
        success: true,
        data: transaction,
        message: 'Transfer completed successfully',
      });
    } catch (error) {
      if (error.message === 'Transfer not found') {
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

