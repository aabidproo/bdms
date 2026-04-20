const prisma = require('../src/lib/prisma');
const bcrypt = require('bcrypt');

async function seedUsers() {
  const password = await bcrypt.hash('admin123', 10);

  // 1. Admin
  await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@lifelink.com',
      password,
      role: 'ADMIN',
    }
  });
  console.log('✅ Admin: admin@lifelink.com / Test@1234');

  // 2. Donor
  await prisma.user.create({
    data: {
      name: 'John Donor',
      email: 'donor@test.com',
      password,
      role: 'DONOR',
      donorProfile: {
        create: {
          phone: '9800000001',
          dateOfBirth: new Date('1995-06-15'),
          gender: 'Male',
          address: '123 Main Street, Kathmandu',
          bloodType: 'O+',
          weight: 72,
        }
      }
    }
  });
  console.log('✅ Donor: donor@test.com / Test@1234 (Blood: O+)');

  // 3. Recipient
  await prisma.user.create({
    data: {
      name: 'Jane Recipient',
      email: 'recipient@test.com',
      password,
      role: 'RECIPIENT',
      recipientProfile: {
        create: {
          phone: '9800000002',
          address: '456 Hospital Road, Kathmandu',
          bloodType: 'AB+',
        }
      }
    }
  });
  console.log('✅ Recipient: recipient@test.com / Test@1234 (Blood: AB+)');

  console.log('\n🎉 All test users created!');
  await prisma.$disconnect();
}

seedUsers().catch(e => { console.error(e); process.exit(1); });
