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
// Queries BloodInventory directly and groups by bloodGroup
const getStock = async (req, res, next) => {
  try {
    const { search } = req.query;

    const inventory = await prisma.bloodInventory.findMany({
      where: search ? { bloodGroup: { contains: search } } : {},
      orderBy: { donationDate: 'asc' } // Oldest first for batches
    });

    // Grouping logic
    const grouped = inventory.reduce((acc, item) => {
      const bg = item.bloodGroup;
      if (!acc[bg]) {
        acc[bg] = {
          bloodGroup: bg,
          totalUnits: 0,
          donorCount: 0,
          donors: new Set(),
          donations: []
        };
      }
      
      acc[bg].totalUnits += item.units;
      if (item.donorName) {
        acc[bg].donors.add(item.donorName);
      }
      
      // Calculate expiry (42 days from donationDate)
      const donationDate = item.donationDate || item.createdAt;
      const expiryDate = new Date(donationDate);
      expiryDate.setDate(expiryDate.getDate() + 42);

      acc[bg].donations.push({
        id: item.id,
        donorName: item.donorName || 'Unknown',
        units: item.units,
        donationDate: donationDate,
        expiryDate: expiryDate,
        rbcCount: item.rbcCount,
        plasmaCount: item.plasmaCount
      });
      
      return acc;
    }, {});

    // Transform into final array structure
    const result = Object.values(grouped).map(group => ({
      bloodGroup: group.bloodGroup,
      totalUnits: group.totalUnits,
      donorCount: group.donors.size,
      donations: group.donations
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/stock/:id ───────────────────────────
const updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bloodGroup, units, donationDate, rbcCount, plasmaCount } = req.body;

    const updated = await prisma.bloodInventory.update({
      where: { id },
      data: {
        bloodGroup,
        units: parseInt(units),
        donationDate: donationDate ? new Date(donationDate) : undefined,
        rbcCount: rbcCount ? parseFloat(rbcCount) : undefined,
        plasmaCount: plasmaCount ? parseFloat(plasmaCount) : undefined
      }
    });

    res.json({ success: true, message: 'Inventory record updated.', data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/stock ──────────────────────────────
const addStock = async (req, res, next) => {
  try {
    const { bloodGroup, units, donorName, donationDate, rbcCount, plasmaCount } = req.body;
    const parsedUnits = parseInt(units);

    if (!bloodGroup || isNaN(parsedUnits) || parsedUnits < 1) {
      return res.status(400).json({ success: false, message: 'Valid blood group and units required.' });
    }

    // Auto-calculate expiryDate: donationDate + 42 days
    const baseDate = donationDate ? new Date(donationDate) : new Date();
    const expiryDate = new Date(baseDate);
    expiryDate.setDate(expiryDate.getDate() + 42);

    const newBatch = await prisma.bloodInventory.create({
      data: {
        bloodGroup,
        units: parsedUnits,
        donorName: donorName || 'Manual Entry',
        donationDate: baseDate,
        expiryDate: expiryDate,
        rbcCount: rbcCount ? parseFloat(rbcCount) : null,
        plasmaCount: plasmaCount ? parseFloat(plasmaCount) : null
      },
    });

    res.json({ success: true, message: `Added ${parsedUnits} units of ${bloodGroup} to inventory.`, data: newBatch });
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

    // FIFO Stock Deduction for APPROVED requests
    if (status === 'APPROVED' && request.status === 'PENDING') {
      const batches = await prisma.bloodInventory.findMany({
        where: { bloodGroup: request.bloodGroup },
        orderBy: { donationDate: 'asc' } // Oldest first
      });

      const totalAvailable = batches.reduce((sum, b) => sum + b.units, 0);

      if (totalAvailable < request.units) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${request.bloodGroup} stock. Available: ${totalAvailable}, Requested: ${request.units}`
        });
      }

      let unitsToDeduct = request.units;
      for (const batch of batches) {
        if (unitsToDeduct <= 0) break;

        if (batch.units <= unitsToDeduct) {
          unitsToDeduct -= batch.units;
          await prisma.bloodInventory.delete({ where: { id: batch.id } });
        } else {
          await prisma.bloodInventory.update({
            where: { id: batch.id },
            data: { units: batch.units - unitsToDeduct }
          });
          unitsToDeduct = 0;
        }
      }
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

    // Create new inventory batch when completing donation
    if (status === 'COMPLETED' && donation.status === 'SCHEDULED') {
      // Get donor name
      const donor = await prisma.donorProfile.findUnique({
        where: { id: donation.donorProfileId },
        include: { user: { select: { name: true } } }
      });

      await prisma.bloodInventory.create({
        data: {
          bloodGroup: donation.bloodType,
          units: donation.units,
          donorName: donor?.user?.name || 'Anonymous',
          donationDate: new Date(),
          rbcCount: donation.rbcCount,
          plasmaCount: donation.plasmaCount
        }
      });

      // Update donor's last donation date
      await prisma.donorProfile.update({
        where: { id: donation.donorProfileId },
        data: { lastDonationDate: new Date() }
      });
    }

    const updated = await prisma.donation.update({
      where: { id },
      data: { 
        status,
        donationDate: status === 'COMPLETED' ? new Date() : undefined
      }
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
  updateStock,
  getRequests,
  updateRequestStatus,
  getDonations,
  updateDonationStatus,
};
