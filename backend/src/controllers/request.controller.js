const prisma = require('../lib/prisma');
const { createNotification } = require('./notification.controller');

// ─── POST /api/requests ─────────────────────────────────
const submitRequest = async (req, res, next) => {
  try {
    const { bloodGroup, units, urgency, hospital } = req.body;

    if (!bloodGroup || !units || !hospital) {
      return res.status(400).json({ success: false, message: 'Blood group, units, and hospital are required.' });
    }

    // Get recipient profile
    const recipientProfile = await prisma.recipientProfile.findUnique({
      where: { userId: req.user.userId },
      include: { user: true }
    });

    if (!recipientProfile) {
      return res.status(404).json({ success: false, message: 'Recipient profile not found.' });
    }

    const request = await prisma.bloodRequest.create({
      data: {
        recipientProfileId: recipientProfile.id,
        bloodGroup,
        units: parseInt(units),
        urgency: urgency || 'Normal',
        hospital,
        status: 'PENDING',
      }
    });

    // Notify Recipient
    await createNotification(
      req.user.userId,
      'Blood Request Submitted 📥',
      `Your request for ${units} units of ${bloodGroup} at ${hospital} (Urgency: ${urgency || 'Normal'}) has been successfully submitted.`,
      'info'
    );

    // Notify Admins
    await createNotification(
      null, // Admin notification
      urgency === 'Urgent' ? '🚨 URGENT Blood Request Received' : '📋 New Blood Request Triage Required',
      `Patient ${recipientProfile.user?.name || 'Anonymous'} has requested ${units} units of ${bloodGroup} at ${hospital} with ${urgency || 'Normal'} priority.`,
      urgency === 'Urgent' ? 'danger' : 'warning'
    );

    res.status(201).json({
      success: true,
      message: 'Blood request submitted successfully!',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/requests/my ───────────────────────────────
const getMyRequests = async (req, res, next) => {
  try {
    const recipientProfile = await prisma.recipientProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!recipientProfile) {
      return res.json({ success: true, data: [], stats: { fulfilled: 0, pending: 0 } });
    }

    const requests = await prisma.bloodRequest.findMany({
      where: { recipientProfileId: recipientProfile.id },
      orderBy: { createdAt: 'desc' }
    });

    const fulfilled = requests.filter(r => r.status === 'FULFILLED' || r.status === 'APPROVED').length;
    const pending = requests.filter(r => r.status === 'PENDING').length;

    res.json({
      success: true,
      data: requests,
      stats: { fulfilled, pending, bloodType: recipientProfile.bloodType }
    });
  } catch (error) {
    next(error);
  }
};

const getMatchedDonors = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const bloodRequest = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: {
        recipientProfile: true
      }
    });

    if (!bloodRequest) {
      return res.status(404).json({ success: false, message: 'Blood request not found.' });
    }

    // Verify ownership: must be the recipient who made the request
    if (bloodRequest.recipientProfile.userId !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied. You do not own this request.' });
    }

    // Find all donors with matching blood group
    const matchedDonors = await prisma.donorProfile.findMany({
      where: {
        bloodType: bloodRequest.bloodGroup
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: matchedDonors
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitRequest,
  getMyRequests,
  getMatchedDonors,
};
