/**
 * seedHospitals.js
 * Seeds Nepal provinces, districts, hospitals, and blank BloodBankStock entries.
 * Safe to run multiple times — all operations use upsert.
 * Usage: node prisma/seedHospitals.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const HOSPITAL_DATA = {
  "Bagmati Province": {
    "Kathmandu": [
      "Tribhuvan University Teaching Hospital",
      "Bir Hospital",
      "Patan Hospital",
      "Grande International Hospital",
      "Norvic International Hospital"
    ],
    "Lalitpur": [
      "Patan Academy of Health Sciences",
      "Lalitpur Community Hospital",
      "Medicare National Hospital"
    ],
    "Bhaktapur": [
      "Bhaktapur Hospital",
      "Sushma Koirala Memorial Hospital",
      "Kathmandu University Hospital"
    ]
  },
  "Koshi Province": {
    "Morang": [
      "Koshi Hospital",
      "Nobel Medical College",
      "Birat Medical College",
      "Neuro Hospital Biratnagar"
    ],
    "Sunsari": [
      "B.P. Koirala Institute of Health Sciences",
      "Inaruwa District Hospital",
      "Dharan City Hospital",
      "Vijayapur Hospital"
    ],
    "Jhapa": [
      "Mechi Provincial Hospital",
      "B&C Medical College Hospital",
      "AMDA Hospital Damak",
      "Purbanchal Cancer Hospital"
    ]
  },
  "Madhesh Province": {
    "Dhanusha": [
      "Janakpur Provincial Hospital",
      "Janaki Medical College",
      "Kavya Hospital"
    ],
    "Parsa": [
      "Narayani Hospital",
      "National Medical College",
      "Asharam Hospital",
      "Bhawani Hospital"
    ],
    "Bara": [
      "Kalaiya District Hospital",
      "Simara Hospital",
      "Nijgadh Community Hospital",
      "Al-Shifa Hospital"
    ]
  },
  "Gandaki Province": {
    "Kaski": [
      "Pokhara Academy of Health Sciences",
      "Manipal Teaching Hospital",
      "Gandaki Medical College",
      "Fishtail Hospital"
    ],
    "Tanahun": [
      "Damauli Hospital",
      "GP Koirala National Respiratory Center",
      "Ambu Khaireni Hospital"
    ],
    "Gorkha": [
      "Gorkha District Hospital",
      "Amppipal Hospital",
      "Palungtar Hospital"
    ]
  },
  "Lumbini Province": {
    "Rupandehi": [
      "Lumbini Provincial Hospital",
      "Universal College of Medical Sciences",
      "Bhim Hospital",
      "Crimson Hospital"
    ],
    "Banke": [
      "Bheri Hospital",
      "Nepalgunj Medical College",
      "Western Hospital",
      "Khajura Cancer Hospital"
    ],
    "Dang": [
      "Rapti Academy of Health Sciences",
      "Rapti Provincial Hospital",
      "Flores Hospital",
      "Dang Valley Hospital"
    ]
  },
  "Karnali Province": {
    "Surkhet": [
      "Karnali Provincial Hospital",
      "Surkhet City Hospital",
      "Deuti Hospital",
      "Mid-Western Hospital"
    ],
    "Jumla": [
      "Karnali Academy of Health Sciences",
      "Jumla District Hospital",
      "Chandannath Hospital"
    ]
  },
  "Sudurpashchim Province": {
    "Kailali": [
      "Seti Provincial Hospital",
      "Nisarga Hospital",
      "Navajeevan Hospital",
      "Tikapur Hospital"
    ],
    "Kanchanpur": [
      "Mahakuni Provincial Hospital",
      "Dodhara Health Center",
      "Kriti Hospital",
      "Kanchanpur City Hospital"
    ]
  }
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS   = ["Whole Blood", "Packed RBC", "Platelets", "Plasma", "Cryoprecipitate"];

async function main() {
  console.log('🌱 Starting Nepal hospital seed...\n');
  let hospitalCount = 0;
  let stockCount    = 0;

  for (const [provinceName, districts] of Object.entries(HOSPITAL_DATA)) {
    // 1. Upsert Province
    const province = await prisma.province.upsert({
      where:  { name: provinceName },
      update: {},
      create: { name: provinceName }
    });
    console.log(`✅ Province: ${province.name}`);

    for (const [districtName, hospitals] of Object.entries(districts)) {
      // 2. Upsert District
      const district = await prisma.district.upsert({
        where:  { name_provinceId: { name: districtName, provinceId: province.id } },
        update: {},
        create: { name: districtName, provinceId: province.id }
      });
      console.log(`  📍 District: ${district.name}`);

      for (const hospitalName of hospitals) {
        // 3. Check if Hospital exists, update or create
        let hospital = await prisma.hospital.findFirst({
          where: { name: hospitalName }
        });

        if (hospital) {
          hospital = await prisma.hospital.update({
            where: { id: hospital.id },
            data: {
              districtId: district.id,
              province:   provinceName,
              district:   districtName,
              category:   'General Hospital',
              isActive:   true
            }
          });
        } else {
          hospital = await prisma.hospital.create({
            data: {
              name:       hospitalName,
              city:       districtName,
              province:   provinceName,
              district:   districtName,
              category:   'General Hospital',
              isActive:   true,
              districtId: district.id
            }
          });
        }
        hospitalCount++;
        console.log(`    🏥 Hospital: ${hospital.name}`);

        // 4. Upsert BloodBankStock for every blood group × component
        for (const bloodGroup of BLOOD_GROUPS) {
          for (const component of COMPONENTS) {
            await prisma.bloodBankStock.upsert({
              where: {
                hospitalId_bloodGroup_component: {
                  hospitalId: hospital.id,
                  bloodGroup,
                  component
                }
              },
              update: {}, // don't reset existing units
              create: {
                hospitalId: hospital.id,
                bloodGroup,
                component,
                units: 0
              }
            });
            stockCount++;
          }
        }
      }
    }
  }

  console.log(`\n🎉 Seed complete!`);
  console.log(`   Hospitals seeded : ${hospitalCount}`);
  console.log(`   Stock rows seeded: ${stockCount}`);
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
