const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const SALT_ROUNDS = 10;
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validators/auth.validator');
const { sendPasswordResetEmail } = require('../lib/mailer');

const formatUser = (user) => {
  if (!user) return null;
  const roles = user.user_roles ? user.user_roles.split(',').map(r => r.trim().toLowerCase()) : [];
  return {
    ...user,
    user_roles: roles,
    last_active_role: user.last_active_role ? user.last_active_role.toLowerCase() : roles[0] || 'donor'
  };
};

// ─── POST /api/auth/register ────────────────────────────
const register = async (req, res, next) => {
  try {
    // 1. Validate request body
    const validated = registerSchema.parse(req.body);

    const {
      email,
      password,
      name,
      role,
      phone,
      dateOfBirth,
      gender,
      address,
      bloodType,
      weight,
      lastDonationDate,
      medicalCondition,
    } = validated;

    // 2. Check for existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please use a different email or login.',
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Transactional creation: User + Profile
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          user_roles: role.toLowerCase(),
          last_active_role: role.toLowerCase(),
        },
      });

      let profile = null;

      if (role === 'DONOR') {
        profile = await tx.donorProfile.create({
          data: {
            userId: user.id,
            phone,
            dateOfBirth: new Date(dateOfBirth),
            gender,
            address,
            bloodType,
            weight,
            lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : null,
            medicalCondition: medicalCondition || null,
          },
        });
      }

      if (role === 'RECIPIENT') {
        profile = await tx.recipientProfile.create({
          data: {
            userId: user.id,
            phone,
            address,
            bloodType,
            medicalCondition: medicalCondition || null,
          },
        });
      }

      return { user, profile };
    });

    // 5. Return response (exclude password)
    const { password: _, ...userWithoutPassword } = result.user;
    const formattedUser = formatUser(userWithoutPassword);

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: {
        user: formattedUser,
        profile: result.profile,
      },
    });
  } catch (error) {
    next(error); // → centralized error handler
  }
};

// ─── POST /api/auth/login ───────────────────────────────
const login = async (req, res, next) => {
  try {
    // 1. Validate request body
    const validated = loginSchema.parse(req.body);
    const { email, password } = validated;

    // 2. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        donorProfile: true,
        recipientProfile: true,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 5. Return token + user (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    const formattedUser = formatUser(userWithoutPassword);

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        token,
        user: formattedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/logout ──────────────────────────────
const logout = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/forgot-password ─────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user doesn't exist for security
      return res.status(200).json({
        success: true,
        message: 'If this email exists, a reset link has been sent.',
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Set expiry to 1 hour from now
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    // Save to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry,
      },
    });

    // Send email
    await sendPasswordResetEmail(email, token);

    return res.status(200).json({
      success: true,
      message: 'If this email exists, a reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/reset-password ──────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Look for user with valid, unexpired token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired.',
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update user: change password, clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
};
