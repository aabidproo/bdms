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

// GET /api/locations/hospitals-by-name
const getHospitalsByName = async (req, res, next) => {
  try {
    const { district, province } = req.query;

    if (!district) {
      return res.status(400).json({
        success: false,
        message: 'District query parameter is required.'
      });
    }

    // Fetch all districts with province relation to perform case-insensitive and fuzzy matching in memory
    const allDistricts = await prisma.district.findMany({
      include: {
        province: true
      }
    });

    const targetDistrictLower = district.toLowerCase();
    const targetProvinceLower = province ? province.toLowerCase() : null;

    const foundDistrict = allDistricts.find(d => {
      const matchDistrict = d.name.toLowerCase() === targetDistrictLower;
      if (!matchDistrict) return false;

      if (targetProvinceLower) {
        const provNameLower = d.province.name.toLowerCase();
        return provNameLower.includes(targetProvinceLower) || targetProvinceLower.includes(provNameLower);
      }

      return true;
    });

    if (!foundDistrict) {
      return res.json({
        success: true,
        data: [],
        message: 'No hospitals found for this district'
      });
    }

    const hospitals = await prisma.hospital.findMany({
      where: {
        districtId: foundDistrict.id,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: hospitals,
      district: foundDistrict.name,
      province: foundDistrict.province.name,
      count: hospitals.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNestedLocations,
  getHospitalsByName,
};
