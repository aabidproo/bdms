const prisma = require('../src/lib/prisma');

async function seed() {
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  
  for (const group of bloodGroups) {
    await prisma.bloodInventory.upsert({
      where: { bloodGroup: group },
      update: {},
      create: { bloodGroup: group, units: 0 },
    });
  }
  
  console.log('✅ Seeded BloodInventory with 8 blood groups');
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
