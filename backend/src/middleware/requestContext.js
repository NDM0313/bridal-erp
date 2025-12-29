/**
 * Request Context Middleware
 * Attaches business_id and other context to request
 * Should be used after authentication middleware
 */

/**
 * Middleware to attach business context to request
 * Requires authenticateUser middleware to run first
 */
export function attachBusinessContext(req, res, next) {
  // business_id should already be attached by authenticateUser middleware
  if (!req.businessId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'NO_BUSINESS_CONTEXT',
        message: 'Business context not available',
      },
    });
  }

  // Attach to request context for easy access
  req.context = {
    businessId: req.businessId,
    userId: req.user.id,
    userEmail: req.user.email,
  };

  next();
}

