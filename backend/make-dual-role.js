const prisma = require('./src/lib/prisma');

async function run() {
  console.log('🔄 Converting donor1@test.com to dual-role user...');
  const user = await prisma.user.findUnique({
    where: { email: 'donor1@test.com' },
    include: { donorProfile: true, recipientProfile: true }
  });

  if (!user) {
    console.error('❌ User donor1@test.com not found!');
    process.exit(1);
  }

  // Create recipientProfile if not exists
  if (!user.recipientProfile) {
    await prisma.recipientProfile.create({
      data: {
        userId: user.id,
        phone: user.donorProfile?.phone || '+1-555-0101',
        address: user.donorProfile?.address || '123 Metropolis Way',
        bloodType: user.donorProfile?.bloodType || 'A+',
        medicalCondition: 'None'
      }
    });
  }

  // Update user_roles and last_active_role
  await prisma.user.update({
    where: { id: user.id },
    data: {
      user_roles: 'donor,recipient',
      last_active_role: 'donor'
    }
  });

  console.log('✅ donor1@test.com is now a dual-role user!');
  console.log(`   - Roles: donor, recipient`);
  console.log(`   - Blood Type: ${user.donorProfile?.bloodType || 'A+'}`);
  await prisma.$disconnect();
}

run();
