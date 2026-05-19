const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

const formatUser = (user) => {
  if (!user) return null;
  const roles = user.user_roles ? user.user_roles.split(',').map(r => r.trim().toLowerCase()) : [];
  return {
    ...user,
    user_roles: roles,
    last_active_role: user.last_active_role ? user.last_active_role.toLowerCase() : roles[0] || 'donor'
  };
};

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
      data: formatUser(userWithoutPassword),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name, email, phone, address, bloodType, medicalCondition, avatar } = req.body;

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
        data: { name, email, avatar },
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

const updateActiveRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || (role !== 'donor' && role !== 'recipient')) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be "donor" or "recipient".' });
    }

    const userId = req.user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Verify user actually has this role
    const roles = user.user_roles ? user.user_roles.split(',').map(r => r.trim().toLowerCase()) : [];
    if (!roles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Access denied. You do not have this role.' });
    }

    // Update last_active_role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { last_active_role: role }
    });

    const { password, ...userWithoutPassword } = updatedUser;

    return res.status(200).json({
      success: true,
      message: `Active role switched to ${role} successfully!`,
      data: formatUser(userWithoutPassword)
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/user/add-role — Auto-provision the second role (no re-registration)
const addRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || (role !== 'donor' && role !== 'recipient')) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be "donor" or "recipient".' });
    }

    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { donorProfile: true, recipientProfile: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check if user already has this role
    const existingRoles = user.user_roles ? user.user_roles.split(',').map(r => r.trim().toLowerCase()) : [];
    if (existingRoles.includes(role)) {
      return res.status(200).json({ success: true, message: 'You already have this role.', data: formatUser(user) });
    }

    // Auto-create the missing profile by copying from existing profile
    const existingProfile = user.donorProfile || user.recipientProfile;
    const sharedData = {
      phone: existingProfile?.phone || '',
      address: existingProfile?.address || '',
      bloodType: existingProfile?.bloodType || 'O+',
      medicalCondition: existingProfile?.medicalCondition || 'None',
    };

    await prisma.$transaction(async (tx) => {
      // Create the missing profile
      if (role === 'donor' && !user.donorProfile) {
        await tx.donorProfile.create({
          data: {
            userId,
            ...sharedData,
            dateOfBirth: new Date('2000-01-01'),
            gender: 'Not specified',
            weight: 60,
          }
        });
      } else if (role === 'recipient' && !user.recipientProfile) {
        await tx.recipientProfile.create({
          data: {
            userId,
            ...sharedData,
          }
        });
      }

      // Update user_roles to include both roles
      const newRoles = [...new Set([...existingRoles, role])].join(',');
      await tx.user.update({
        where: { id: userId },
        data: {
          user_roles: newRoles,
          last_active_role: role, // Switch to the newly added role
        }
      });
    });

    // Fetch the fresh user with both profiles
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { donorProfile: true, recipientProfile: true }
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return res.status(200).json({
      success: true,
      message: `You are now also a ${role}! Switching dashboard...`,
      data: formatUser(userWithoutPassword)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
  updateActiveRole,
  addRole,
};
