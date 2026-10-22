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
import { seedClientsAndTrips } from "./seed-trips";
import { seedFeed } from "./seed-feed";

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

/**
 * `--content-only` (npm run db:seed:content) adds the fictional demo content
 * to a shared database (staging, the demo deployment) WITHOUT creating any
 * login: the demo password is public in this repo. Demo trips are assigned to
 * the first existing active admin.
 */
const CONTENT_ONLY = process.argv.includes("--content-only");

async function main() {
  console.log(`Seeding Aalmaram Health ${CONTENT_ONLY ? "demo content (no logins)" : "development data"}…`);

  // ---------------------------------------------------------------- user
  let passwordHash: string | null = null;
  let admin: { id: string; name: string; email: string };
  if (CONTENT_ONLY) {
    const existing = await prisma.user.findFirst({
      where: { status: "ACTIVE", roles: { has: "ADMIN" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true },
    });
    if (!existing) throw new Error("No active admin exists to own the demo trips. Create one first.");
    admin = existing;
  } else {
    passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    admin = await prisma.user.upsert({
      where: { email: DEMO_EMAIL },
      update: { passwordHash, name: "Priya Menon (demo admin)" },
      create: {
        email: DEMO_EMAIL,
        name: "Priya Menon (demo admin)",
        passwordHash,
        roles: ["ADMIN", "RELATIONSHIP_MANAGER"],
      },
    });
  }
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

  await seedFeed(prisma);

  // --------------------------------------------------- clients and trips
  await seedClientsAndTrips(prisma, { adminId: admin.id, adminName: admin.name, passwordHash, daysFromToday });

  console.log("\nDone.");
  if (!CONTENT_ONLY) console.log(`Sign in at /login with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
