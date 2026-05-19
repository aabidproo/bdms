const jwt = require('jsonwebtoken');

/**
 * JWT authentication middleware.
 * Verifies the Bearer token from the Authorization header
 * and attaches { userId, role } to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const prisma = require('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. User not found.',
      });
    }

    // For ADMIN users, always preserve their ADMIN role.
    // The last_active_role toggle only applies to donor/recipient users.
    let effectiveRole = user.role.toUpperCase();
    if (user.role !== 'ADMIN' && user.last_active_role) {
      effectiveRole = user.last_active_role.toUpperCase();
    }

    req.user = {
      userId: decoded.userId,
      role: effectiveRole,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

module.exports = authenticate;
