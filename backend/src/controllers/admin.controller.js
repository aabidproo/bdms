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

// ─── Helper: Calculate expiry info for a batch ──────────
function calcExpiryInfo(item) {
  const donationDate = item.donationDate || item.createdAt;
  const expiryDate = item.expiryDate ? new Date(item.expiryDate) : new Date(donationDate);
  if (!item.expiryDate) {
    expiryDate.setDate(expiryDate.getDate() + 42);
  }

  const now = new Date();
  const diff = expiryDate - now;
  const daysRemaining = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  let expirationStatus = 'fresh';
  if (daysRemaining < 0) expirationStatus = 'expired';
  else if (daysRemaining <= 6) expirationStatus = 'critical';
  else if (daysRemaining <= 29) expirationStatus = 'expiring_soon';

  return { expiryDate, daysRemaining, hoursRemaining, expirationStatus };
}

// ─── GET /api/admin/stock ───────────────────────────────
const getStock = async (req, res, next) => {
  try {
    const { search } = req.query;

    const inventory = await prisma.bloodInventory.findMany({
      where: search ? { bloodGroup: { contains: search } } : {},
      orderBy: { donationDate: 'asc' }
    });

    const allGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const initialGrouped = allGroups.reduce((acc, bg) => {
      acc[bg] = {
        bloodGroup: bg,
        totalUnits: 0,
        donorCount: 0,
        donors: new Set(),
        donations: [],
        oldestBatchExpiration: null,
        groupExpirationStatus: 'fresh',
        groupDaysRemaining: null
      };
      return acc;
    }, {});

    const grouped = inventory.reduce((acc, item) => {
      const bg = item.bloodGroup;
      if (!acc[bg]) {
        // Fallback for unexpected groups not in initial list
        acc[bg] = {
          bloodType: bg,
          totalUnits: 0,
          donorCount: 0,
          donors: new Set(),
          donations: [],
          oldestBatchExpiration: null,
          groupExpirationStatus: 'fresh',
          groupDaysRemaining: null
        };
      }
      
      acc[bg].totalUnits += item.units;
      if (item.donorName) {
        acc[bg].donors.add(item.donorName);
      }
      
      const expiry = calcExpiryInfo(item);

      if (acc[bg].oldestBatchExpiration === null || expiry.expiryDate < acc[bg].oldestBatchExpiration) {
        acc[bg].oldestBatchExpiration = expiry.expiryDate;
        acc[bg].groupExpirationStatus = expiry.expirationStatus;
        acc[bg].groupDaysRemaining = expiry.daysRemaining;
      }

      acc[bg].donations.push({
        id: item.id,
        donorName: item.donorName || 'Unknown',
        units: item.units,
        donationDate: item.donationDate || item.createdAt,
        expiryDate: expiry.expiryDate,
        daysRemaining: expiry.daysRemaining,
        hoursRemaining: expiry.hoursRemaining,
        expirationStatus: expiry.expirationStatus,
        rbcCount: item.rbcCount,
        plasmaCount: item.plasmaCount,
        tested: item.tested,
        notes: item.notes
      });
      
      return acc;
    }, initialGrouped);

    const result = Object.values(grouped).map(group => ({
      bloodGroup: group.bloodGroup,
      totalUnits: group.totalUnits,
      donorCount: group.donors.size,
      donations: group.donations,
      oldestBatchExpiration: group.oldestBatchExpiration,
      groupExpirationStatus: group.groupExpirationStatus,
      groupDaysRemaining: group.groupDaysRemaining
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/inventory/summary ───────────────────
const getInventorySummary = async (req, res, next) => {
  try {
    const inventory = await prisma.bloodInventory.findMany();
    const now = new Date();

    const allGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const groups = allGroups.reduce((acc, bg) => {
      acc[bg] = { totalUnits: 0, oldestExpiry: null };
      return acc;
    }, {});
    let totalUnits = 0;

    inventory.forEach(item => {
      totalUnits += item.units;
      const bg = item.bloodGroup;
      if (!groups[bg]) {
        groups[bg] = { totalUnits: 0, oldestExpiry: null };
      }
      groups[bg].totalUnits += item.units;

      const expiry = calcExpiryInfo(item);
      if (groups[bg].oldestExpiry === null || expiry.daysRemaining < groups[bg].oldestExpiry) {
        groups[bg].oldestExpiry = expiry.daysRemaining;
      }
    });

    const criticalCount = Object.values(groups).filter(g => g.totalUnits <= 2).length;
    const expiringWeekCount = Object.values(groups).filter(g => g.oldestExpiry !== null && g.oldestExpiry <= 7).length;

    const lastUpdated = inventory.length > 0
      ? inventory.reduce((latest, item) => {
          const d = new Date(item.updatedAt);
          return d > latest ? d : latest;
        }, new Date(0))
      : now;

    res.json({
      success: true,
      data: { totalUnits, criticalCount, expiringWeekCount, lastUpdated: lastUpdated.toISOString(), bloodGroupCount: Object.keys(groups).length }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/stock/:bloodGroup/batches ───────────
const getBatchesByGroup = async (req, res, next) => {
  try {
    const { bloodGroup } = req.params;

    const batches = await prisma.bloodInventory.findMany({
      where: { bloodGroup: decodeURIComponent(bloodGroup) },
      orderBy: { donationDate: 'asc' }
    });

    const totalUnits = batches.reduce((sum, b) => sum + b.units, 0);

    let status = 'fresh';
    if (totalUnits <= 2) status = 'critical';
    else if (totalUnits <= 5) status = 'low';

    const batchData = batches.map(item => {
      const expiry = calcExpiryInfo(item);
      return {
        id: item.id,
        shortId: item.id.substring(item.id.length - 8).toUpperCase(),
        donorName: item.donorName || 'Unknown',
        donationDate: item.donationDate || item.createdAt,
        expiryDate: expiry.expiryDate,
        daysRemaining: expiry.daysRemaining,
        hoursRemaining: expiry.hoursRemaining,
        expirationStatus: expiry.expirationStatus,
        units: item.units,
        tested: item.tested,
        notes: item.notes,
        rbcCount: item.rbcCount,
        plasmaCount: item.plasmaCount
      };
    });

    res.json({
      success: true,
      data: { bloodGroup: decodeURIComponent(bloodGroup), status, totalUnits, batchCount: batches.length, batches: batchData }
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/stock/:id ───────────────────────────
const updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bloodGroup, units, donorName, donationDate, rbcCount, plasmaCount, notes, tested, expiryDate } = req.body;

    let calculatedExpiry;
    if (expiryDate) {
      calculatedExpiry = new Date(expiryDate);
    } else if (donationDate) {
      const baseDate = new Date(donationDate);
      calculatedExpiry = new Date(baseDate);
      calculatedExpiry.setDate(calculatedExpiry.getDate() + 42);
    }

    const updated = await prisma.bloodInventory.update({
      where: { id },
      data: {
        bloodGroup,
        units: parseInt(units),
        donorName,
        donationDate: donationDate ? new Date(donationDate) : undefined,
        expiryDate: calculatedExpiry,
        rbcCount: rbcCount ? parseFloat(rbcCount) : undefined,
        plasmaCount: plasmaCount ? parseFloat(plasmaCount) : undefined,
        notes: notes !== undefined ? notes : undefined,
        tested: tested !== undefined ? Boolean(tested) : undefined
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

// ─── POST /api/admin/stock/:id/dispatch ─────────────────
const dispatchBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { hospitalId, quantity, notes } = req.body;

    if (!hospitalId || !quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Hospital and valid quantity required.' });
    }

    const batch = await prisma.bloodInventory.findUnique({ where: { id } });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    if (batch.units < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient units. Available: ${batch.units}, Requested: ${quantity}` 
      });
    }

    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }

    const [dispatch] = await prisma.$transaction([
      prisma.dispatch.create({
        data: { batchId: id, hospitalId, quantity: parseInt(quantity), notes: notes || null }
      }),
      batch.units - quantity <= 0
        ? prisma.bloodInventory.delete({ where: { id } })
        : prisma.bloodInventory.update({
            where: { id },
            data: { units: batch.units - parseInt(quantity) }
          })
    ]);

    res.json({ 
      success: true, 
      message: `${quantity} units dispatched to ${hospital.name}`,
      data: { allocationId: dispatch.id, hospitalName: hospital.name }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/hospitals ───────────────────────────
const getHospitals = async (req, res, next) => {
  try {
    const hospitals = await prisma.hospital.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: hospitals });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/alerts/batch/:id ───────────────────
const createAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { daysBeforeExpiry, notifyOnCritical, method } = req.body;

    const batch = await prisma.bloodInventory.findUnique({ where: { id } });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const alert = await prisma.inventoryAlert.create({
      data: {
        batchId: id,
        bloodGroup: batch.bloodGroup,
        daysBeforeExpiry: parseInt(daysBeforeExpiry) || 7,
        notifyOnCritical: Boolean(notifyOnCritical),
        method: method || 'in_app'
      }
    });

    res.json({ success: true, message: 'Alert configured successfully.', data: { alertId: alert.id } });
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

    if (status === 'APPROVED' && request.status === 'PENDING') {
      const batches = await prisma.bloodInventory.findMany({
        where: { bloodGroup: request.bloodGroup },
        orderBy: { donationDate: 'asc' }
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

    const updated = await prisma.bloodRequest.update({ where: { id }, data: { status } });
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

    if (status === 'COMPLETED' && donation.status === 'SCHEDULED') {
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

      await prisma.donorProfile.update({
        where: { id: donation.donorProfileId },
        data: { lastDonationDate: new Date() }
      });
    }

    const updated = await prisma.donation.update({
      where: { id },
      data: { status, donationDate: status === 'COMPLETED' ? new Date() : undefined }
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
  getInventorySummary,
  getBatchesByGroup,
  addStock,
  deleteStock,
  updateStock,
  dispatchBatch,
  getHospitals,
  createAlert,
  getRequests,
  updateRequestStatus,
  getDonations,
  updateDonationStatus,
};
