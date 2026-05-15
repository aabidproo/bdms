const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// GET /api/users/profile
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId; // Provided by auth middleware

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        donorProfile: true,
        recipientProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const { password, ...userWithoutPassword } = user;
    return res.status(200).json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name, email, phone, address, bloodType, medicalCondition } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { donorProfile: true, recipientProfile: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check email uniqueness if email is changing
    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already in use.' });
      }
    }

    // Update User and Profile in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update basic user info
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { name, email },
      });

      let updatedProfile = null;
      if (user.role === 'DONOR' && user.donorProfile) {
        updatedProfile = await tx.donorProfile.update({
          where: { id: user.donorProfile.id },
          data: { phone, address, bloodType, medicalCondition },
        });
      } else if (user.role === 'RECIPIENT' && user.recipientProfile) {
        updatedProfile = await tx.recipientProfile.update({
          where: { id: user.recipientProfile.id },
          data: { phone, address, bloodType, medicalCondition },
        });
      }

      return { user: updatedUser, profile: updatedProfile };
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/password
const updatePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully!',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
};
