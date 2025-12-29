/**
 * Rental Routes
 * Handles all rental booking-related API endpoints
 */

import express from 'express';
import { authenticateUser, attachBusinessContext, requirePermission } from '../middleware/auth.js';
import { auditLogger } from '../middleware/auditLogger.js';
import {
  createRentalBooking,
  getRentalBookings,
  updateRentalBookingStatus,
  getRentableProducts,
  checkDateConflicts,
} from '../services/rentalService.js';

const router = express.Router();

/**
 * GET /api/v1/rentals/products
 * Get all rentable products
 */
router.get(
  '/products',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const products = await getRentableProducts(req.businessId);

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
 * GET /api/v1/rentals/check-conflicts
 * Check for date conflicts for a product
 */
router.get(
  '/check-conflicts',
  authenticateUser,
  attachBusinessContext,
  async (req, res, next) => {
    try {
      const { productId, pickupDate, returnDate, excludeBookingId } = req.query;

      if (!productId || !pickupDate || !returnDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: productId, pickupDate, returnDate',
          },
        });
      }

      const conflicts = await checkDateConflicts(
        parseInt(productId),
        pickupDate,
        returnDate,
        excludeBookingId ? parseInt(excludeBookingId) : null
      );

      res.json({
        success: true,
        data: conflicts,
        hasConflicts: conflicts.length > 0,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/rentals
 * Get all rental bookings with filters
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
        productId: req.query.product_id ? parseInt(req.query.product_id) : null,
        contactId: req.query.contact_id ? parseInt(req.query.contact_id) : null,
        startDate: req.query.start_date || null,
        endDate: req.query.end_date || null,
      };

      const result = await getRentalBookings(req.businessId, options);

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
 * POST /api/v1/rentals
 * Create a new rental booking
 * Requires: admin or manager role
 */
router.post(
  '/',
  authenticateUser,
  attachBusinessContext,
  requirePermission('sales.create'),
  async (req, res, next) => {
    try {
      const booking = await createRentalBooking(
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
        action: 'rental_booking_created',
        entityType: 'rental_booking',
        entityId: booking.id,
        details: {
          productId: booking.product_id,
          contactId: booking.contact_id,
          pickupDate: booking.pickup_date,
          returnDate: booking.return_date,
        },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      }).catch((err) => console.error('Audit log failed:', err));

      res.status(201).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      if (error.message.includes('Date conflict')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DATE_CONFLICT',
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
 * PATCH /api/v1/rentals/:id/status
 * Update rental booking status
 */
router.patch(
  '/:id/status',
  authenticateUser,
  attachBusinessContext,
  requirePermission('sales.edit'),
  async (req, res, next) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { status, actualReturnDate, penaltyAmount, notes } = req.body;

      if (isNaN(bookingId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid booking ID',
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

      const booking = await updateRentalBookingStatus(
        bookingId,
        status,
        req.businessId,
        actualReturnDate,
        penaltyAmount,
        notes
      );

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      if (error.message === 'Rental booking not found') {
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

