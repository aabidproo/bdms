const prisma = require('./src/lib/prisma');

async function run() {
  const email = 'romanielrai94@gmail.com';
  console.log(`🔄 Upgrading user ${email} to dual-role...`);
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: { donorProfile: true, recipientProfile: true }
  });

  if (!user) {
    console.error(`❌ User ${email} not found!`);
    process.exit(1);
  }

  // 1. Create Recipient Profile if missing
  if (!user.recipientProfile) {
    console.log('➕ Creating recipient profile...');
    await prisma.recipientProfile.create({
      data: {
        userId: user.id,
        phone: user.donorProfile?.phone || '+1-555-0000',
        address: user.donorProfile?.address || 'Metropolis Center',
        bloodType: user.donorProfile?.bloodType || 'O+',
        medicalCondition: 'None'
      }
    });
  }

  // 2. Update user roles and last active role
  console.log('🔑 Setting user_roles to donor,recipient...');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      user_roles: 'donor,recipient',
      last_active_role: 'donor'
    }
  });

  console.log('✅ User is now fully dual-role! Please reload your browser page.');
  await prisma.$disconnect();
}

run();
