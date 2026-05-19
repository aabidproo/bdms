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
      "Grande International Hospital",
      "Norvic International Hospital",
      "Kanti Children's Hospital",
      "Civil Service Hospital"
    ],
    "Lalitpur": [
      "Patan Hospital",
      "Alka Hospital",
      "B&B Hospital",
      "Nepal Cancer Hospital",
      "Sumeru Hospital"
    ],
    "Bhaktapur": [
      "Bhaktapur Hospital",
      "Cancer Hospital Bhaktapur",
      "Dr. Iwamura Memorial Hospital",
      "Koreya Nepal Friendship Hospital"
    ],
    "Chitwan": [
      "Bharatpur Hospital",
      "Chitwan Medical College",
      "College of Medical Sciences",
      "B.P. Koirala Memorial Cancer Hospital"
    ],
    "Dhading": [
      "Dhading District Hospital",
      "Dhading Hospital",
      "Malekhu Community Hospital",
      "Dhading Red Cross Clinic"
    ],
    "Dolakha": [
      "Charikot Hospital",
      "Dolakha District Hospital",
      "Jiri Hospital",
      "Singati Clinic"
    ],
    "Kavrepalanchok": [
      "Dhulikhel Hospital",
      "Scheer Memorial Adventist Hospital",
      "Banepa Community Hospital",
      "Panauti Area Health Post"
    ],
    "Makwanpur": [
      "Hetauda Hospital",
      "Makwanpur Cooperative Hospital",
      "Churai Hospital",
      "Hetauda Community Hospital"
    ],
    "Nuwakot": [
      "Trishuli Hospital",
      "Nuwakot District Hospital",
      "Bidur Hospital",
      "Nuwakot Red Cross Clinic"
    ],
    "Ramechhap": [
      "Ramechhap District Hospital",
      "Manthali Hospital",
      "Tamakhoshi Cooperative Hospital",
      "Manthali Community Clinic"
    ],
    "Rasuwa": [
      "Rasuwa District Hospital",
      "Dhunche Hospital",
      "Rasuwa Community Health Center",
      "Syabrubesi Clinic"
    ],
    "Sindhuli": [
      "Sindhuli District Hospital",
      "Sindhuli Hospital",
      "Sindhuli Community Hospital",
      "Sindhuli Polyclinic"
    ],
    "Sindhupalchok": [
      "Sindhupalchok District Hospital",
      "Melamchi Hospital",
      "Barhabise Hospital",
      "Chautara Hospital"
    ]
  },
  "Koshi Province": {
    "Bhojpur": [
      "Bhojpur District Hospital",
      "Mahatma Gandhi Memorial Hospital",
      "Ghoretar Primary Health Center",
      "Bhojpur Community Hospital"
    ],
    "Dhankuta": [
      "Dhankuta District Hospital",
      "Dhankuta Community Hospital",
      "Hile Hospital",
      "Dhankuta Red Cross Clinic"
    ],
    "Ilam": [
      "Ilam District Hospital",
      "Ilam Hospital",
      "Ilam Community Hospital",
      "Suryodaya Polyclinic"
    ],
    "Jhapa": [
      "Mechi Provincial Hospital",
      "B&C Medical College Hospital",
      "AMDA Hospital Damak",
      "Purbanchal Cancer Hospital",
      "Om Sai Pathibhara Hospital"
    ],
    "Khotang": [
      "Diktel Hospital",
      "Khotang District Hospital",
      "Halesi Clinic",
      "Khotang Community Hospital"
    ],
    "Morang": [
      "Koshi Hospital",
      "Nobel Medical College",
      "Birat Medical College",
      "Neuro Hospital Biratnagar",
      "Biratnagar Hospital"
    ],
    "Okhaldhunga": [
      "Okhaldhunga Community Hospital",
      "Okhaldhunga District Hospital",
      "Rumjatar Hospital",
      "Okhaldhunga Red Cross Clinic"
    ],
    "Panchthar": [
      "Panchthar District Hospital",
      "Panchthar Hospital",
      "Phidim Hospital",
      "Panchthar Red Cross Clinic"
    ],
    "Sankhuwasabha": [
      "Khandbari Hospital",
      "Sankhuwasabha District Hospital",
      "Chainpur Hospital",
      "Sankhuwasabha Red Cross Clinic"
    ],
    "Solukhumbu": [
      "Phaplu Hospital",
      "Solukhumbu District Hospital",
      "Kundesang Clinic",
      "Lukla Hospital"
    ],
    "Sunsari": [
      "B.P. Koirala Institute of Health Sciences",
      "Inaruwa District Hospital",
      "Dharan City Hospital",
      "Vijayapur Hospital",
      "Itahari Community Hospital"
    ],
    "Taplejung": [
      "Taplejung District Hospital",
      "Taplejung Community Hospital",
      "Pathibhara Hospital",
      "Taplejung Red Cross Clinic"
    ],
    "Terhathum": [
      "Terhathum District Hospital",
      "Myanglung Hospital",
      "Terhathum Community Hospital",
      "Terhathum Red Cross Clinic"
    ],
    "Udayapur": [
      "Udayapur District Hospital",
      "Gaighat Hospital",
      "Katari Hospital",
      "Beltar Hospital"
    ]
  },
  "Madhesh Province": {
    "Bara": [
      "Kalaiya District Hospital",
      "Simara Hospital",
      "Nijgadh Community Hospital",
      "Al-Shifa Hospital",
      "Bara Community Hospital"
    ],
    "Dhanusha": [
      "Janakpur Provincial Hospital",
      "Janaki Medical College",
      "Kavya Hospital",
      "Dhanusha Care Hospital"
    ],
    "Mahottari": [
      "Jaleshwar Hospital",
      "Mahottari District Hospital",
      "Bardibas Hospital",
      "Mahottari Red Cross Clinic"
    ],
    "Parsa": [
      "Narayani Hospital",
      "National Medical College",
      "Asharam Hospital",
      "Bhawani Hospital",
      "Birgunj Hospital"
    ],
    "Rautahat": [
      "Gaur Hospital",
      "Rautahat District Hospital",
      "Chandrapur Hospital",
      "Rautahat Red Cross Clinic"
    ],
    "Saptari": [
      "Gajendra Narayan Singh Hospital",
      "Saptari District Hospital",
      "Sagarmatha Choudhary Eye Hospital",
      "Rajbiraj Hospital"
    ],
    "Sarlahi": [
      "Malangwa Hospital",
      "Sarlahi District Hospital",
      "Hariwon Hospital",
      "Sarlahi Red Cross Clinic"
    ],
    "Siraha": [
      "Siraha District Hospital",
      "Lahan Hospital",
      "Sagarmatha Choudhary Eye Hospital Lahan",
      "Siraha Red Cross Clinic"
    ]
  },
  "Gandaki Province": {
    "Baglung": [
      "Baglung District Hospital",
      "Dhaulagiri Hospital",
      "Galkot Hospital",
      "Baglung Red Cross Clinic"
    ],
    "Gorkha": [
      "Gorkha District Hospital",
      "Amppipal Hospital",
      "Palungtar Hospital",
      "Gorkha Community Hospital"
    ],
    "Kaski": [
      "Pokhara Academy of Health Sciences",
      "Manipal Teaching Hospital",
      "Gandaki Medical College",
      "Fishtail Hospital",
      "Charak Memorial Hospital"
    ],
    "Lamjung": [
      "Lamjung District Hospital",
      "Lamjung Hospital",
      "Besisahar Hospital",
      "Lamjung Community Hospital"
    ],
    "Manang": [
      "Manang District Hospital",
      "Chame Hospital",
      "Manang Community Clinic",
      "Manang Red Cross Clinic"
    ],
    "Mustang": [
      "Mustang District Hospital",
      "Jomsom Hospital",
      "Mustang Community Clinic",
      "Mustang Red Cross Clinic"
    ],
    "Myagdi": [
      "Myagdi District Hospital",
      "Beni Hospital",
      "Myagdi Community Hospital",
      "Myagdi Red Cross Clinic"
    ],
    "Nawalpur": [
      "Madhyabindu District Hospital",
      "Nawalpur Hospital",
      "Kawasoti Community Hospital",
      "Nawalpur Polyclinic"
    ],
    "Parbat": [
      "Parbat District Hospital",
      "Kusma Hospital",
      "Parbat Community Hospital",
      "Parbat Red Cross Clinic"
    ],
    "Syangja": [
      "Syangja District Hospital",
      "Waling Hospital",
      "Syangja Community Hospital",
      "Syangja Red Cross Clinic"
    ],
    "Tanahun": [
      "Damauli Hospital",
      "GP Koirala National Respiratory Center",
      "Ambu Khaireni Hospital",
      "Tanahun Community Hospital"
    ]
  },
  "Lumbini Province": {
    "Arghakhanchi": [
      "Arghakhanchi District Hospital",
      "Sandhikharka Hospital",
      "Arghakhanchi Community Hospital",
      "Arghakhanchi Red Cross Clinic"
    ],
    "Banke": [
      "Bheri Hospital",
      "Nepalgunj Medical College",
      "Western Hospital",
      "Khajura Cancer Hospital",
      "Nepalgunj Hospital"
    ],
    "Bardiya": [
      "Bardiya District Hospital",
      "Gulariya Hospital",
      "Bardiya Community Hospital",
      "Bardiya Red Cross Clinic"
    ],
    "Dang": [
      "Rapti Academy of Health Sciences",
      "Rapti Provincial Hospital",
      "Flores Hospital",
      "Dang Valley Hospital",
      "Ghorahi Hospital"
    ],
    "Eastern Rukum": [
      "Rukum East District Hospital",
      "Rukum East Hospital",
      "Rukum East Community Hospital",
      "Rukum East Red Cross Clinic"
    ],
    "Gulmi": [
      "Gulmi District Hospital",
      "Tamghas Hospital",
      "Gulmi Community Hospital",
      "Gulmi Red Cross Clinic"
    ],
    "Kapilvastu": [
      "Kapilvastu District Hospital",
      "Taulihawa Hospital",
      "Kapilvastu Community Hospital",
      "Kapilvastu Red Cross Clinic"
    ],
    "Palpa": [
      "Palpa District Hospital",
      "United Mission Hospital Tansen",
      "Lumbini Medical College",
      "Tansen Red Cross Clinic"
    ],
    "Parasi": [
      "Prithvi Chandra Hospital",
      "Parasi District Hospital",
      "Parasi Community Hospital",
      "Parasi Red Cross Clinic"
    ],
    "Pyuthan": [
      "Pyuthan District Hospital",
      "Pyuthan Hospital",
      "Bijuwar Hospital",
      "Pyuthan Red Cross Clinic"
    ],
    "Rolpa": [
      "Rolpa District Hospital",
      "Liwang Hospital",
      "Rolpa Community Hospital",
      "Rolpa Red Cross Clinic"
    ],
    "Rupandehi": [
      "Lumbini Provincial Hospital",
      "Universal College of Medical Sciences",
      "Bhim Hospital",
      "Crimson Hospital",
      "Butwal Hospital"
    ]
  },
  "Karnali Province": {
    "Dailekh": [
      "Dailekh District Hospital",
      "Dullu Hospital",
      "Dailekh Community Hospital",
      "Dailekh Red Cross Clinic"
    ],
    "Dolpa": [
      "Dolpa District Hospital",
      "Dunai Hospital",
      "Dolpa Community Clinic",
      "Dolpa Red Cross Clinic"
    ],
    "Humla": [
      "Humla District Hospital",
      "Simikot Hospital",
      "Humla Community Clinic",
      "Humla Red Cross Clinic"
    ],
    "Jajarkot": [
      "Jajarkot District Hospital",
      "Jajarkot Hospital",
      "Jajarkot Community Hospital",
      "Jajarkot Red Cross Clinic"
    ],
    "Jumla": [
      "Karnali Academy of Health Sciences",
      "Jumla District Hospital",
      "Chandannath Hospital",
      "Jumla Community Clinic"
    ],
    "Kalikot": [
      "Kalikot District Hospital",
      "Manma Hospital",
      "Kalikot Community Hospital",
      "Kalikot Red Cross Clinic"
    ],
    "Mugu": [
      "Mugu District Hospital",
      "Gamgadhi Hospital",
      "Mugu Community Clinic",
      "Mugu Red Cross Clinic"
    ],
    "Salyan": [
      "Salyan District Hospital",
      "Salyan Hospital",
      "Salyan Community Hospital",
      "Salyan Red Cross Clinic"
    ],
    "Surkhet": [
      "Karnali Provincial Hospital",
      "Surkhet City Hospital",
      "Deuti Hospital",
      "Mid-Western Hospital",
      "Surkhet Community Hospital"
    ],
    "Western Rukum": [
      "Chaurjahari Hospital",
      "Rukum West District Hospital",
      "Rukum West Hospital",
      "Rukum West Red Cross Clinic"
    ]
  },
  "Sudurpashchim Province": {
    "Achham": [
      "Achham District Hospital",
      "Bayalpata Hospital",
      "Achham Community Hospital",
      "Achham Red Cross Clinic"
    ],
    "Baitadi": [
      "Baitadi District Hospital",
      "Patan Hospital Baitadi",
      "Baitadi Community Hospital",
      "Baitadi Red Cross Clinic"
    ],
    "Bajhang": [
      "Bajhang District Hospital",
      "Chainpur Hospital Bajhang",
      "Bajhang Community Hospital",
      "Bajhang Red Cross Clinic"
    ],
    "Bajura": [
      "Bajura District Hospital",
      "Martadi Hospital",
      "Bajura Community Hospital",
      "Bajura Red Cross Clinic"
    ],
    "Dadeldhura": [
      "Dadeldhura Hospital",
      "Dadeldhura District Hospital",
      "Dadeldhura Community Hospital",
      "Dadeldhura Red Cross Clinic"
    ],
    "Darchula": [
      "Darchula District Hospital",
      "Gokuleshwar Hospital",
      "Darchula Community Hospital",
      "Darchula Red Cross Clinic"
    ],
    "Doti": [
      "Doti District Hospital",
      "Siluwar Hospital",
      "Doti Community Hospital",
      "Doti Red Cross Clinic"
    ],
    "Kailali": [
      "Seti Provincial Hospital",
      "Nisarga Hospital",
      "Navajeevan Hospital",
      "Tikapur Hospital",
      "Dhangadhi Hospital"
    ],
    "Kanchanpur": [
      "Mahakuni Provincial Hospital",
      "Dodhara Health Center",
      "Kriti Hospital",
      "Kanchanpur City Hospital",
      "Mahendranagar Hospital"
    ]
  }
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS   = ["Whole Blood", "Packed RBC", "Platelets", "Plasma", "Cryoprecipitate"];

async function main() {
  console.log('🌱 Starting Nepal hospital seed (77 Districts)... \n');
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
                units: Math.floor(Math.random() * 50) + 10 // seed with initial random stock of 10-60 units so it's fully populated and realistic!
              }
            });
            stockCount++;
          }
        }
      }
      console.log(`  📍 District: ${district.name} (${hospitals.length} hospitals)`);
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
