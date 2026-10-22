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
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { EXTRA_CATALOGUES, seedInventory } from "./seed-inventory";

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@aalmaram.test";
const DEMO_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Aalmaram!Demo1";


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
    ...EXTRA_CATALOGUES,
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

  // ------------------------------------------- vendors and components
  const inventory = await seedInventory(prisma, catalogues, daysFromToday(-30));
  console.log(`  vendors: ${inventory.vendorCount}, components: ${inventory.componentCount}`);

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
