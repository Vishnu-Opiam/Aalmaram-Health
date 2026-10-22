/**
 * "What we offer" seed data: vendors with full profiles, their branches and
 * practitioners, and their components.
 *
 * Every vendor, practitioner and component here is FICTIONAL and suffixed
 * "(demo)". Descriptions avoid clinical claims. The set exercises the 15 Oct
 * test cases: a blood test (practitioner + deliverable), a Swedish massage (no
 * deliverable), a Fort Kochi walking tour (a guide), a multi-branch lab, a
 * restaurant priced for two, and one deliberately incomplete vendor.
 */
import type { PriceUnit, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

type VendorSpec = {
  name: string;
  description?: string;
  contactName?: string;
  email?: string;
  phone: string;
  hqLine?: string;
  hqCity?: string;
  hqPostcode?: string;
  hqCountry?: string;
  website?: string;
  socialLinks?: string[];
  accreditations?: string[];
  languages?: string[];
  yearEstablished?: number;
  staffCount?: number;
  equipment?: string[];
  owners?: string[];
  notes?: string;
  branches?: { name: string; addressLine?: string; city: string; postcode?: string }[];
  practitioners?: {
    name: string;
    role: string;
    qualifications?: string[];
    achievements?: string[];
    yearsOfExperience?: number;
    languages?: string[];
  }[];
};

export const VENDORS: VendorSpec[] = [
  {
    name: "Backwater Diagnostics Centre (demo)",
    description:
      "A diagnostics laboratory chain with collection centres across central Kerala. Samples from every branch are processed in one central laboratory in Kochi, and reports are issued in English.",
    contactName: "Anil Varghese",
    email: "contact@backwater-diagnostics.demo",
    phone: "+91 484 000 0101",
    hqLine: "12 Lab Road (demo)",
    hqCity: "Kochi",
    hqPostcode: "682024",
    hqCountry: "India",
    website: "https://backwater-diagnostics.demo",
    socialLinks: ["https://instagram.com/backwater_diagnostics_demo"],
    accreditations: ["Fictional laboratory accreditation (demo)", "Fictional quality certificate (demo)"],
    languages: ["English", "Malayalam", "Hindi"],
    yearEstablished: 1998,
    staffCount: 420,
    equipment: ["3T MRI scanner (demo)", "Automated chemistry analysers (demo)", "Echocardiography suite (demo)"],
    owners: ["Backwater Health Group (demo)"],
    notes: "Demo vendor. Not a real business.",
    branches: [
      { name: "Edappally", addressLine: "NH Bypass (demo)", city: "Kochi", postcode: "682024" },
      { name: "Fort Kochi", addressLine: "Princess Street (demo)", city: "Kochi", postcode: "682001" },
      { name: "Thrissur Round", addressLine: "Swaraj Round (demo)", city: "Thrissur", postcode: "680001" },
      { name: "Alappuzha Beach", addressLine: "Beach Road (demo)", city: "Alappuzha", postcode: "688012" },
      { name: "Varkala Cliff", addressLine: "North Cliff (demo)", city: "Varkala", postcode: "695141" },
    ],
    practitioners: [
      {
        name: "Dr Anjali Rao (demo)",
        role: "Consultant pathologist",
        qualifications: ["MBBS (demo)", "MD Pathology (demo)"],
        achievements: ["Leads the central laboratory (demo)"],
        yearsOfExperience: 22,
        languages: ["English", "Malayalam"],
      },
      {
        name: "Dr Thomas George (demo)",
        role: "Consultant radiologist",
        qualifications: ["MBBS (demo)", "MD Radiodiagnosis (demo)"],
        yearsOfExperience: 18,
        languages: ["English", "Malayalam", "Hindi"],
      },
    ],
  },
  {
    name: "Nila Speciality Clinic (demo)",
    description:
      "A small clinic run by a senior internal-medicine physician from her home practice in Thrissur. Appointments are unhurried and consultations are held in English.",
    contactName: "Dr Reshma Nair",
    email: "hello@nila-clinic.demo",
    phone: "+91 487 000 0202",
    hqLine: "Temple Lane (demo)",
    hqCity: "Thrissur",
    hqPostcode: "680005",
    hqCountry: "India",
    accreditations: ["Fictional medical council registration (demo)"],
    languages: ["English", "Malayalam", "Tamil"],
    yearEstablished: 1994,
    staffCount: 9,
    equipment: ["ECG machine (demo)", "Dermatoscope (demo)"],
    owners: ["Dr Reshma Nair (demo)"],
    notes: "Demo vendor. Not a real business.",
    branches: [{ name: "Thrissur clinic", addressLine: "Temple Lane (demo)", city: "Thrissur", postcode: "680005" }],
    practitioners: [
      {
        name: "Dr Reshma Nair (demo)",
        role: "Senior consultant, internal medicine",
        qualifications: ["MBBS (demo)", "MD Internal Medicine (demo)"],
        achievements: ["Thirty years in practice (demo)"],
        yearsOfExperience: 30,
        languages: ["English", "Malayalam", "Tamil"],
      },
      {
        name: "Dr Vivek Menon (demo)",
        role: "Consultant dermatologist",
        qualifications: ["MBBS (demo)", "MD Dermatology (demo)"],
        yearsOfExperience: 14,
        languages: ["English", "Malayalam"],
      },
    ],
  },
  {
    name: "Kaumudi Ayurveda Retreat (demo)",
    description:
      "A seaside Ayurveda retreat on the Varkala cliffs offering residential programmes, single treatments, Western massage and daily yoga.",
    contactName: "Sreelatha Pillai",
    email: "stay@kaumudi-ayurveda.demo",
    phone: "+91 470 000 0303",
    hqLine: "South Cliff (demo)",
    hqCity: "Varkala",
    hqPostcode: "695141",
    hqCountry: "India",
    website: "https://kaumudi-ayurveda.demo",
    socialLinks: ["https://instagram.com/kaumudi_ayurveda_demo"],
    accreditations: ["Fictional Ayurveda centre classification (demo)"],
    languages: ["English", "Malayalam", "German"],
    yearEstablished: 2006,
    staffCount: 48,
    equipment: ["Traditional droni treatment tables (demo)", "Herbal steam chambers (demo)"],
    owners: ["The Pillai family (demo)"],
    notes: "Demo vendor. Not a real business.",
    branches: [{ name: "Varkala retreat", addressLine: "South Cliff (demo)", city: "Varkala", postcode: "695141" }],
    practitioners: [
      {
        name: "Lakshmi Devi (demo)",
        role: "Yoga teacher",
        qualifications: ["500-hour yoga teacher training (demo)"],
        yearsOfExperience: 12,
        languages: ["English", "Malayalam"],
      },
      {
        name: "Anna Weber (demo)",
        role: "Massage therapist",
        qualifications: ["Certified massage therapist (demo)"],
        yearsOfExperience: 9,
        languages: ["English", "German"],
      },
    ],
  },
  {
    name: "Periyar Wellness House (demo)",
    description:
      "A quiet wellness house in the cardamom hills near Thekkady, with a working spice plantation next door.",
    contactName: "Joseph Mathew",
    email: "care@periyar-wellness.demo",
    phone: "+91 486 000 0404",
    hqCity: "Thekkady",
    hqCountry: "India",
    languages: ["English", "Malayalam"],
    yearEstablished: 2012,
    staffCount: 15,
    owners: ["Joseph Mathew (demo)"],
    notes: "Demo vendor. Not a real business.",
    branches: [{ name: "Thekkady house", city: "Thekkady" }],
    practitioners: [
      {
        name: "Biju Thomas (demo)",
        role: "Plantation guide",
        yearsOfExperience: 20,
        languages: ["English", "Malayalam"],
      },
    ],
  },
  {
    name: "Kalari Heritage Collective (demo)",
    description:
      "A collective of performers, cooks and guides in Fort Kochi who share Kerala's arts, food and history with small groups.",
    contactName: "Meera Krishnan",
    email: "visit@kalari-heritage.demo",
    phone: "+91 484 000 0505",
    hqLine: "Bazaar Road (demo)",
    hqCity: "Kochi",
    hqPostcode: "682001",
    hqCountry: "India",
    website: "https://kalari-heritage.demo",
    socialLinks: ["https://instagram.com/kalari_heritage_demo"],
    languages: ["English", "Malayalam", "French"],
    yearEstablished: 2001,
    staffCount: 26,
    owners: ["Meera Krishnan (demo)"],
    notes: "Demo vendor. Not a real business.",
    branches: [{ name: "Fort Kochi theatre", addressLine: "Bazaar Road (demo)", city: "Kochi", postcode: "682001" }],
    practitioners: [
      {
        name: "Kalamandalam Unni (demo)",
        role: "Kathakali performer",
        achievements: ["Trained at a classical arts academy (demo)"],
        yearsOfExperience: 25,
        languages: ["Malayalam", "English"],
      },
      {
        name: "Rahul Joseph (demo)",
        role: "Walking-tour guide",
        qualifications: ["Licensed heritage guide (demo)"],
        yearsOfExperience: 11,
        languages: ["English", "Malayalam", "French"],
      },
    ],
  },
  {
    name: "Vembanad Boat Company (demo)",
    description: "Private houseboat and canoe trips on the Vembanad backwaters, crewed by families from the lake villages.",
    contactName: "Thomas Kurian",
    email: "cruise@vembanad-boats.demo",
    phone: "+91 477 000 0606",
    hqCity: "Alappuzha",
    hqCountry: "India",
    socialLinks: ["https://instagram.com/vembanad_boats_demo"],
    languages: ["English", "Malayalam"],
    yearEstablished: 2009,
    staffCount: 60,
    equipment: ["Converted rice barges (demo)", "Country canoes (demo)"],
    owners: ["Thomas Kurian (demo)"],
    notes: "Demo vendor. Not a real business.",
    branches: [{ name: "Finishing Point jetty", city: "Alappuzha" }],
  },
  {
    name: "Malabar Spice Table (demo)",
    description: "A family restaurant in a restored warehouse in Fort Kochi serving Kerala coastal food.",
    phone: "+91 484 000 0707",
    hqCity: "Kochi",
    hqCountry: "India",
    socialLinks: ["https://instagram.com/malabar_spice_table_demo"],
    languages: ["English", "Malayalam"],
    yearEstablished: 2015,
    notes: "Demo vendor. Not a real business. Priced from the average for two.",
    branches: [{ name: "Fort Kochi", addressLine: "Calvathy Road (demo)", city: "Kochi", postcode: "682001" }],
  },
  {
    // Deliberately incomplete: shows the "missing fields" list.
    name: "Thekkady Trail Guides (demo)",
    phone: "+91 486 000 0808",
    notes: "Demo vendor. Profile not yet filled in.",
  },
];

type ComponentSpec = {
  vendor: string;
  catalogue: string;
  name: string;
  tags: string[];
  price: string;
  priceUnit?: PriceUnit;
  durationMinutes: number;
  recoveryTimeMinutes?: number;
  clientFacingDescription: string;
  whatsIncluded: string;
  clientDeliverable?: string;
  practitioners?: string[];
};

export const COMPONENTS: ComponentSpec[] = [
  {
    vendor: "Backwater Diagnostics Centre (demo)",
    catalogue: "Diagnostics",
    name: "Comprehensive Blood Panel",
    tags: ["bloodwork", "fasting", "morning", "diagnostics", "blood test"],
    price: "185.00",
    durationMinutes: 30,
    clientFacingDescription:
      "A broad panel of blood tests taken in a single morning appointment at the branch of your choice. Samples are processed in the central laboratory.",
    whatsIncluded:
      "Phlebotomy appointment (about 20 minutes)\nLaboratory processing\nWritten results in English",
    clientDeliverable: "A PDF results report in English, usually within 48 hours.",
    practitioners: ["Dr Anjali Rao (demo)"],
  },
  {
    vendor: "Backwater Diagnostics Centre (demo)",
    catalogue: "Diagnostics",
    name: "Full-Body MRI Screening",
    tags: ["imaging", "mri", "diagnostics", "half-day"],
    price: "620.00",
    durationMinutes: 120,
    clientFacingDescription:
      "A non-contrast whole-body MRI screening in one visit of roughly two hours, reported by the centre's radiology team.",
    whatsIncluded:
      "Pre-scan safety questionnaire and briefing\nWhole-body MRI acquisition\nRadiologist report\nDigital copy of the images",
    clientDeliverable: "A radiology report and a digital copy of your images.",
    practitioners: ["Dr Thomas George (demo)"],
  },
  {
    vendor: "Backwater Diagnostics Centre (demo)",
    catalogue: "Diagnostics",
    name: "Cardiac Health Assessment",
    tags: ["cardiac", "ecg", "diagnostics", "heart"],
    price: "295.00",
    durationMinutes: 90,
    clientFacingDescription:
      "A resting ECG, echocardiogram and treadmill test in one session, with a written summary from the reviewing cardiologist.",
    whatsIncluded: "Resting ECG\nEchocardiogram\nTreadmill exercise test\nWritten summary",
    clientDeliverable: "A written cardiology summary report.",
  },
  {
    vendor: "Nila Speciality Clinic (demo)",
    catalogue: "Consultations",
    name: "Internal Medicine Consultation",
    tags: ["consultation", "english-speaking", "report review", "check-up"],
    price: "120.00",
    durationMinutes: 60,
    clientFacingDescription:
      "A one-hour consultation with a senior internal-medicine physician who speaks English, to review the reports you bring and answer your questions.",
    whatsIncluded:
      "Sixty-minute consultation\nReview of documents you bring with you\nWritten summary of what was discussed",
    clientDeliverable: "A written consultation summary.",
    practitioners: ["Dr Reshma Nair (demo)"],
  },
  {
    vendor: "Nila Speciality Clinic (demo)",
    catalogue: "Dermatology",
    name: "Dermatology Skin Assessment",
    tags: ["dermatology", "skin", "consultation"],
    price: "140.00",
    durationMinutes: 45,
    clientFacingDescription:
      "A dermatologist-led skin assessment including dermoscopic examination, with a written record of findings.",
    whatsIncluded: "Dermatologist consultation\nDermoscopic examination\nWritten findings",
    clientDeliverable: "A written dermatology assessment.",
    practitioners: ["Dr Vivek Menon (demo)"],
  },
  {
    vendor: "Kaumudi Ayurveda Retreat (demo)",
    catalogue: "Ayurveda Programmes",
    name: "Seven-Day Panchakarma Programme",
    tags: ["ayurveda", "panchakarma", "residential", "multi-day"],
    price: "1450.00",
    durationMinutes: 7 * 24 * 60,
    clientFacingDescription:
      "A seven-night residential Ayurveda programme with a daily therapy schedule set by the retreat's physicians after an initial assessment, plus full board.",
    whatsIncluded:
      "Seven nights' accommodation\nInitial and closing consultations\nDaily therapies as scheduled\nFull board on the programme diet\nDaily guided yoga",
    clientDeliverable: "A written programme summary and dietary notes to take home.",
  },
  {
    vendor: "Kaumudi Ayurveda Retreat (demo)",
    catalogue: "Therapeutic Bodywork",
    name: "Swedish Massage",
    tags: ["massage", "relaxation", "single-session", "afternoon"],
    price: "60.00",
    durationMinutes: 60,
    clientFacingDescription:
      "A sixty-minute Swedish full-body massage in a sea-view treatment room, with time to rest afterwards.",
    whatsIncluded: "Sixty-minute massage\nShower and rest area\nHerbal tea",
    practitioners: ["Anna Weber (demo)"],
  },
  {
    vendor: "Kaumudi Ayurveda Retreat (demo)",
    catalogue: "Therapeutic Bodywork",
    name: "Abhyanga Full-Body Treatment",
    tags: ["ayurveda", "massage", "single-session", "afternoon"],
    price: "85.00",
    durationMinutes: 75,
    clientFacingDescription:
      "A traditional warm-oil full-body treatment delivered by two therapists, lasting about 75 minutes including rest time.",
    whatsIncluded: "Seventy-five minute treatment with two therapists\nHerbal oils\nSteam and rest period afterwards",
  },
  {
    vendor: "Kaumudi Ayurveda Retreat (demo)",
    catalogue: "Yoga & Movement",
    name: "Private Yoga Session",
    tags: ["yoga", "private", "morning", "beginner-friendly"],
    price: "45.00",
    durationMinutes: 60,
    clientFacingDescription:
      "A one-to-one yoga session with a resident teacher, adapted to your experience and any movement limitations you mention beforehand.",
    whatsIncluded: "Sixty-minute private session\nMat and props provided\nA short written practice sequence",
    practitioners: ["Lakshmi Devi (demo)"],
  },
  {
    vendor: "Periyar Wellness House (demo)",
    catalogue: "Therapeutic Bodywork",
    name: "Herbal Steam and Rest Afternoon",
    tags: ["wellness", "steam", "half-day", "restorative"],
    price: "70.00",
    durationMinutes: 180,
    clientFacingDescription:
      "A quiet half-day in the spice hills: herbal steam, a rest period on a shaded veranda and a light herbal meal.",
    whatsIncluded: "Herbal steam session\nRest period with herbal tea\nLight vegetarian meal",
  },
  {
    vendor: "Periyar Wellness House (demo)",
    catalogue: "Backwaters & Nature",
    name: "Spice Plantation Walk",
    tags: ["nature", "walking", "guided", "morning"],
    price: "38.00",
    durationMinutes: 120,
    clientFacingDescription:
      "A guided two-hour walk through a working cardamom and pepper plantation in the Idukki hills.",
    whatsIncluded: "Two-hour guided walk\nPlantation entry\nTasting of the estate's spices",
    practitioners: ["Biju Thomas (demo)"],
  },
  {
    vendor: "Kalari Heritage Collective (demo)",
    catalogue: "Performing Arts",
    name: "Kathakali Performance with Make-Up Demonstration",
    tags: ["culture", "performance", "evening", "kathakali"],
    price: "42.00",
    durationMinutes: 150,
    clientFacingDescription:
      "An evening at a heritage theatre in Fort Kochi: watch the performers apply their make-up, hear an introduction to the story, then see the performance.",
    whatsIncluded: "Make-up demonstration\nIntroduction in English\nOne-hour performance\nReserved seating",
    practitioners: ["Kalamandalam Unni (demo)"],
  },
  {
    vendor: "Kalari Heritage Collective (demo)",
    catalogue: "Walking Tours",
    name: "Fort Kochi Heritage Walking Tour",
    tags: ["culture", "walking", "history", "morning", "fort kochi"],
    price: "30.00",
    durationMinutes: 150,
    clientFacingDescription:
      "A gentle two-and-a-half-hour walk through Fort Kochi's lanes, churches, warehouses and the Chinese fishing nets, with plenty of stops in the shade.",
    whatsIncluded: "Licensed guide\nWater and a coffee stop\nRoute adapted to your pace",
    practitioners: ["Rahul Joseph (demo)"],
  },
  {
    vendor: "Kalari Heritage Collective (demo)",
    catalogue: "Cuisine & Craft",
    name: "Kerala Home Cooking Workshop",
    tags: ["culture", "cooking", "hands-on", "afternoon", "food"],
    price: "55.00",
    durationMinutes: 180,
    clientFacingDescription:
      "A hands-on afternoon cooking four Kerala dishes in a family home in Fort Kochi, finishing with the meal you have cooked.",
    whatsIncluded: "Market walk\nThree-hour hands-on cooking session\nThe meal you prepare\nPrinted recipes",
    clientDeliverable: "Printed recipes for the dishes you cooked.",
  },
  {
    vendor: "Vembanad Boat Company (demo)",
    catalogue: "Backwaters & Nature",
    name: "Private Backwater Day Cruise",
    tags: ["backwaters", "boat", "full-day", "alappuzha"],
    price: "260.00",
    priceUnit: "PER_GROUP",
    durationMinutes: 480,
    clientFacingDescription:
      "A full day on the Vembanad backwaters aboard a private converted rice barge for up to four guests, with lunch cooked on board.",
    whatsIncluded: "Private boat with crew of three\nLunch and afternoon tea on board\nWater and soft drinks",
  },
  {
    vendor: "Vembanad Boat Company (demo)",
    catalogue: "Backwaters & Nature",
    name: "Sunrise Canoe Village Tour",
    tags: ["backwaters", "canoe", "early-morning", "small-group"],
    price: "48.00",
    durationMinutes: 120,
    clientFacingDescription:
      "A quiet two-hour paddle through the narrow canals at first light, in a small country canoe with a local guide.",
    whatsIncluded: "Two-hour guided canoe tour\nLocal guide\nTea at a village home",
  },
  {
    vendor: "Malabar Spice Table (demo)",
    catalogue: "Restaurants",
    name: "Dinner at Malabar Spice Table",
    tags: ["food", "dinner", "seafood", "vegetarian options", "evening"],
    price: "35.00",
    priceUnit: "FOR_TWO",
    durationMinutes: 90,
    clientFacingDescription:
      "Kerala coastal dinner in a restored spice warehouse. Price is the average for two; you order from the menu on the night.",
    whatsIncluded: "Table reservation",
  },
  {
    vendor: "Malabar Spice Table (demo)",
    catalogue: "Restaurants",
    name: "Candlelit Courtyard Dinner",
    tags: ["food", "dinner", "special occasion", "evening"],
    price: "95.00",
    priceUnit: "FOR_TWO",
    durationMinutes: 150,
    clientFacingDescription:
      "A private table in the courtyard with a set seven-course Kerala menu, for a special evening.",
    whatsIncluded: "Seven-course set menu\nPrivate courtyard table\nWelcome drink",
  },
];

export const EXTRA_CATALOGUES = [
  { module: "Heritage & Culture", name: "Walking Tours", sortOrder: 3, description: "Guided walks through towns and villages." },
  { module: "Heritage & Culture", name: "Restaurants", sortOrder: 4, description: "Places to eat, priced from the average for two." },
];

/** Upserts vendors, branches, practitioners and components. Idempotent. */
export async function seedInventory(
  prisma: PrismaClient,
  catalogues: Record<string, string>,
  sourceDate: Date,
) {
  const vendors: Record<string, string> = {};
  const practitioners: Record<string, string> = {};

  for (const { branches = [], practitioners: people = [], ...spec } of VENDORS) {
    const vendor = await prisma.vendor.upsert({
      where: { name: spec.name },
      update: spec,
      create: spec,
    });
    vendors[spec.name] = vendor.id;

    for (const branch of branches) {
      await prisma.branch.upsert({
        where: { vendorId_name: { vendorId: vendor.id, name: branch.name } },
        update: branch,
        create: { ...branch, vendorId: vendor.id, country: "India" },
      });
    }

    for (const person of people) {
      const existing = await prisma.practitioner.findFirst({
        where: { vendorId: vendor.id, name: person.name },
        select: { id: true },
      });
      const record = existing
        ? await prisma.practitioner.update({ where: { id: existing.id }, data: person })
        : await prisma.practitioner.create({ data: { ...person, vendorId: vendor.id } });
      practitioners[person.name] = record.id;
    }
  }

  for (const { vendor, catalogue, practitioners: people = [], price, ...spec } of COMPONENTS) {
    const data = {
      ...spec,
      catalogueId: catalogues[catalogue],
      price: new Prisma.Decimal(price),
      priceUnit: spec.priceUnit ?? "PER_PERSON",
      recoveryTimeMinutes: spec.recoveryTimeMinutes ?? null,
      clientDeliverable: spec.clientDeliverable ?? null,
      source: "Vendor rate card (demo data)",
      sourceDate,
    };
    const component = await prisma.component.upsert({
      where: { vendorId_name: { vendorId: vendors[vendor], name: spec.name } },
      update: data,
      create: { ...data, vendorId: vendors[vendor], currency: "EUR" },
    });
    await prisma.componentPractitioner.createMany({
      data: people.map((name) => ({ componentId: component.id, practitionerId: practitioners[name] })),
      skipDuplicates: true,
    });
  }

  return { vendorCount: VENDORS.length, componentCount: COMPONENTS.length };
}
