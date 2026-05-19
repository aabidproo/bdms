const prisma = require('../lib/prisma');

// GET /api/blood/search
// Query params: province, district, bloodGroup, component
const searchBlood = async (req, res, next) => {
  try {
    const { province, district, bloodGroup, component } = req.query;

    const where = {};
    if (bloodGroup) where.bloodGroup = bloodGroup;
    if (component) where.component = component;

    // Filter hospitals if province or district is provided
    if (province || district) {
      where.hospital = {};
      if (province) {
        where.hospital.province = {
          equals: province,
        };
      }
      if (district) {
        where.hospital.district = {
          equals: district,
        };
      }
    }

    const stocks = await prisma.bloodBankStock.findMany({
      where,
      include: {
        hospital: {
          select: {
            name: true,
            province: true,
            district: true,
            address: true,
            phone: true,
            category: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({ success: true, data: stocks });
  } catch (error) {
    next(error);
  }
};

// PUT /api/blood/inventory/:hospitalId (admin only)
// Body: bloodGroup, component, units
const updateInventory = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const { bloodGroup, component, units } = req.body;

    if (!bloodGroup || !component || units === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: bloodGroup, component, units'
      });
    }

    const parsedUnits = parseInt(units, 10);
    if (isNaN(parsedUnits)) {
      return res.status(400).json({
        success: false,
        message: 'units must be a valid number'
      });
    }

    // Upsert the stock row
    const updatedStock = await prisma.bloodBankStock.upsert({
      where: {
        hospitalId_bloodGroup_component: {
          hospitalId,
          bloodGroup,
          component
        }
      },
      update: {
        units: parsedUnits
      },
      create: {
        hospitalId,
        bloodGroup,
        component,
        units: parsedUnits
      }
    });

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: updatedStock
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchBlood,
  updateInventory,
};
