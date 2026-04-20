const prisma = require('../lib/prisma');

// ─── POST /api/requests ─────────────────────────────────
const submitRequest = async (req, res, next) => {
  try {
    const { bloodGroup, units, urgency, hospital } = req.body;

    if (!bloodGroup || !units || !hospital) {
      return res.status(400).json({ success: false, message: 'Blood group, units, and hospital are required.' });
    }

    // Get recipient profile
    const recipientProfile = await prisma.recipientProfile.findUnique({
      where: { userId: req.user.userId }
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

module.exports = {
  submitRequest,
  getMyRequests,
};
