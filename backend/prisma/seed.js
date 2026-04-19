const prisma = require('../src/lib/prisma');

async function seed() {
  const batches = [
    { bloodGroup: 'A+', units: 5, donorName: 'John Doe', rbcCount: 4.8, plasmaCount: 320, donationDate: new Date('2026-04-01') },
    { bloodGroup: 'A+', units: 10, donorName: 'Alice Smith', rbcCount: 5.1, plasmaCount: 350, donationDate: new Date('2026-04-05') },
    { bloodGroup: 'B-', units: 8, donorName: 'Bob Brown', rbcCount: 4.5, plasmaCount: 310, donationDate: new Date('2026-03-25') },
    { bloodGroup: 'O+', units: 15, donorName: 'Charlie Davis', rbcCount: 5.3, plasmaCount: 400, donationDate: new Date('2026-04-10') },
    { bloodGroup: 'O+', units: 12, donorName: 'Eve Wilson', rbcCount: 4.9, plasmaCount: 380, donationDate: new Date('2026-04-12') },
    { bloodGroup: 'AB+', units: 7, donorName: 'Grace Lee', rbcCount: 4.7, plasmaCount: 330, donationDate: new Date('2026-04-15') },
    { bloodGroup: 'A-', units: 4, donorName: 'Hank Green', rbcCount: 4.2, plasmaCount: 290, donationDate: new Date('2026-04-08') },
    { bloodGroup: 'B+', units: 20, donorName: 'Ivy Taylor', rbcCount: 5.0, plasmaCount: 360, donationDate: new Date('2026-04-02') },
  ];
  
  // Clear existing inventory
  await prisma.bloodInventory.deleteMany();

  for (const batch of batches) {
    await prisma.bloodInventory.create({
      data: batch
    });
  }
  
  console.log(`✅ Seeded BloodInventory with ${batches.length} detailed batches`);
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
