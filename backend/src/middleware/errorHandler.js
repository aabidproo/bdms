const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');

/**
 * Centralized error-handling middleware.
 * Catches Zod validation errors, Prisma errors, and generic errors.
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // ── Zod Validation Errors ──
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  // ── Prisma Unique Constraint Violation (P2002) ──
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = err.meta?.target;
      return res.status(400).json({
        success: false,
        message: `A record with this ${target} already exists.`,
      });
    }
  }

  // ── Custom App Errors (with statusCode) ──
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // ── Generic / Unexpected Errors ──
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

module.exports = errorHandler;
