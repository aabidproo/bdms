/**
 * Role-based authorization middleware.
 * Expects `req.user` to be populated by the `authenticate` middleware.
 * Returns 403 Forbidden if user role is not in the allowed list.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
    }
    next();
  };
};

module.exports = authorize;
