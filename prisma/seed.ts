/**
 * Development seed.
 *
 * IMPORTANT: every vendor, component and client below is FICTIONAL and exists
 * only to make the product testable. Names are suffixed "(demo)" so nobody can
 * mistake seed rows for real businesses, and the descriptions deliberately
 * avoid clinical claims.
 *
 * Run with:  npm run db:seed
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@aalmaram.test";
const DEMO_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Aalmaram!Demo1";

const price = (value: string) => new Prisma.Decimal(value);

/** Calendar day helper - seed dates are relative so the demo never goes stale. */
function daysFromToday(offset: number): Date {
  const now = new Date();
  const base = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return new Date(base + offset * 86_400_000);
}

async function main() {
  console.log("Seeding Aalmaram Health development data…");

  // ---------------------------------------------------------------- user
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, name: "Priya Menon (demo admin)" },
    create: {
      email: DEMO_EMAIL,
      name: "Priya Menon (demo admin)",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`  admin: ${admin.email}`);

  // -------------------------------------------------------------- modules
  const moduleSpecs = [
    {
      name: "Health & Medical",
      sortOrder: 0,
      description:
        "Diagnostics, consultations and clinical procedures delivered by accredited Kerala providers.",
    },
    {
      name: "Wellness & Spa",
      sortOrder: 1,
      description:
        "Ayurveda, yoga, therapeutic bodywork and restorative programmes.",
    },
    {
      name: "Heritage & Culture",
      sortOrder: 2,
      description:
        "Kerala's performing arts, cuisine, backwaters and craft traditions.",
    },
  ];

  const modules: Record<string, string> = {};
  for (const spec of moduleSpecs) {
    const record = await prisma.module.upsert({
      where: { name: spec.name },
      update: { description: spec.description, sortOrder: spec.sortOrder },
      create: spec,
    });
    modules[spec.name] = record.id;
  }

  // ----------------------------------------------------------- catalogues
  const catalogueSpecs: {
    module: string;
    name: string;
    description: string;
    sortOrder: number;
  }[] = [
    { module: "Health & Medical", name: "Diagnostics", sortOrder: 0, description: "Laboratory panels and imaging." },
    { module: "Health & Medical", name: "Consultations", sortOrder: 1, description: "Specialist and general consultations." },
    { module: "Health & Medical", name: "Dermatology", sortOrder: 2, description: "Skin assessment and treatment." },
    { module: "Wellness & Spa", name: "Ayurveda Programmes", sortOrder: 0, description: "Multi-day traditional Ayurveda." },
    { module: "Wellness & Spa", name: "Therapeutic Bodywork", sortOrder: 1, description: "Single-session treatments." },
    { module: "Wellness & Spa", name: "Yoga & Movement", sortOrder: 2, description: "Guided practice and instruction." },
    { module: "Heritage & Culture", name: "Performing Arts", sortOrder: 0, description: "Kathakali, Mohiniyattam and music." },
    { module: "Heritage & Culture", name: "Backwaters & Nature", sortOrder: 1, description: "Waterways, spice hills and coast." },
    { module: "Heritage & Culture", name: "Cuisine & Craft", sortOrder: 2, description: "Cooking, weaving and workshops." },
  ];

  const catalogues: Record<string, string> = {};
  for (const spec of catalogueSpecs) {
    const record = await prisma.catalogue.upsert({
      where: {
        moduleId_name: { moduleId: modules[spec.module], name: spec.name },
      },
      update: { description: spec.description, sortOrder: spec.sortOrder },
      create: {
        moduleId: modules[spec.module],
        name: spec.name,
        description: spec.description,
        sortOrder: spec.sortOrder,
      },
    });
    catalogues[spec.name] = record.id;
  }

  // -------------------------------------------------------------- vendors
  const vendorSpecs = [
    {
      name: "Backwater Diagnostics Centre (demo)",
      contactName: "Anil Varghese",
      email: "contact@backwater-diagnostics.demo",
      phone: "+91 484 000 0101",
      location: "Kochi, Ernakulam",
      accreditation: "Fictional accreditation record for demonstration only",
      notes: "Demo vendor. Not a real business.",
    },
    {
      name: "Nila Speciality Clinic (demo)",
      contactName: "Dr Reshma Nair",
      email: "hello@nila-clinic.demo",
      phone: "+91 484 000 0202",
      location: "Thrissur",
      accreditation: "Fictional accreditation record for demonstration only",
      notes: "Demo vendor. Not a real business.",
    },
    {
      name: "Kaumudi Ayurveda Retreat (demo)",
      contactName: "Sreelatha Pillai",
      email: "stay@kaumudi-ayurveda.demo",
      phone: "+91 471 000 0303",
      location: "Varkala, Thiruvananthapuram",
      accreditation: "Fictional accreditation record for demonstration only",
      notes: "Demo vendor. Not a real business.",
    },
    {
      name: "Periyar Wellness House (demo)",
      contactName: "Joseph Mathew",
      email: "care@periyar-wellness.demo",
      phone: "+91 486 000 0404",
      location: "Thekkady, Idukki",
      accreditation: "Fictional accreditation record for demonstration only",
      notes: "Demo vendor. Not a real business.",
    },
    {
      name: "Kalari Heritage Collective (demo)",
      contactName: "Meera Krishnan",
      email: "visit@kalari-heritage.demo",
      phone: "+91 484 000 0505",
      location: "Fort Kochi, Ernakulam",
      accreditation: "Fictional accreditation record for demonstration only",
      notes: "Demo vendor. Not a real business.",
    },
    {
      name: "Vembanad Boat Company (demo)",
      contactName: "Thomas Kurian",
      email: "cruise@vembanad-boats.demo",
      phone: "+91 477 000 0606",
      location: "Alappuzha",
      accreditation: "Fictional accreditation record for demonstration only",
      notes: "Demo vendor. Not a real business.",
    },
  ];

  const vendors: Record<string, string> = {};
  for (const spec of vendorSpecs) {
    const record = await prisma.vendor.upsert({
      where: { name: spec.name },
      update: spec,
      create: spec,
    });
    vendors[spec.name] = record.id;
  }

  // ----------------------------------------------------------- components
  const componentSpecs: {
    vendor: string;
    catalogue: string;
    name: string;
    tags: string[];
    price: string;
    unit: string;
    clientFacingDescription: string;
    whatsIncluded: string;
    clientDeliverable: string;
    source: string;
  }[] = [
    {
      vendor: "Backwater Diagnostics Centre (demo)",
      catalogue: "Diagnostics",
      name: "Comprehensive Blood Panel",
      tags: ["bloodwork", "fasting", "morning", "diagnostics"],
      price: "185.00",
      unit: "per person",
      clientFacingDescription:
        "A broad panel of blood tests taken in a single morning appointment. Samples are drawn by a phlebotomist at the centre and processed in the on-site laboratory.",
      whatsIncluded:
        "Phlebotomy appointment (approximately 20 minutes)\nLaboratory processing\nWritten results in English\nA follow-up call to walk you through the report",
      clientDeliverable:
        "A PDF results report in English, usually within 48 hours.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Backwater Diagnostics Centre (demo)",
      catalogue: "Diagnostics",
      name: "Full-Body MRI Screening",
      tags: ["imaging", "mri", "diagnostics", "half-day"],
      price: "620.00",
      unit: "per person",
      clientFacingDescription:
        "A non-contrast whole-body MRI screening carried out in one visit of roughly two hours, reported by the centre's radiology team.",
      whatsIncluded:
        "Pre-scan safety questionnaire and briefing\nWhole-body MRI acquisition\nRadiologist report\nDigital copy of the images",
      clientDeliverable:
        "A radiology report and a digital copy of your images on secure download.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Backwater Diagnostics Centre (demo)",
      catalogue: "Diagnostics",
      name: "Cardiac Health Assessment",
      tags: ["cardiac", "ecg", "diagnostics"],
      price: "295.00",
      unit: "per person",
      clientFacingDescription:
        "A resting ECG, echocardiogram and treadmill test carried out in one session, with a written summary from the reviewing cardiologist.",
      whatsIncluded:
        "Resting ECG\nEchocardiogram\nTreadmill exercise test\nWritten cardiologist summary",
      clientDeliverable: "A written cardiology summary report.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Nila Speciality Clinic (demo)",
      catalogue: "Consultations",
      name: "Internal Medicine Consultation",
      tags: ["consultation", "english-speaking", "60-minutes"],
      price: "120.00",
      unit: "per person",
      clientFacingDescription:
        "A one-hour consultation with an internal medicine physician who speaks English, to review any reports you bring and answer your questions.",
      whatsIncluded:
        "Sixty-minute consultation\nReview of documents you bring with you\nWritten summary of what was discussed",
      clientDeliverable: "A written consultation summary.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Nila Speciality Clinic (demo)",
      catalogue: "Dermatology",
      name: "Dermatology Skin Assessment",
      tags: ["dermatology", "skin", "consultation"],
      price: "140.00",
      unit: "per person",
      clientFacingDescription:
        "A dermatologist-led skin assessment including dermoscopic examination, with a written record of findings and any recommended follow-up.",
      whatsIncluded:
        "Dermatologist consultation\nDermoscopic examination\nWritten findings",
      clientDeliverable: "A written dermatology assessment.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Kaumudi Ayurveda Retreat (demo)",
      catalogue: "Ayurveda Programmes",
      name: "Seven-Day Panchakarma Programme",
      tags: ["ayurveda", "panchakarma", "residential", "multi-day"],
      price: "1450.00",
      unit: "per person, seven nights",
      clientFacingDescription:
        "A seven-night residential Ayurveda programme with a daily therapy schedule set by the retreat's physicians after an initial assessment, plus full board with a diet prepared for the programme.",
      whatsIncluded:
        "Seven nights' accommodation\nInitial and closing consultations with the retreat physicians\nDaily therapies as scheduled by the physicians\nFull board on the programme diet\nDaily guided yoga",
      clientDeliverable:
        "A written programme summary and dietary and lifestyle notes to take home.",
      source: "Vendor programme sheet (demo data)",
    },
    {
      vendor: "Kaumudi Ayurveda Retreat (demo)",
      catalogue: "Therapeutic Bodywork",
      name: "Abhyanga Full-Body Treatment",
      tags: ["ayurveda", "massage", "single-session", "afternoon"],
      price: "85.00",
      unit: "per session",
      clientFacingDescription:
        "A traditional warm-oil full-body treatment delivered by two therapists, lasting approximately 75 minutes including rest time.",
      whatsIncluded:
        "Seventy-five minute treatment with two therapists\nHerbal oils selected at the retreat\nSteam and rest period afterwards",
      clientDeliverable: "None - this is a single treatment session.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Kaumudi Ayurveda Retreat (demo)",
      catalogue: "Yoga & Movement",
      name: "Private Yoga Session",
      tags: ["yoga", "private", "morning", "beginner-friendly"],
      price: "45.00",
      unit: "per session",
      clientFacingDescription:
        "A one-to-one yoga session with a resident teacher, adapted to your experience and any movement limitations you mention beforehand.",
      whatsIncluded:
        "Sixty-minute private session\nMat and props provided\nA short practice sequence written down for you",
      clientDeliverable: "A written practice sequence to take home.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Periyar Wellness House (demo)",
      catalogue: "Therapeutic Bodywork",
      name: "Herbal Steam and Rest Afternoon",
      tags: ["wellness", "steam", "half-day", "restorative"],
      price: "70.00",
      unit: "per person",
      clientFacingDescription:
        "A quiet half-day at the wellness house in the spice hills: herbal steam, a rest period on a shaded veranda and a light herbal meal.",
      whatsIncluded:
        "Herbal steam session\nRest period with herbal tea\nLight vegetarian meal",
      clientDeliverable: "None - this is a rest afternoon.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Periyar Wellness House (demo)",
      catalogue: "Backwaters & Nature",
      name: "Spice Plantation Walk",
      tags: ["nature", "walking", "guided", "morning"],
      price: "38.00",
      unit: "per person",
      clientFacingDescription:
        "A guided two-hour walk through a working cardamom and pepper plantation in the Idukki hills, with a guide who explains cultivation and harvest.",
      whatsIncluded:
        "Two-hour guided walk\nPlantation entry\nTasting of the estate's spices",
      clientDeliverable: "None - this is a guided experience.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Kalari Heritage Collective (demo)",
      catalogue: "Performing Arts",
      name: "Kathakali Performance with Make-Up Demonstration",
      tags: ["culture", "performance", "evening", "kathakali"],
      price: "42.00",
      unit: "per person",
      clientFacingDescription:
        "An evening at a heritage theatre in Fort Kochi: watch the performers apply their make-up, hear an introduction to the story and gestures, then see the performance itself.",
      whatsIncluded:
        "Make-up demonstration from 17:00\nIntroduction to the form in English\nOne-hour performance\nReserved seating",
      clientDeliverable: "None - this is a live performance.",
      source: "Vendor programme sheet (demo data)",
    },
    {
      vendor: "Kalari Heritage Collective (demo)",
      catalogue: "Cuisine & Craft",
      name: "Kerala Home Cooking Workshop",
      tags: ["culture", "cooking", "hands-on", "afternoon"],
      price: "55.00",
      unit: "per person",
      clientFacingDescription:
        "A hands-on afternoon cooking four Kerala dishes in a family home in Fort Kochi, finishing with the meal you have cooked.",
      whatsIncluded:
        "Market walk to choose ingredients\nThree-hour hands-on cooking session\nThe meal you prepare\nPrinted recipes",
      clientDeliverable: "Printed recipes for the dishes you cooked.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Vembanad Boat Company (demo)",
      catalogue: "Backwaters & Nature",
      name: "Private Backwater Day Cruise",
      tags: ["backwaters", "boat", "full-day", "alappuzha"],
      price: "260.00",
      unit: "per boat, up to four guests",
      clientFacingDescription:
        "A full day on the Vembanad backwaters aboard a private converted rice barge, with a crew of three and lunch cooked on board.",
      whatsIncluded:
        "Private boat with crew of three from 09:00 to 17:00\nLunch and afternoon tea cooked on board\nBottled water and soft drinks",
      clientDeliverable: "None - this is a day cruise.",
      source: "Vendor rate card (demo data)",
    },
    {
      vendor: "Vembanad Boat Company (demo)",
      catalogue: "Backwaters & Nature",
      name: "Sunrise Canoe Village Tour",
      tags: ["backwaters", "canoe", "early-morning", "small-group"],
      price: "48.00",
      unit: "per person",
      clientFacingDescription:
        "A quiet two-hour paddle through the narrow canals at first light, passing village life as it wakes, in a small country canoe with a local guide.",
      whatsIncluded:
        "Two-hour guided canoe tour\nLocal guide\nTea at a village home",
      clientDeliverable: "None - this is a guided experience.",
      source: "Vendor rate card (demo data)",
    },
  ];

  for (const spec of componentSpecs) {
    await prisma.component.upsert({
      where: {
        vendorId_name: { vendorId: vendors[spec.vendor], name: spec.name },
      },
      update: {
        catalogueId: catalogues[spec.catalogue],
        tags: spec.tags,
        price: price(spec.price),
        unit: spec.unit,
        clientFacingDescription: spec.clientFacingDescription,
        whatsIncluded: spec.whatsIncluded,
        clientDeliverable: spec.clientDeliverable,
        source: spec.source,
        sourceDate: daysFromToday(-30),
      },
      create: {
        vendorId: vendors[spec.vendor],
        catalogueId: catalogues[spec.catalogue],
        name: spec.name,
        tags: spec.tags,
        price: price(spec.price),
        currency: "EUR",
        unit: spec.unit,
        costStatus: "ESTIMATED",
        clientFacingDescription: spec.clientFacingDescription,
        whatsIncluded: spec.whatsIncluded,
        clientDeliverable: spec.clientDeliverable,
        source: spec.source,
        sourceDate: daysFromToday(-30),
        status: "ACTIVE",
      },
    });
  }
  console.log(`  components: ${componentSpecs.length}`);

  // -------------------------------------------------------------- clients
  const tripStart = daysFromToday(45);
  const tripEnd = daysFromToday(54);

  const demoClient = await prisma.client.upsert({
    where: { email: "elena.fischer@example.com" },
    update: {},
    create: {
      name: "Elena Fischer (demo client)",
      email: "elena.fischer@example.com",
      phone: "+49 30 000 0000",
      country: "Germany",
      status: "PLANNING",
      tripStartDate: tripStart,
      tripEndDate: tripEnd,
      tripDuration: 10,
      healthInterests:
        "Would like a thorough diagnostic baseline - bloodwork and imaging - before turning fifty.",
      wellnessInterests:
        "Interested in a short Ayurveda programme and daily yoga. Prefers gentle rather than intensive.",
      culturalInterests:
        "Keen on Kathakali, backwaters and learning to cook a few Kerala dishes.",
      generalPreferences:
        "Vegetarian. Prefers a slow pace with rest afternoons. Travelling alone. Comfortable in English.",
      intakeNotes:
        "Reached us through a colleague. First visit to India. Wants the medical elements early in the trip so results arrive before departure.",
    },
  });

  await prisma.client.upsert({
    where: { email: "marc.dubois@example.com" },
    update: {},
    create: {
      name: "Marc Dubois (demo client)",
      email: "marc.dubois@example.com",
      phone: "+33 1 00 00 00 00",
      country: "France",
      status: "INTAKE",
      healthInterests: "Cardiac screening.",
      wellnessInterests: "Open to Ayurveda but has not decided.",
      culturalInterests: "Backwaters and food.",
      generalPreferences: "Travelling with a partner. Prefers coastal locations.",
      intakeNotes: "Early enquiry. No dates fixed yet.",
    },
  });
  console.log("  clients: 2");

  // ------------------------------------------------------------ itinerary
  const existing = await prisma.itinerary.findFirst({
    where: { clientId: demoClient.id },
    select: { id: true },
  });

  if (existing) {
    console.log("  itinerary: already seeded, skipping");
  } else {
    const pick = async (name: string) => {
      const component = await prisma.component.findFirst({
        where: { name },
        select: { id: true },
      });
      if (!component) throw new Error(`Seed component not found: ${name}`);
      return component.id;
    };

    const plan: { name: string; dayOffset: number }[] = [
      { name: "Comprehensive Blood Panel", dayOffset: 0 },
      { name: "Full-Body MRI Screening", dayOffset: 1 },
      { name: "Internal Medicine Consultation", dayOffset: 2 },
      { name: "Private Yoga Session", dayOffset: 3 },
      { name: "Abhyanga Full-Body Treatment", dayOffset: 3 },
      { name: "Sunrise Canoe Village Tour", dayOffset: 5 },
      { name: "Private Backwater Day Cruise", dayOffset: 6 },
      { name: "Kerala Home Cooking Workshop", dayOffset: 7 },
      { name: "Kathakali Performance with Make-Up Demonstration", dayOffset: 8 },
    ];

    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: demoClient.id,
        title: "Ten days in Kerala: a diagnostic baseline, Ayurveda and the backwaters",
        startDate: tripStart,
        endDate: tripEnd,
        status: "DRAFT",
        adminNotes:
          "Demo itinerary. Medical elements front-loaded so results land before departure, then a slower second half.",
        clientNotes:
          "Elena - here is the shape we have in mind. The medical mornings sit at the start so your results reach you before you fly home, and the second half is deliberately unhurried. Tell me anything you would like moved.",
      },
    });

    for (const [index, entry] of plan.entries()) {
      const componentId = await pick(entry.name);
      const scheduledDate = new Date(
        tripStart.getTime() + entry.dayOffset * 86_400_000,
      );
      await prisma.itineraryItem.create({
        data: {
          itineraryId: itinerary.id,
          componentId,
          scheduledDate,
          dayNumber: entry.dayOffset + 1,
          sequence: index,
          status: "PLANNED",
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        action: "itinerary.created",
        entityType: "Itinerary",
        entityId: itinerary.id,
        actorUserId: admin.id,
        actorLabel: admin.name,
        metadata: { seeded: true, itemCount: plan.length },
      },
    });

    console.log(`  itinerary: ${itinerary.title} (${plan.length} items, DRAFT)`);
  }

  console.log("\nDone.");
  console.log(`Sign in at /login with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
