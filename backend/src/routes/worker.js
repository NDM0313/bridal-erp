/**
 * Worker Routes
 * Production worker mobile-friendly API endpoints
 * 
 * PHASE B: Production Worker Flow
 * - Restricted access: workers can only access their assigned steps
 * - Mobile-optimized: flat JSON responses, minimal payload
 */

import express from 'express';
import { authenticateUser, attachBusinessContext, requireRole } from '../middleware/auth.js';
import {
  getAssignedSteps,
  updateStepProgress,
  updateStepStatus,
} from '../services/workerService.js';

const router = express.Router();

/**
 * GET /api/v1/worker/steps
 * Get assigned production steps for logged-in worker
 * Mobile-friendly: Returns only assigned steps, excludes completed by default
 */
router.get(
  '/steps',
  authenticateUser,
  attachBusinessContext,
  requireRole('production_worker', 'admin', 'manager'),
  async (req, res, next) => {
    try {
      const includeCompleted = req.query.include_completed === 'true';

      const steps = await getAssignedSteps(
        req.user.id,
        req.businessId,
        { includeCompleted }
      );

      res.json({
        success: true,
        data: steps,
        count: steps.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/worker/steps/:id/progress
 * Update step progress (completed_qty)
 * Auto-updates status based on quantity
 */
router.patch(
  '/steps/:id/progress',
  authenticateUser,
  attachBusinessContext,
  requireRole('production_worker', 'admin', 'manager'),
  async (req, res, next) => {
    try {
      const stepId = parseInt(req.params.id);
      const { completed_qty } = req.body;

      if (isNaN(stepId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid step ID',
          },
        });
      }

      if (completed_qty === undefined || completed_qty === null) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'completed_qty is required',
          },
        });
      }

      if (typeof completed_qty !== 'number' || completed_qty < 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'completed_qty must be a non-negative number',
          },
        });
      }

      const updatedStep = await updateStepProgress(
        stepId,
        completed_qty,
        req.user.id,
        req.businessId
      );

      res.json({
        success: true,
        data: updatedStep,
      });
    } catch (error) {
      if (error.message === 'Production step not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STEP_NOT_FOUND',
            message: error.message,
          },
        });
      }

      if (error.message.includes('not assigned')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: error.message,
          },
        });
      }

      if (error.message.includes('cannot exceed') || error.message.includes('cannot be negative')) {
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
 * PATCH /api/v1/worker/steps/:id/status
 * Update step status (with validation)
 * Enforces valid status transitions
 */
router.patch(
  '/steps/:id/status',
  authenticateUser,
  attachBusinessContext,
  requireRole('production_worker', 'admin', 'manager'),
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
            message: 'status is required',
          },
        });
      }

      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          },
        });
      }

      const updatedStep = await updateStepStatus(
        stepId,
        status,
        req.user.id,
        req.businessId
      );

      res.json({
        success: true,
        data: updatedStep,
      });
    } catch (error) {
      if (error.message === 'Production step not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STEP_NOT_FOUND',
            message: error.message,
          },
        });
      }

      if (error.message.includes('not assigned')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: error.message,
          },
        });
      }

      if (error.message.includes('Invalid status transition') || 
          error.message.includes('Cannot mark as completed')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: error.message,
          },
        });
      }

      next(error);
    }
  }
);

export default router;
