/**
 * Product Routes
 * Handles all product-related API endpoints
 */

import express from 'express';
import { authenticateUser, attachBusinessContext, requirePermission } from '../middleware/auth.js';
import { auditLogger } from '../middleware/auditLogger.js';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
} from '../services/productService.js';

const router = express.Router();

/**
 * GET /api/v1/products
 * Get all products with pagination and filters
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
        search: req.query.search || null,
        categoryId: req.query.category_id ? parseInt(req.query.category_id) : null,
        brandId: req.query.brand_id ? parseInt(req.query.brand_id) : null,
        isInactive: req.query.is_inactive === 'true',
      };

      const result = await getProducts(req.businessId, options);

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
 * GET /api/v1/products/search
 * Quick search products
 */
router.get(
  '/search',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const searchTerm = req.query.q;
      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search term (q) is required',
          },
        });
      }

      const limit = parseInt(req.query.limit) || 10;
      const products = await searchProducts(req.businessId, searchTerm, limit);

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/products/:id
 * Get single product by ID
 */
router.get(
  '/:id',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product ID',
          },
        });
      }

      const product = await getProductById(productId, req.businessId);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error.message === 'Product not found') {
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
 * POST /api/v1/products
 * Create a new product
 * Requires: admin or manager role
 */
router.post(
  '/',
  authenticateUser,
  attachBusinessContext,
  requirePermission('products.create'),
  async (req, res, next) => {
    try {
      const product = await createProduct(
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
        action: 'product_created',
        entityType: 'product',
        entityId: product.id,
        details: { sku: product.sku, name: product.name },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      }).catch((err) => console.error('Audit log failed:', err));

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_SKU',
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
 * PUT /api/v1/products/:id
 * Update a product
 * Requires: admin or manager role
 */
router.put(
  '/:id',
  authenticateUser,
  attachBusinessContext,
  requirePermission('products.edit'),
  async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product ID',
          },
        });
      }

      const product = await updateProduct(
        productId,
        req.body,
        req.businessId
      );

      // Log audit trail
      const { createAuditLog } = await import('../services/auditService.js');
      createAuditLog({
        businessId: req.businessId,
        userId: req.user.id,
        userRole: req.userRole,
        action: 'product_updated',
        entityType: 'product',
        entityId: productId,
        details: { changes: req.body },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      }).catch((err) => console.error('Audit log failed:', err));

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_SKU',
            message: error.message,
          },
        });
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/products/:id
 * Delete a product (soft delete)
 * Requires: admin role only
 */
router.delete(
  '/:id',
  authenticateUser,
  attachBusinessContext,
  requirePermission('products.delete'),
  async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product ID',
          },
        });
      }

      await deleteProduct(productId, req.businessId);

      // Log audit trail
      const { createAuditLog } = await import('../services/auditService.js');
      createAuditLog({
        businessId: req.businessId,
        userId: req.user.id,
        userRole: req.userRole,
        action: 'product_deleted',
        entityType: 'product',
        entityId: productId,
        details: {},
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      }).catch((err) => console.error('Audit log failed:', err));

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      if (error.message === 'Product not found') {
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

