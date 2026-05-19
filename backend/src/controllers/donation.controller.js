const prisma = require('../lib/prisma');
const { createNotification } = require('./notification.controller');

// ─── POST /api/donations ────────────────────────────────
const scheduleDonation = async (req, res, next) => {
  try {
    const { location, scheduledDate } = req.body;

    if (!location || !scheduledDate) {
      return res.status(400).json({ success: false, message: 'Location and date are required.' });
    }

    // Get donor profile
    const donorProfile = await prisma.donorProfile.findUnique({
      where: { userId: req.user.userId },
      include: { user: true }
    });

    if (!donorProfile) {
      return res.status(404).json({ success: false, message: 'Donor profile not found.' });
    }

    const donation = await prisma.donation.create({
      data: {
        donorProfileId: donorProfile.id,
        bloodType: donorProfile.bloodType,
        units: 1,
        location,
        scheduledDate: new Date(scheduledDate),
        status: 'SCHEDULED',
      }
    });

    // Notify Donor
    const dateFormatted = new Date(scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    await createNotification(
      req.user.userId,
      'Donation Appointment Scheduled 🩸',
      `Your appointment to donate blood has been scheduled for ${dateFormatted} at ${location}. Thank you for your support!`,
      'success'
    );

    // Notify Admins
    await createNotification(
      null, // broad system/admin alert
      'New Donation Scheduled 📅',
      `Donor ${donorProfile.user?.name || 'Anonymous'} has scheduled a donation of blood type ${donorProfile.bloodType} at ${location} for ${dateFormatted}.`,
      'info'
    );

    res.status(201).json({
      success: true,
      message: 'Donation scheduled successfully!',
      data: donation
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/donations/my ──────────────────────────────
const getMyDonations = async (req, res, next) => {
  try {
    const donorProfile = await prisma.donorProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!donorProfile) {
      return res.json({ success: true, data: [] });
    }

    const donations = await prisma.donation.findMany({
      where: { donorProfileId: donorProfile.id },
      orderBy: { createdAt: 'desc' }
    });

    // Compute stats
    const completed = donations.filter(d => d.status === 'COMPLETED');
    const totalDonations = completed.length;
    const livesSaved = totalDonations * 3; // Each donation can save ~3 lives

    // Next eligible date (56 days after last completed donation)
    let nextEligible = null;
    if (completed.length > 0) {
      const lastCompleted = completed[0];
      const next = new Date(lastCompleted.updatedAt);
      next.setDate(next.getDate() + 56);
      nextEligible = next.toISOString();
    } else if (donorProfile.lastDonationDate) {
      const next = new Date(donorProfile.lastDonationDate);
      next.setDate(next.getDate() + 56);
      nextEligible = next.toISOString();
    }

    res.json({
      success: true,
      data: donations,
      stats: {
        totalDonations,
        livesSaved,
        nextEligible,
        bloodType: donorProfile.bloodType
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMatchedRequests = async (req, res, next) => {
  try {
    const donorProfile = await prisma.donorProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!donorProfile) {
      return res.status(404).json({ success: false, message: 'Donor profile not found.' });
    }

    const requests = await prisma.bloodRequest.findMany({
      where: {
        bloodGroup: donorProfile.bloodType,
        status: 'PENDING'
      },
      include: {
        recipientProfile: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scheduleDonation,
  getMyDonations,
  getMatchedRequests,
};
