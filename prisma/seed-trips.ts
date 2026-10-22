/**
 * "The client's journey" seed data: a relationship manager, two fictional
 * clients, their trips, requirements, a discovery conversation and a health
 * core. Everything is FICTIONAL and suffixed "(demo)". The transcript holds no
 * real health information and makes no clinical claims.
 */
import type { AddedBy, PrismaClient } from "@prisma/client";
import { blockPrice } from "../src/domain/trips/blocks";

type Ctx = {
  adminId: string;
  adminName: string;
  /** Null in content-only mode: no demo RM login is created; the admin is the RM. */
  passwordHash: string | null;
  daysFromToday: (offset: number) => Date;
};

const DEMO_TRANSCRIPT = `Relationship manager: Thanks for making time, Elena. What would make this trip worthwhile for you?
Elena (demo): I'm turning fifty next year and I'd like a proper check-up while I'm in Kerala — blood tests, maybe a scan, and a doctor who'll go through the results with me in English.
Relationship manager: Understood. We'd arrange those with clinics we know. How do you like to travel?
Elena (demo): Slowly. I don't want early starts every day. Afternoons free would be lovely.
Relationship manager: And beyond the health side?
Elena (demo): I've always wanted to see Kathakali, and the backwaters. A massage or yoga would be nice. I'm vegetarian.
Relationship manager: Any budget in mind?
Elena (demo): Around three thousand euros, flexible.`;

export async function seedClientsAndTrips(prisma: PrismaClient, ctx: Ctx) {
  const rm = ctx.passwordHash
    ? await prisma.user.upsert({
        where: { email: "rm@aalmaram.test" },
        update: {},
        create: {
          email: "rm@aalmaram.test",
          name: "Arjun Nair (demo RM)",
          passwordHash: ctx.passwordHash,
          roles: ["RELATIONSHIP_MANAGER"],
        },
      })
    : { id: ctx.adminId };

  const modules = Object.fromEntries(
    (await prisma.module.findMany({ select: { id: true, name: true } })).map((m) => [m.name, m.id]),
  );

  const elena = await prisma.client.upsert({
    where: { email: "elena.fischer@example.com" },
    update: { relationshipManagerId: ctx.adminId },
    create: {
      name: "Elena Fischer (demo client)",
      email: "elena.fischer@example.com",
      phone: "+49 30 000 0000",
      dateOfBirth: new Date("1977-05-14T00:00:00.000Z"),
      city: "Berlin",
      country: "Germany",
      status: "PLANNING",
      relationshipManagerId: ctx.adminId,
      generalPreferences: "Vegetarian. Prefers a slow pace with rest afternoons. Comfortable in English.",
    },
  });

  const marc = await prisma.client.upsert({
    where: { email: "marc.dubois@example.com" },
    update: { relationshipManagerId: rm.id },
    create: {
      name: "Marc Dubois (demo client)",
      email: "marc.dubois@example.com",
      phone: "+33 1 00 00 00 00",
      country: "France",
      status: "INTAKE",
      relationshipManagerId: rm.id,
      generalPreferences: "Travelling with a partner. Prefers coastal locations.",
    },
  });

  // ---------------------------------------------------------------- Elena
  const elenaStart = ctx.daysFromToday(45);
  if (await prisma.trip.findFirst({ where: { clientId: elena.id }, select: { id: true } })) {
    console.log("  trips: already seeded, skipping");
    return;
  }

  const trip = await prisma.trip.create({
    data: {
      clientId: elena.id,
      name: "Ten days in Kerala: a health baseline, Ayurveda and the backwaters",
      startDate: elenaStart,
      endDate: ctx.daysFromToday(54),
      travellers: 1,
      itinerary: {
        create: {
          adminNotes: "Demo. Health core front-loaded so results arrive before departure.",
          clientNotes:
            "Elena — your health appointments are in place for the first three mornings. Everything else is yours to shape: press + on any day to add something.",
        },
      },
      requirements: {
        create: {
          summary:
            "A preventive check-up before turning fifty (bloodwork, imaging, a physician to go through results in English), wrapped in a slow trip with Kathakali, the backwaters and some wellness.",
          budgetAmount: "3000.00",
          budgetCurrency: "EUR",
          pace: "RELAXED",
          mustHaves: ["Kathakali", "Backwaters", "English-speaking doctor"],
          avoid: ["Early starts every day"],
          moduleMix: {
            create: [
              { moduleId: modules["Health & Medical"], percent: 40 },
              { moduleId: modules["Wellness & Spa"], percent: 30 },
              { moduleId: modules["Heritage & Culture"], percent: 30 },
            ],
          },
        },
      },
      conversations: {
        create: {
          clientId: elena.id,
          channel: "CALL",
          occurredAt: ctx.daysFromToday(-7),
          transcript: DEMO_TRANSCRIPT,
          summary: "Health baseline is the anchor; keep mornings gentle after day 3. Culture: Kathakali + backwaters.",
          createdById: ctx.adminId,
        },
      },
    },
    include: { itinerary: true },
  });

  const place = async (component: string, dayOffset: number, time: string, addedBy: AddedBy, branch?: string) => {
    const c = await prisma.component.findFirstOrThrow({
      where: { name: component },
      select: { id: true, price: true, priceUnit: true, currency: true, vendorId: true },
    });
    const b = branch
      ? await prisma.branch.findFirstOrThrow({ where: { vendorId: c.vendorId, name: branch }, select: { id: true } })
      : await prisma.branch.findFirst({ where: { vendorId: c.vendorId }, select: { id: true } });
    const [h, m] = time.split(":").map(Number);
    const startsAt = new Date(elenaStart.getTime() + dayOffset * 86_400_000 + (h * 60 + m) * 60_000);
    await prisma.itineraryItem.create({
      data: {
        itineraryId: trip.itinerary!.id,
        componentId: c.id,
        branchId: b?.id ?? null,
        startsAt,
        addedBy,
        price: blockPrice(c.price, c.priceUnit, trip.travellers),
        currency: c.currency,
      },
    });
  };

  // Health core (TEAM) — the client sees these fixed.
  await place("Comprehensive Blood Panel", 0, "08:00", "TEAM", "Fort Kochi");
  await place("Full-Body MRI Screening", 1, "09:30", "TEAM", "Edappally");
  await place("Internal Medicine Consultation", 2, "10:00", "TEAM");
  // One thing the client already chose.
  await place("Fort Kochi Heritage Walking Tour", 0, "10:30", "CLIENT");

  await prisma.activityLog.create({
    data: {
      action: "trip.created",
      entityType: "Trip",
      entityId: trip.id,
      actorUserId: ctx.adminId,
      actorLabel: ctx.adminName,
      metadata: { seeded: true },
    },
  });

  // ----------------------------------------------------------------- Marc
  await prisma.trip.create({
    data: {
      clientId: marc.id,
      name: "A week on the Malabar coast",
      startDate: ctx.daysFromToday(75),
      endDate: ctx.daysFromToday(81),
      travellers: 2,
      itinerary: { create: {} },
      requirements: {
        create: {
          summary: "Cardiac screening for one traveller, then backwaters and food for both.",
          pace: "BALANCED",
          mustHaves: ["Backwaters", "Seafood"],
        },
      },
    },
  });

  console.log(`  clients: 2 · trips: 2${ctx.passwordHash ? " · staff: 2" : ""}`);
}
