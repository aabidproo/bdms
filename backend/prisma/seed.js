const prisma = require('../src/lib/prisma');
const bcrypt = require('bcrypt');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const LOCATIONS = ['LifeLink Center', 'City General Hospital', 'Mobile Blood Drive', 'Red Cross Center'];
const HOSPITALS = ['City Central Hospital', 'General Regional', 'St. Mary\'s Hospital', 'Civil Service Hospital', 'Valley Regional Clinic', 'Medicare Hospital'];
const MEDICAL_CONDITIONS = ['None', 'High Blood Pressure', 'History of Anemia', 'Diabetes Type 2', 'None', 'None', 'Asthma'];

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
    console.log('🌱 Starting database seed...');

    // Clear existing data cleanly (Order matters for foreign keys)
    await prisma.inventoryAlert.deleteMany();
    await prisma.dispatch.deleteMany();
    await prisma.bloodRequest.deleteMany();
    await prisma.donation.deleteMany();
    await prisma.bloodInventory.deleteMany();
    await prisma.donorProfile.deleteMany();
    await prisma.recipientProfile.deleteMany();
    await prisma.hospital.deleteMany();
    await prisma.user.deleteMany();

    console.log('🧹 Old data wiped cleanly.');

    const passwordHash = await bcrypt.hash('admin123', 10);
    const userPasswordHash = await bcrypt.hash('password123', 10);

    // 1. Create Admin
    console.log('👤 Creating Admin...');
    await prisma.user.create({
        data: {
            email: 'admin@lifelink.com',
            password: passwordHash,
            name: 'Admin User',
            role: 'ADMIN'
        }
    });

    // 2. Create Hospitals
    console.log('🏥 Creating Hospitals...');
    const hospitalRecords = [];
    for (let i = 0; i < HOSPITALS.length; i++) {
        const h = await prisma.hospital.create({
            data: {
                name: HOSPITALS[i],
                city: 'Metropolis',
                phone: `+1-555-010${i}`
            }
        });
        hospitalRecords.push(h);
    }

    // 3. Create Donors
    console.log('🩸 Creating Donors (25 total)...');
    const donorProfiles = [];
    for (let i = 1; i <= 25; i++) {
        const bg = i <= 8 ? BLOOD_GROUPS[i-1] : randomItem(BLOOD_GROUPS);
        const user = await prisma.user.create({
            data: {
                email: `donor${i}@test.com`,
                password: userPasswordHash,
                name: `Donor Worker ${i}`,
                role: 'DONOR',
                donorProfile: {
                    create: {
                        phone: `+1-555-500${i.toString().padStart(2, '0')}`,
                        dateOfBirth: randomDate(new Date(1970, 0, 1), new Date(2004, 0, 1)),
                        gender: Math.random() > 0.5 ? 'Male' : 'Female',
                        address: `${i * 12} Maple Street, Metropolis`,
                        bloodType: bg,
                        weight: Math.floor(Math.random() * 50) + 55, // 55kg to 105kg
                        medicalCondition: randomItem(MEDICAL_CONDITIONS)
                    }
                }
            },
            include: { donorProfile: true }
        });
        donorProfiles.push({ user, profile: user.donorProfile });
    }

    // 4. Create Recipients
    console.log('🩸 Creating Recipients (25 total)...');
    const recipientProfiles = [];
    for (let i = 1; i <= 25; i++) {
        const bg = randomItem(BLOOD_GROUPS);
        const user = await prisma.user.create({
            data: {
                email: `recipient${i}@test.com`,
                password: userPasswordHash,
                name: `Recipient Name ${i}`,
                role: 'RECIPIENT',
                recipientProfile: {
                    create: {
                        phone: `+1-555-600${i.toString().padStart(2, '0')}`,
                        address: `${i * 24} Oak Avenue, Metropolis`,
                        bloodType: bg,
                        medicalCondition: randomItem(MEDICAL_CONDITIONS)
                    }
                }
            },
            include: { recipientProfile: true }
        });
        recipientProfiles.push({ user, profile: user.recipientProfile });
    }

    // 5. Create Donations & Associated Inventory
    console.log('💉 Creating Donations & Inventory Batches...');
    const inventoryRecords = [];
    
    for (const donor of donorProfiles) {
        // Each donor makes 1 to 3 donations
        const numDonations = Math.floor(Math.random() * 3) + 1;
        
        for (let j = 0; j < numDonations; j++) {
            const isCompleted = Math.random() > 0.3; // 70% completed
            // Mostly generate recent fresh donations, occasionally generate historically expired ones
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35);
            const isHistoricallyExpired = Math.random() > 0.85; 
            const donDate = isHistoricallyExpired 
                ? randomDate(new Date(2025, 0, 1), thirtyDaysAgo) 
                : randomDate(thirtyDaysAgo, new Date());
            
            const donation = await prisma.donation.create({
                data: {
                    donorProfileId: donor.profile.id,
                    bloodType: donor.profile.bloodType,
                    units: Math.floor(Math.random() * 2) + 1, // 1 to 2 units
                    location: randomItem(LOCATIONS),
                    scheduledDate: donDate,
                    status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
                    donationDate: isCompleted ? donDate : null,
                    notes: isCompleted ? 'Healthy donation.' : null,
                    healthIndicator: 'Good',
                    plasmaCount: isCompleted ? (Math.random() * 100 + 150) : null,
                    rbcCount: isCompleted ? (Math.random() * 2 + 4) : null,
                }
            });

            // If completed, add directly to Blood Inventory
            if (isCompleted) {
                // Shelf life is 42 days randomly applied based on donation date
                const expiry = new Date(donDate);
                expiry.setDate(expiry.getDate() + 42);

                const inv = await prisma.bloodInventory.create({
                    data: {
                        bloodGroup: donation.bloodType,
                        units: donation.units,
                        donationDate: donation.donationDate,
                        donorName: donor.user.name,
                        plasmaCount: donation.plasmaCount,
                        rbcCount: donation.rbcCount,
                        expiryDate: expiry,
                        tested: Math.random() > 0.1, // 90% tested
                        notes: 'Routine batch generation'
                    }
                });
                inventoryRecords.push(inv);
            }
        }
    }

    // 6. Create Blood Requests
    console.log('🚨 Creating Blood Requests...');
    for (const recipient of recipientProfiles) {
        const numRequests = Math.floor(Math.random() * 2) + 1;
        
        for (let j = 0; j < numRequests; j++) {
            const statuses = ['PENDING', 'APPROVED', 'FULFILLED', 'REJECTED'];
            const urgencies = ['Normal', 'Urgent', 'Critical'];
            
            const reqStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const chosenHospital = randomItem(hospitalRecords);

            await prisma.bloodRequest.create({
                data: {
                    recipientProfileId: recipient.profile.id,
                    bloodGroup: recipient.profile.bloodType,
                    units: Math.floor(Math.random() * 4) + 1, // 1 to 4 units needed
                    urgency: randomItem(urgencies),
                    hospital: chosenHospital.name,
                    status: reqStatus,
                    notes: `Requested by Dr. Smith for upcoming surgery.`
                }
            });
        }
    }

    // 7. Create Some Dispatches (if we have enough inventory)
    console.log('🚚 Creating Dispatches...');
    const testedInventory = inventoryRecords.filter(i => i.tested && new Date(i.expiryDate) > new Date());
    for (let i = 0; i < Math.min(15, testedInventory.length); i++) {
        const inv = testedInventory[i];
        
        // Use all available units in batch for dispatch
        if (inv.units > 0) {
            await prisma.dispatch.create({
                data: {
                    batchId: inv.id,
                    hospitalId: randomItem(hospitalRecords).id,
                    quantity: inv.units,
                    notes: 'Priority dispatch for surgery',
                }
            });
            // Decrement inventory stock securely
            await prisma.bloodInventory.update({
                where: { id: inv.id },
                data: { units: 0 }
            });
        }
    }

    // 8. Create Some Inventory Alerts
    console.log('⚠️ Creating Inventory Alerts...');
    const pendingInventory = inventoryRecords.filter(i => i.units > 0);
    for (let i = 0; i < Math.min(10, pendingInventory.length); i++) {
        const inv = pendingInventory[i];
        await prisma.inventoryAlert.create({
            data: {
                batchId: inv.id,
                bloodGroup: inv.bloodGroup,
                daysBeforeExpiry: Math.random() > 0.5 ? 7 : 3,
                notifyOnCritical: Math.random() > 0.8,
                method: 'in_app',
                active: true
            }
        });
    }

    console.log('✅ LifeLink database seed completed successfully!');
    console.log('   - 1 Admin User (admin@lifelink.com : admin123)');
    console.log('   - 25 Donors & 25 Recipients (password123 for all)');
    console.log(`   - ${hospitalRecords.length} Hospitals`);
    console.log(`   - ~${donorProfiles.length * 2} Donations / Inventory Batches`);
    console.log(`   - ~${recipientProfiles.length * 1.5} Blood Requests`);
    
    await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
