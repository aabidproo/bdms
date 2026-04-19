const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function check() {
  try {
    const users = await p.user.count();
    const inventory = await p.bloodInventory.count();
    const donations = await p.donation.count();
    const requests = await p.bloodRequest.count();
    console.log(JSON.stringify({ users, inventory, donations, requests }, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
}
check();
