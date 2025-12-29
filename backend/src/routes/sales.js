/**
 * Sales Routes
 * Handles all sales-related API endpoints
 */

import express from 'express';
import { authenticateUser, attachBusinessContext } from '../middleware/auth.js';
import {
  createSale,
  getSales,
  getSaleById,
  completeSale,
} from '../services/salesService.js';

const router = express.Router();

/**
 * POST /api/v1/sales
 * Create a new sale transaction
 */
router.post(
  '/',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const result = await createSale(req.body, req.businessId, req.user.id);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error.message.includes('Insufficient stock')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
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
 * GET /api/v1/sales
 * Get all sales transactions with pagination and filters
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

      const result = await getSales(req.businessId, options);

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
        } catch (error) {
          // Track sale failure for monitoring
          try {
            await trackSaleFailure({
              organizationId: req.organizationId,
              businessId: req.businessId,
              userId: req.user?.id,
              reason: error.message,
              saleData: req.body,
            });
          } catch (trackError) {
            console.error('Failed to track sale failure:', trackError);
          }
          next(error);
        }
  }
);

/**
 * GET /api/v1/sales/:id
 * Get single sale transaction by ID
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
            message: 'Invalid transaction ID',
          },
        });
      }

      const sale = await getSaleById(transactionId, req.businessId);

      res.json({
        success: true,
        data: sale,
      });
    } catch (error) {
      if (error.message === 'Transaction not found') {
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
 * POST /api/v1/sales/:id/complete
 * Complete a draft transaction (change to 'final' and deduct stock)
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
            message: 'Invalid transaction ID',
          },
        });
      }

      const transaction = await completeSale(transactionId, req.businessId);

      res.json({
        success: true,
        data: transaction,
        message: 'Transaction completed successfully',
      });
    } catch (error) {
      if (error.message === 'Transaction not found') {
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

