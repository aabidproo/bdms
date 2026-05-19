const prisma = require('./src/lib/prisma');

async function run() {
  console.log('🔍 Searching for user rai...');
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'rai' } },
        { email: { contains: 'rai' } }
      ]
    },
    include: {
      donorProfile: true,
      recipientProfile: true
    }
  });

  console.log(`Found ${users.length} users:`);
  users.forEach(u => {
    console.log({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      user_roles: u.user_roles,
      last_active_role: u.last_active_role,
      hasDonor: !!u.donorProfile,
      hasRecipient: !!u.recipientProfile
    });
  });

  await prisma.$disconnect();
}

run();
