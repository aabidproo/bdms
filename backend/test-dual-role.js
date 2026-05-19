const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('./src/lib/prisma');

test('Dual-Role Toggle Backend Integration Suite', async (t) => {
  const testEmail = `dual-test-${Date.now()}@test.com`;
  const passwordRaw = 'password123';
  let token = '';
  let testUser = null;
  let testRequest = null;

  t.after(async () => {
    // Cleanup database records after tests run
    console.log('🧹 Cleaning up test database records...');
    if (testRequest) {
      await prisma.bloodRequest.delete({ where: { id: testRequest.id } }).catch(() => {});
    }
    if (testUser) {
      await prisma.donorProfile.delete({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.recipientProfile.delete({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log('✨ Cleanup complete!');
  });

  await t.test('1. User Creation with Dual Roles & Seed Setup', async () => {
    const hashedPassword = await bcrypt.hash(passwordRaw, 10);
    
    // Create a user with both roles populated in user_roles field
    testUser = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: 'Dual Role Integration User',
        role: 'DONOR',
        user_roles: 'donor,recipient',
        last_active_role: 'donor',
        donorProfile: {
          create: {
            phone: '+1-555-9999',
            dateOfBirth: new Date(1990, 0, 1),
            gender: 'Male',
            address: '123 Test Lane',
            bloodType: 'O-',
            weight: 75.0,
          }
        },
        recipientProfile: {
          create: {
            phone: '+1-555-9999',
            address: '123 Test Lane',
            bloodType: 'O-',
          }
        }
      },
      include: {
        donorProfile: true,
        recipientProfile: true,
      }
    });

    assert.ok(testUser.id, 'Test user should be created successfully');
    assert.strictEqual(testUser.user_roles, 'donor,recipient', 'user_roles must contain both donor and recipient');
    assert.strictEqual(testUser.last_active_role, 'donor', 'default active role should be donor');
    
    // Generate valid auth token
    token = jwt.sign(
      { userId: testUser.id, role: 'DONOR' },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1d' }
    );
    assert.ok(token, 'JWT Token generated successfully');
  });

  await t.test('2. PATCH /api/user/active-role - Switch active role successfully', async () => {
    // We import user.controller to test the logic directly
    const { updateActiveRole } = require('./src/controllers/user.controller');
    
    // Mock express req/res
    const req = {
      body: { role: 'recipient' },
      user: { userId: testUser.id }
    };
    
    let responseStatus = 0;
    let responseJson = null;
    
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      }
    };

    await updateActiveRole(req, res, (err) => {
      if (err) assert.fail(err.message);
    });

    assert.strictEqual(responseStatus, 200, 'Should return status 200 on successful switch');
    assert.strictEqual(responseJson.success, true, 'Response should report success');
    assert.strictEqual(responseJson.data.last_active_role, 'recipient', 'Response should have updated last_active_role');
    
    // Query database to verify persistence
    const dbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert.strictEqual(dbUser.last_active_role, 'recipient', 'Database should persist the active role');
  });

  await t.test('3. PATCH /api/user/active-role - Reject switching to an unauthorized role', async () => {
    const { updateActiveRole } = require('./src/controllers/user.controller');
    
    const req = {
      body: { role: 'admin' }, // Target role is admin which the user does not possess
      user: { userId: testUser.id }
    };
    
    let responseStatus = 0;
    let responseJson = null;
    
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      }
    };

    await updateActiveRole(req, res, (err) => {});

    assert.strictEqual(responseStatus, 400, 'Should return status 400 on invalid role value');
  });

  await t.test('4. GET /api/donations/matched-requests - Fetch requests matching donor blood type', async () => {
    // 1. Switch back to donor mode first
    const dbUserBefore = await prisma.user.update({
      where: { id: testUser.id },
      data: { last_active_role: 'donor' }
    });

    // Create a blood request that matches our blood type (O-)
    testRequest = await prisma.bloodRequest.create({
      data: {
        recipientProfileId: testUser.recipientProfile.id,
        bloodGroup: 'O-',
        units: 2,
        urgency: 'Urgent',
        hospital: 'Test Hospital',
        status: 'PENDING'
      }
    });

    const { getMatchedRequests } = require('./src/controllers/donation.controller');
    const req = {
      user: { userId: testUser.id }
    };
    
    let responseStatus = 0;
    let responseJson = null;
    
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      }
    };

    await getMatchedRequests(req, res, (err) => {
      if (err) assert.fail(err.message);
    });

    assert.strictEqual(responseJson.success, true, 'Matched requests query should succeed');
    assert.ok(Array.isArray(responseJson.data), 'Should return an array of matched requests');
    
    const match = responseJson.data.find(r => r.id === testRequest.id);
    assert.ok(match, 'Matched requests should include the created compatible request');
    assert.strictEqual(match.bloodGroup, 'O-', 'Compatible request blood group must be O-');
  });

  await t.test('5. GET /api/requests/:requestId/matched-donors - Fetch compatible donors', async () => {
    const { getMatchedDonors } = require('./src/controllers/request.controller');
    
    const req = {
      params: { requestId: testRequest.id },
      user: { userId: testUser.id }
    };
    
    let responseStatus = 0;
    let responseJson = null;
    
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      }
    };

    await getMatchedDonors(req, res, (err) => {
      if (err) assert.fail(err.message);
    });

    assert.strictEqual(responseJson.success, true, 'Matched donors query should succeed');
    assert.ok(Array.isArray(responseJson.data), 'Should return an array of matched donors');
    
    const matchedDonor = responseJson.data.find(d => d.id === testUser.donorProfile.id);
    assert.ok(matchedDonor, 'Matched donors should include our test donor profile');
    assert.strictEqual(matchedDonor.bloodType, 'O-', 'Donor blood group must match request');
  });
});
