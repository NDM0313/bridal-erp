/**
 * Purchase Routes
 * Handles all purchase-related API endpoints
 */

import express from 'express';
import { authenticateUser, attachBusinessContext } from '../middleware/auth.js';
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  completePurchase,
} from '../services/purchaseService.js';

const router = express.Router();

/**
 * POST /api/v1/purchases
 * Create a new purchase transaction
 */
router.post(
  '/',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const result = await createPurchase(req.body, req.businessId, req.user.id);

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
      next(error);
    }
  }
);

/**
 * GET /api/v1/purchases
 * Get all purchase transactions with pagination and filters
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

      const result = await getPurchases(req.businessId, options);

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
 * GET /api/v1/purchases/:id
 * Get single purchase transaction by ID
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

      const purchase = await getPurchaseById(transactionId, req.businessId);

      res.json({
        success: true,
        data: purchase,
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
 * POST /api/v1/purchases/:id/complete
 * Complete a draft purchase (change to 'final' and increase stock)
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

      const transaction = await completePurchase(transactionId, req.businessId);

      res.json({
        success: true,
        data: transaction,
        message: 'Purchase completed successfully',
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
      next(error);
    }
  }
);

export default router;

