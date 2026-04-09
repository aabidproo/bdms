const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

const SALT_ROUNDS = 10;

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

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: {
        user: userWithoutPassword,
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

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        token,
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
};
