const prisma = require('../lib/prisma');

// GET /api/locations
const getNestedLocations = async (req, res, next) => {
  try {
    const provinces = await prisma.province.findMany({
      include: {
        districts: {
          include: {
            hospitals: {
              where: { isActive: true },
              orderBy: { name: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    const structured = {};
    for (const province of provinces) {
      const districtsObj = {};
      for (const district of province.districts) {
        districtsObj[district.name] = district.hospitals.map(h => h.name);
      }
      structured[province.name] = districtsObj;
    }

    res.json({ success: true, data: structured });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNestedLocations,
};
