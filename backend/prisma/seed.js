const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;

  console.log('--- Starting Seeding ---');

  // 1. Admin User
  const adminPassword = await bcrypt.hash('admin123', saltRounds);
  await prisma.user.upsert({
    where: { email: 'admin@lifelink.com' },
    update: {},
    create: {
      email: 'admin@lifelink.com',
      password: adminPassword,
      role: 'ADMIN',
      name: 'Admin User',
    },
  });
  console.log('✅ Admin user created/verified');

  // 2. Donor User
  const donorPassword = await bcrypt.hash('donor123', saltRounds);
  await prisma.user.upsert({
    where: { email: 'donor@lifelink.com' },
    update: {},
    create: {
      email: 'donor@lifelink.com',
      password: donorPassword,
      role: 'DONOR',
      name: 'Test Donor',
      donorProfile: {
        create: {
          phone: '9800000001',
          dateOfBirth: new Date('1995-01-01'),
          gender: 'Male',
          address: 'Kathmandu',
          bloodType: 'A+',
          weight: 70,
        },
      },
    },
  });
  console.log('✅ Donor user created/verified');

  // 3. Recipient User
  const recipientPassword = await bcrypt.hash('recipient123', saltRounds);
  await prisma.user.upsert({
    where: { email: 'recipient@lifelink.com' },
    update: {},
    create: {
      email: 'recipient@lifelink.com',
      password: recipientPassword,
      role: 'RECIPIENT',
      name: 'Test Recipient',
      recipientProfile: {
        create: {
          phone: '9800000002',
          address: 'Kathmandu',
          bloodType: 'B+',
        },
      },
    },
  });
  console.log('✅ Recipient user created/verified');

  // 4. Blood Stock (8 records, one per group)
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const stockData = [
    { units: 25, daysAgo: 5, rbc: 5.2, plasma: 450 },  // Excellent (maybe)
    { units: 8, daysAgo: 10, rbc: 4.8, plasma: 320 },  // Good/Fair
    { units: 3, daysAgo: 2, rbc: 2.1, plasma: 150 },   // Poor (rbc < 2.5)
    { units: 45, daysAgo: 35, rbc: 4.6, plasma: 500 }, // Excellent (days > 30 and rbc > 4.5)
    { units: 12, daysAgo: 20, rbc: 3.8, plasma: 280 }, // Good
    { units: 6, daysAgo: 25, rbc: 3.2, plasma: 210 },  // Fair
    { units: 2, daysAgo: 38, rbc: 1.8, plasma: 100 },  // Poor (rbc < 2.5)
    { units: 18, daysAgo: 12, rbc: 4.2, plasma: 380 }, // Fair/Good
  ];

  for (let i = 0; i < bloodGroups.length; i++) {
    const donationDate = new Date();
    donationDate.setDate(donationDate.getDate() - stockData[i].daysAgo);
    
    // Auto-calculate expiry (42 days after donation)
    const expiryDate = new Date(donationDate);
    expiryDate.setDate(expiryDate.getDate() + 42);

    // Auto-calculate status (Original Logic)
    let status = 'Available';
    if (stockData[i].units < 5) status = 'Critical';
    else if (stockData[i].units <= 10) status = 'Low';

    // Auto-calculate healthIndicator (New Logic)
    const rbc = stockData[i].rbc;
    const diffDays = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    let healthIndicator = 'Good';

    if (diffDays < 10 || rbc < 2.5) healthIndicator = 'Poor';
    else if (diffDays <= 20 || rbc <= 3.5) healthIndicator = 'Fair';
    else if (diffDays <= 30 || rbc <= 4.5) healthIndicator = 'Good';
    else if (diffDays > 30 && rbc > 4.5) healthIndicator = 'Excellent';

    await prisma.bloodStock.create({
      data: {
        bloodGroup: bloodGroups[i],
        units: stockData[i].units,
        rbcCount: rbc,
        plasmaCount: stockData[i].plasma,
        donationDate,
        expiryDate,
        status,
        healthIndicator,
        donorName: i % 2 === 0 ? 'Anonymous Donor' : 'Test Donor'
      }
    });
  }
  console.log('✅ Blood stock seeded with components');

  // 5. Blood Requests
  const recipient = await prisma.user.findUnique({ where: { email: 'recipient@lifelink.com' } });
  const requestFakes = [
    { bloodGroup: 'B+', units: 2, urgency: 'Normal', status: 'PENDING', hospital: 'City Hospital' },
    { bloodGroup: 'A+', units: 1, urgency: 'Critical', status: 'APPROVED', hospital: 'Mercy Clinic' },
    { bloodGroup: 'AB-', units: 3, urgency: 'High', status: 'REJECTED', hospital: 'Downtown Medical' },
    { bloodGroup: 'O+', units: 2, urgency: 'Normal', status: 'FULFILLED', hospital: 'General Hospital' },
    { bloodGroup: 'B+', units: 1, urgency: 'Critical', status: 'PENDING', hospital: 'City Hospital' },
  ];

  for (const req of requestFakes) {
    await prisma.bloodRequest.create({
      data: {
        userId: recipient.id,
        ...req
      }
    });
  }
  console.log('✅ Blood requests seeded');

  console.log('--- Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
