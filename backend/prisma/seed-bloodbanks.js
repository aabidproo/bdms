const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const hospitalsData = [
  {
    name: 'Bir Hospital',
    city: 'Kathmandu',
    province: 'Bagmati',
    district: 'Kathmandu',
    address: 'Kanti Path, Kathmandu 44600',
    phone: '01-4221119',
    category: 'Government',
  },
  {
    name: 'Nepal Red Cross Society Blood Bank',
    city: 'Kathmandu',
    province: 'Bagmati',
    district: 'Kathmandu',
    address: 'Exhibition Road, Kathmandu 44600',
    phone: '01-4225067',
    category: 'Red Cross',
  },
  {
    name: 'Tribhuvan University Teaching Hospital (TUTH)',
    city: 'Kathmandu',
    province: 'Bagmati',
    district: 'Kathmandu',
    address: 'Maharajgunj, Kathmandu',
    phone: '01-4412303',
    category: 'Government',
  },
  {
    name: 'B.P. Koirala Institute of Health Sciences',
    city: 'Dharan',
    province: 'Koshi',
    district: 'Sunsari',
    address: 'Buddha Road, Dharan',
    phone: '025-525555',
    category: 'Government',
  },
  {
    name: 'Lumbini Provincial Hospital',
    city: 'Butwal',
    province: 'Lumbini',
    district: 'Rupandehi',
    address: 'Hospital Road, Butwal',
    phone: '071-540200',
    category: 'Government',
  },
  {
    name: 'Gandaki Medical College',
    city: 'Pokhara',
    province: 'Gandaki',
    district: 'Kaski',
    address: 'Lekhnath Marg, Pokhara',
    phone: '061-526044',
    category: 'Private',
  },
  {
    name: 'Seti Provincial Hospital',
    city: 'Dhangadhi',
    province: 'Sudurpashchim',
    district: 'Kailali',
    address: 'Dhangadhi, Kailali',
    phone: '091-525911',
    category: 'Government',
  }
];

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const components = ['Whole Blood', 'Packed RBC', 'Fresh Frozen Plasma', 'Platelets'];

async function main() {
  console.log('Starting Blood Bank and Inventory seeding...');

  // First, clear existing hospitals and their stock to prevent duplicates if run multiple times
  await prisma.bloodBankStock.deleteMany({});
  await prisma.hospital.deleteMany({});

  for (const hospitalData of hospitalsData) {
    const hospital = await prisma.hospital.create({
      data: hospitalData
    });

    console.log(`Created hospital: ${hospital.name}`);

    // Randomly assign some blood stock to each hospital
    const numberOfStocks = Math.floor(Math.random() * 10) + 5; // 5 to 15 stock entries per hospital
    
    for (let i = 0; i < numberOfStocks; i++) {
      const bg = bloodGroups[Math.floor(Math.random() * bloodGroups.length)];
      const comp = components[Math.floor(Math.random() * components.length)];
      const units = Math.floor(Math.random() * 50) + 1; // 1 to 50 units
      
      // Ensure we don't create duplicate bg+comp for the same hospital
      const existing = await prisma.bloodBankStock.findFirst({
        where: { hospitalId: hospital.id, bloodGroup: bg, component: comp }
      });

      if (!existing) {
        await prisma.bloodBankStock.create({
          data: {
            hospitalId: hospital.id,
            bloodGroup: bg,
            component: comp,
            units: units
          }
        });
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
