/**
 * Reports Routes
 * Handles all report API endpoints
 */

import express from 'express';
import { authenticateUser, attachBusinessContext, requirePermission } from '../middleware/auth.js';
import { requireFeature } from '../middleware/featureGuard.js';
import {
  getInventoryReport,
  getSalesSummary,
  getPurchaseSummary,
} from '../services/reportService.js';

const router = express.Router();

/**
 * GET /api/v1/reports/inventory
 * Get inventory report (current stock per product/location)
 */
router.get(
  '/inventory',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const options = {
        locationId: req.query.location_id ? parseInt(req.query.location_id) : null,
        productId: req.query.product_id ? parseInt(req.query.product_id) : null,
        categoryId: req.query.category_id ? parseInt(req.query.category_id) : null,
        lowStockOnly: req.query.low_stock_only === 'true',
      };

      const result = await getInventoryReport(req.businessId, options);

      res.json({
        success: true,
        data: result.data,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/sales
 * Get sales summary report
 */
router.get(
  '/sales',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const options = {
        dateFrom: req.query.date_from || null,
        dateTo: req.query.date_to || null,
        locationId: req.query.location_id ? parseInt(req.query.location_id) : null,
        groupBy: req.query.group_by || 'day',
      };

      const result = await getSalesSummary(req.businessId, options);

      res.json({
        success: true,
        data: result.data,
        summary: result.summary,
        period: result.period,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/purchases
 * Get purchase summary report
 */
router.get(
  '/purchases',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const options = {
        dateFrom: req.query.date_from || null,
        dateTo: req.query.date_to || null,
        locationId: req.query.location_id ? parseInt(req.query.location_id) : null,
      };

      const result = await getPurchaseSummary(req.businessId, options);

      res.json({
        success: true,
        data: result.data,
        summary: result.summary,
        period: result.period,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

