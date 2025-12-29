/**
 * Error Handling Middleware
 * Centralized error handling for Express
 * 
 * PRODUCTION: Logs errors for monitoring
 */

import { logError } from '../services/monitoringService.js';

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // PRODUCTION: Log error for monitoring
  if (process.env.NODE_ENV === 'production') {
    logError({
      error: err,
      context: {
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
      },
      severity: err.statusCode >= 500 ? 'critical' : 'error',
      organizationId: req.organizationId,
      userId: req.user?.id,
    }).catch(console.error); // Don't block error response
  }

  // Supabase errors
  if (err.code && err.code.startsWith('PGRST')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        details: err.message,
      },
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors || err.message,
      },
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

