const prisma = require('../lib/prisma');
const { calculateExpiryDate, calculateStockStatus, calculateHealthIndicator } = require('../lib/stock.service');

// GET /api/admin/summary
// ... (lines 4-63 unchanged)
const getSummary = async (req, res, next) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalDonors = await prisma.user.count({ where: { role: 'DONOR' } });
    const totalRecipients = await prisma.user.count({ where: { role: 'RECIPIENT' } });
    
    // Aggregates for inventory and requests
    const bloodStockData = await prisma.bloodStock.aggregate({
      _sum: { units: true }
    });
    const totalBloodUnits = bloodStockData._sum.units || 0;

    const pendingRequests = await prisma.bloodRequest.count({
      where: { status: 'PENDING' }
    });

    const criticalStockCount = await prisma.bloodStock.count({
      where: { status: 'Critical' }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalDonors,
        totalRecipients,
        totalBloodUnits,
        pendingRequests,
        criticalStockCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/stock
const getStock = async (req, res, next) => {
  try {
    const { search, sort } = req.query;
    let where = {};
    if (search) {
      where.bloodGroup = { contains: search };
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'stock_low') orderBy = { units: 'asc' };
    if (sort === 'stock_high') orderBy = { units: 'desc' };

    const stock = await prisma.bloodStock.findMany({
      where,
      orderBy
    });
    res.json({ success: true, data: stock });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/stock
const addStock = async (req, res, next) => {
  try {
    const { bloodGroup, units, rbcCount, plasmaCount, donationDate, donorEmail } = req.body;
    
    // 1. Calculate medical indicators
    const expiryDate = calculateExpiryDate(donationDate);
    const status = calculateStockStatus(units);
    const healthIndicator = calculateHealthIndicator(expiryDate, rbcCount);

    // 2. If donor email provided, link and check eligibility
    let donorName = null;
    if (donorEmail) {
      const user = await prisma.user.findUnique({
        where: { email: donorEmail },
        include: { donorProfile: true }
      });

      if (!user || user.role !== 'DONOR') {
        return res.status(404).json({ success: false, message: 'Donor not found' });
      }

      donorName = user.name;

      // Check 60-day rule
      if (user.donorProfile.lastDonationDate) {
        const lastDate = new Date(user.donorProfile.lastDonationDate);
        const nextEligible = new Date(lastDate);
        nextEligible.setDate(lastDate.getDate() + 60);

        if (new Date(donationDate) < nextEligible) {
          return res.status(400).json({ 
            success: false, 
            message: `Donor is not eligible yet. Next eligible date: ${nextEligible.toLocaleDateString()}` 
          });
        }
      }

      // Update donor's last donation date
      await prisma.donorProfile.update({
        where: { userId: user.id },
        data: { lastDonationDate: new Date(donationDate) }
      });
    }

    const newStock = await prisma.bloodStock.create({
      data: {
        bloodGroup,
        units: parseInt(units),
        rbcCount: rbcCount ? parseFloat(rbcCount) : null,
        plasmaCount: plasmaCount ? parseFloat(plasmaCount) : null,
        donationDate: new Date(donationDate),
        expiryDate,
        status,
        healthIndicator,
        donorName
      }
    });

    res.status(201).json({ success: true, data: newStock });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/stock/:id
const deleteStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.bloodStock.delete({ where: { id } });
    res.json({ success: true, message: 'Stock deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/stock/:id (EDIT functionality)
const updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bloodGroup, units, rbcCount, plasmaCount, donationDate, donorEmail } = req.body;
    
    // Fetch current record for base calculations if fields missing (though Edit sends all)
    const current = await prisma.bloodStock.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ success: false, message: 'Record not found' });

    // Recalculate indicators
    const newDonationDate = donationDate ? new Date(donationDate) : current.donationDate;
    const expiryDate = donationDate ? calculateExpiryDate(newDonationDate) : current.expiryDate;
    const status = units ? calculateStockStatus(units) : current.status;
    const healthIndicator = calculateHealthIndicator(expiryDate, rbcCount || current.rbcCount);

    const updated = await prisma.bloodStock.update({
      where: { id },
      data: { 
        bloodGroup: bloodGroup || current.bloodGroup,
        units: units ? parseInt(units) : current.units,
        rbcCount: rbcCount ? parseFloat(rbcCount) : current.rbcCount,
        plasmaCount: plasmaCount ? parseFloat(plasmaCount) : current.plasmaCount,
        donationDate: newDonationDate,
        expiryDate,
        status,
        healthIndicator,
        donorName: donorEmail ? donorEmail : current.donorName // Update Name if email provided/changed? Simple link or keep name
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/requests
const getRequests = async (req, res, next) => {
  try {
    const requests = await prisma.bloodRequest.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/requests/:id/status
const updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // APPROVED, REJECTED, FULFILLED

    const updated = await prisma.bloodRequest.update({
      where: { id },
      data: { status }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getUsers,
  getStock,
  addStock,
  deleteStock,
  updateStock,
  getRequests,
  updateRequestStatus
};
