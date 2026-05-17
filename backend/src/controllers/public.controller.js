const prisma = require('../lib/prisma');

// GET /api/public/blood-availability
// Query params: province, district, bloodGroup, component
const searchBloodAvailability = async (req, res, next) => {
  try {
    const { province, district, bloodGroup, component } = req.query;

    const where = {};
    if (bloodGroup) where.bloodGroup = bloodGroup;
    if (component) where.component = component;
    
    // Filter hospitals if province or district is provided
    if (province || district) {
      where.hospital = {};
      if (province) where.hospital.province = province;
      if (district) where.hospital.district = district;
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

module.exports = {
  searchBloodAvailability,
};
