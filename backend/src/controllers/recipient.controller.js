const prisma = require('../lib/prisma');

// GET /api/recipient/profile
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
        recipientProfile: true // Join with recipient profile
      }
    });

    if (!user || user.role !== 'RECIPIENT') {
      return res.status(404).json({
        success: false,
        message: 'Recipient profile not found.'
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

// POST /api/recipient/request
const submitRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { bloodGroup, units, urgency, hospital, notes } = req.body;

    const request = await prisma.bloodRequest.create({
      data: {
        userId,
        bloodGroup,
        units: parseInt(units),
        urgency,
        hospital,
        notes: notes || null
      }
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// GET /api/recipient/requests
const getRequests = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const requests = await prisma.bloodRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  submitRequest,
  getRequests
};
