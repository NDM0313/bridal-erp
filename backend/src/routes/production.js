/**
 * Production Routes
 * Handles all custom studio / manufacturing-related API endpoints
 */

import express from 'express';
import { authenticateUser, attachBusinessContext, requirePermission } from '../middleware/auth.js';
import { auditLogger } from '../middleware/auditLogger.js';
import {
  createProductionOrder,
  getProductionOrders,
  updateProductionStepStatus,
  updateProductionOrderStatus,
} from '../services/productionService.js';

const router = express.Router();

/**
 * GET /api/v1/production
 * Get all production orders with filters
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
        status: req.query.status || null,
        customerId: req.query.customer_id ? parseInt(req.query.customer_id) : null,
        vendorId: req.query.vendor_id ? parseInt(req.query.vendor_id) : null,
      };

      const result = await getProductionOrders(req.businessId, options);

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
 * POST /api/v1/production
 * Create a new production order
 * Requires: admin or manager role
 */
router.post(
  '/',
  authenticateUser,
  attachBusinessContext,
  requirePermission('products.create'),
  async (req, res, next) => {
    try {
      const order = await createProductionOrder(
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
        action: 'production_order_created',
        entityType: 'production_order',
        entityId: order.id,
        details: {
          orderNo: order.order_no,
          customerId: order.customer_id,
          totalCost: order.total_cost,
        },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      }).catch((err) => console.error('Audit log failed:', err));

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_ORDER_NO',
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
 * PATCH /api/v1/production/:id/status
 * Update production order status
 */
router.patch(
  '/:id/status',
  authenticateUser,
  attachBusinessContext,
  requirePermission('products.edit'),
  async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status, assigned_vendor_id } = req.body;

      if (isNaN(orderId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid order ID',
          },
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status is required',
          },
        });
      }

      // Validate assigned_vendor_id if provided
      let vendorId = null;
      if (assigned_vendor_id !== undefined && assigned_vendor_id !== null) {
        vendorId = parseInt(assigned_vendor_id);
        if (isNaN(vendorId)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid vendor ID',
            },
          });
        }
      }

      const order = await updateProductionOrderStatus(
        orderId,
        status,
        req.businessId,
        vendorId
      );

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      if (error.message === 'Production order not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
      if (error.message.includes('Invalid status')) {
        return res.status(400).json({
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
 * PATCH /api/v1/production/steps/:id/status
 * Update production step status (triggers vendor payment)
 */
router.patch(
  '/steps/:id/status',
  authenticateUser,
  attachBusinessContext,
  requirePermission('products.edit'),
  async (req, res, next) => {
    try {
      const stepId = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(stepId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid step ID',
          },
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status is required',
          },
        });
      }

      const step = await updateProductionStepStatus(
        stepId,
        status,
        req.businessId,
        req.user.id
      );

      res.json({
        success: true,
        data: step,
      });
    } catch (error) {
      if (error.message === 'Production step not found') {
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

export default router;

