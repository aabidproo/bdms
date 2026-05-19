const prisma = require('./src/lib/prisma');

async function run() {
  const email = 'romanielrai94@gmail.com';
  console.log(`🔄 Resetting ${email} back to single-role (donor only)...`);
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: { recipientProfile: true }
  });

  if (!user) {
    console.error('❌ User not found!');
    process.exit(1);
  }

  // Remove recipient profile if exists
  if (user.recipientProfile) {
    await prisma.recipientProfile.delete({ where: { id: user.recipientProfile.id } });
    console.log('🗑️  Removed recipient profile');
  }

  // Reset to single role
  await prisma.user.update({
    where: { id: user.id },
    data: {
      user_roles: 'donor',
      last_active_role: 'donor'
    }
  });

  console.log('✅ Reset complete! User is now donor-only.');
  console.log('   Reload the browser to see the toggle, then click "Recipient" to auto-provision.');
  await prisma.$disconnect();
}

run();
