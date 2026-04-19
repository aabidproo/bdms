const prisma = require('../lib/prisma');

// ─── GET /api/admin/users ───────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/stats ───────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const totalUsers = await prisma.user.count();
    const pendingRequests = await prisma.bloodRequest.count({ where: { status: 'PENDING' } });
    const inventory = await prisma.bloodInventory.findMany();
    const totalUnits = inventory.reduce((sum, item) => sum + item.units, 0);
    const scheduledDonations = await prisma.donation.count({ where: { status: 'SCHEDULED' } });

    res.json({
      success: true,
      data: { totalUsers, pendingRequests, totalUnits, scheduledDonations }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/stock ───────────────────────────────
const getStock = async (req, res, next) => {
  try {
    const { search, sort } = req.query;
    let inventory = await prisma.bloodInventory.findMany();

    if (search) {
      inventory = inventory.filter(i =>
        i.bloodGroup.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sort === 'stock_low') {
      inventory.sort((a, b) => a.units - b.units);
    } else if (sort === 'stock_high') {
      inventory.sort((a, b) => b.units - a.units);
    }

    res.json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/stock ──────────────────────────────
const addStock = async (req, res, next) => {
  try {
    const { bloodGroup, units } = req.body;
    const parsedUnits = parseInt(units);

    if (!bloodGroup || isNaN(parsedUnits) || parsedUnits < 1) {
      return res.status(400).json({ success: false, message: 'Valid blood group and units required.' });
    }

    const updated = await prisma.bloodInventory.upsert({
      where: { bloodGroup },
      update: { units: { increment: parsedUnits } },
      create: { bloodGroup, units: parsedUnits },
    });

    res.json({ success: true, message: `Added ${parsedUnits} units of ${bloodGroup}`, data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/admin/stock/:id ────────────────────────
const deleteStock = async (req, res, next) => {
  try {
    await prisma.bloodInventory.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Stock entry removed.' });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/requests ────────────────────────────
const getRequests = async (req, res, next) => {
  try {
    const requests = await prisma.bloodRequest.findMany({
      include: {
        recipientProfile: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/requests/:id/status ─────────────────
// When APPROVED → auto-decrement inventory
const updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const request = await prisma.bloodRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Auto-decrement inventory when approving
    if (status === 'APPROVED' && request.status === 'PENDING') {
      const inventory = await prisma.bloodInventory.findUnique({
        where: { bloodGroup: request.bloodGroup }
      });

      if (!inventory || inventory.units < request.units) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${request.bloodGroup} stock. Available: ${inventory?.units || 0}, Requested: ${request.units}`
        });
      }

      await prisma.bloodInventory.update({
        where: { bloodGroup: request.bloodGroup },
        data: { units: { decrement: request.units } }
      });
    }

    const updated = await prisma.bloodRequest.update({
      where: { id },
      data: { status }
    });

    res.json({ success: true, message: `Request ${status.toLowerCase()}.`, data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/donations ───────────────────────────
const getDonations = async (req, res, next) => {
  try {
    const donations = await prisma.donation.findMany({
      include: {
        donorProfile: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: donations });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/donations/:id/status ────────────────
// When COMPLETED → auto-increment inventory
const updateDonationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const donation = await prisma.donation.findUnique({ where: { id } });
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    // Auto-increment inventory when completing
    if (status === 'COMPLETED' && donation.status === 'SCHEDULED') {
      await prisma.bloodInventory.upsert({
        where: { bloodGroup: donation.bloodType },
        update: { units: { increment: donation.units } },
        create: { bloodGroup: donation.bloodType, units: donation.units },
      });

      // Update donor's last donation date
      await prisma.donorProfile.update({
        where: { id: donation.donorProfileId },
        data: { lastDonationDate: new Date() }
      });
    }

    const updated = await prisma.donation.update({
      where: { id },
      data: { status }
    });

    res.json({ success: true, message: `Donation marked as ${status.toLowerCase()}.`, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getStats,
  getStock,
  addStock,
  deleteStock,
  getRequests,
  updateRequestStatus,
  getDonations,
  updateDonationStatus,
};
