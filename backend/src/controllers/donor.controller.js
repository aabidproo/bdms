const prisma = require('../lib/prisma');

// GET /api/donor/profile
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        donorProfile: true // Join with donor profile
      }
    });

    if (!user || user.role !== 'DONOR') {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found.'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/donor/eligibility
const checkEligibility = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const profile = await prisma.donorProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Donor profile not found' });
    }

    if (!profile.lastDonationDate) {
      return res.json({ 
        success: true, 
        data: { eligible: true, nextEligibleDate: null } 
      });
    }

    const lastDate = new Date(profile.lastDonationDate);
    const nextEligibleDate = new Date(lastDate);
    nextEligibleDate.setDate(lastDate.getDate() + 60);

    const isEligible = new Date() >= nextEligibleDate;

    res.json({
      success: true,
      data: {
        eligible: isEligible,
        nextEligibleDate: nextEligibleDate.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  checkEligibility
};
