import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Integration test harness.
 *
 * These tests run against the real PostgreSQL database used for development
 * (`npm run db:start`). Each test file cleans up the rows it creates via
 * `resetDatabase`, which truncates everything - never point DATABASE_URL at an
 * environment you care about when running the test suite.
 */
export const prisma = new PrismaClient();

export async function resetDatabase() {
  // Order matters for foreign keys; TRUNCATE ... CASCADE handles it in one go.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ActivityLog",
      "ChangeRequest",
      "Report",
      "ItineraryItem",
      "Itinerary",
      "Client",
      "Component",
      "Catalogue",
      "Module",
      "Vendor",
      "User"
    RESTART IDENTITY CASCADE
  `);
}

export function utcDay(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

export async function createAdmin(email = "test-admin@aalmaram.test") {
  return prisma.user.create({
    data: {
      name: "Test Admin",
      email,
      passwordHash: await bcrypt.hash("TestPassword!1", 10),
      role: "ADMIN",
    },
  });
}

export async function createInventory() {
  const module = await prisma.module.create({
    data: { name: "Health & Medical", sortOrder: 0 },
  });
  const catalogue = await prisma.catalogue.create({
    data: { moduleId: module.id, name: "Diagnostics", sortOrder: 0 },
  });
  const vendor = await prisma.vendor.create({
    data: { name: "Test Diagnostics (demo)", hqCity: "Kochi", phone: "+91 000" },
  });

  const component = async (name: string, price: string) =>
    prisma.component.create({
      data: {
        vendorId: vendor.id,
        catalogueId: catalogue.id,
        name,
        tags: ["test"],
        price: new Prisma.Decimal(price),
        currency: "EUR",
        durationMinutes: 60,
        clientFacingDescription: `Description for ${name}.`,
        whatsIncluded: "Item one\nItem two",
        clientDeliverable: "A written report.",
      },
    });

  return {
    module,
    catalogue,
    vendor,
    componentA: await component("Blood Panel", "185.00"),
    componentB: await component("MRI Screening", "620.00"),
  };
}

export async function createClientRecord(overrides: {
  email?: string;
  name?: string;
  tripStartDate?: Date;
  tripEndDate?: Date;
} = {}) {
  return prisma.client.create({
    data: {
      name: overrides.name ?? "Elena Fischer (demo)",
      email: overrides.email ?? `client-${Date.now()}-${Math.random()}@example.com`,
      country: "Germany",
      status: "PLANNING",
      tripStartDate: overrides.tripStartDate ?? utcDay("2026-03-01"),
      tripEndDate: overrides.tripEndDate ?? utcDay("2026-03-10"),
      tripDuration: 10,
    },
  });
}
