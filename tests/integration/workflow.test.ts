import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createClientRecord,
  createInventory,
  createTrip,
  prisma,
  resetDatabase,
  utcDay,
} from "./helpers";
import { loadBuilderTrip, loadLibrary } from "@/domain/trips/queries";
import { addBlock, moveBlock, repriceItinerary } from "@/lib/services/itinerary-blocks";
import { generateReportContent } from "@/domain/reports/generate";

const STAFF = { kind: "staff" } as const;

describe("trip workflow (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("enforces a unique client email", async () => {
    await createClientRecord({ email: "dup@example.com" });
    await expect(createClientRecord({ email: "dup@example.com" })).rejects.toMatchObject({ code: "P2002" });
  });

  it("derives a component's module through its catalogue, without a duplicate FK", async () => {
    const { componentA } = await createInventory();
    const loaded = await prisma.component.findUniqueOrThrow({
      where: { id: componentA.id },
      include: { catalogue: { include: { module: true } } },
    });
    expect(loaded.catalogue.module.name).toBe("Health & Medical");
    expect(loaded).not.toHaveProperty("moduleId");
  });

  it("refuses to delete inventory that is still in use", async () => {
    // onDelete: Restrict surfaces as SQLSTATE 23001; what matters is the row survives.
    const { module, vendor } = await createInventory();
    await expect(prisma.module.delete({ where: { id: module.id } })).rejects.toThrow(/RESTRICT|foreign key/i);
    await expect(prisma.vendor.delete({ where: { id: vendor.id } })).rejects.toThrow(/RESTRICT|foreign key/i);
    expect(await prisma.vendor.count({ where: { id: vendor.id } })).toBe(1);
  });

  it("gives every trip exactly one itinerary", async () => {
    const client = await createClientRecord();
    const trip = await createTrip(client.id);
    expect(trip.itinerary).not.toBeNull();
    await expect(prisma.itinerary.create({ data: { tripId: trip.id } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("prices blocks by unit and travellers, and reprices when travellers change", async () => {
    const { componentA, catalogue, vendor } = await createInventory();
    const dinner = await prisma.component.create({
      data: {
        vendorId: vendor.id,
        catalogueId: catalogue.id,
        name: "Dinner for two (demo)",
        price: new Prisma.Decimal("35.00"),
        priceUnit: "FOR_TWO",
        durationMinutes: 90,
        clientFacingDescription: "Dinner.",
      },
    });
    const client = await createClientRecord();
    const trip = await createTrip(client.id, { travellers: 3 });

    const blood = await addBlock({
      tripId: trip.id, scope: STAFF, componentId: componentA.id, branchId: null,
      day: "2026-03-01", time: "08:00", addedBy: "TEAM",
    });
    const meal = await addBlock({
      tripId: trip.id, scope: STAFF, componentId: dinner.id, branchId: null,
      day: "2026-03-01", time: "19:30", addedBy: "TEAM",
    });
    const price = async (id: string) => (await prisma.itineraryItem.findUniqueOrThrow({ where: { id } })).price.toString();
    expect(await price(blood.id)).toBe("555"); // 185 × 3
    expect(await price(meal.id)).toBe("70"); // 35 × ⌈3/2⌉

    await prisma.trip.update({ where: { id: trip.id }, data: { travellers: 1 } });
    await prisma.$transaction((tx) => repriceItinerary(trip.id, tx));
    expect(await price(blood.id)).toBe("185");
    expect(await price(meal.id)).toBe("35");

    const view = await loadBuilderTrip(trip.id, STAFF);
    expect(view?.total).toBe("220");
  });

  it("refuses a block outside the trip, and a branch of another vendor", async () => {
    const { componentA, componentB } = await createInventory();
    const client = await createClientRecord();
    const trip = await createTrip(client.id);
    const otherVendor = await prisma.vendor.create({ data: { name: "Other (demo)", phone: "+91 1" } });
    const foreignBranch = await prisma.branch.create({ data: { vendorId: otherVendor.id, name: "Elsewhere", city: "Kochi" } });

    await expect(
      addBlock({ tripId: trip.id, scope: STAFF, componentId: componentA.id, branchId: null, day: "2026-03-11", time: "09:00", addedBy: "TEAM" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      addBlock({ tripId: trip.id, scope: STAFF, componentId: componentB.id, branchId: foreignBranch.id, day: "2026-03-02", time: "09:00", addedBy: "TEAM" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("asks for a branch when the provider has several, and defaults when it has one", async () => {
    const { componentA, vendor } = await createInventory();
    const client = await createClientRecord();
    const trip = await createTrip(client.id);
    const kochi = await prisma.branch.create({ data: { vendorId: vendor.id, name: "Kochi", city: "Kochi" } });

    const single = await addBlock({
      tripId: trip.id, scope: STAFF, componentId: componentA.id, branchId: null,
      day: "2026-03-02", time: "08:00", addedBy: "TEAM",
    });
    expect((await prisma.itineraryItem.findUniqueOrThrow({ where: { id: single.id } })).branchId).toBe(kochi.id);

    const thrissur = await prisma.branch.create({ data: { vendorId: vendor.id, name: "Thrissur", city: "Thrissur" } });
    await expect(
      addBlock({ tripId: trip.id, scope: STAFF, componentId: componentA.id, branchId: null, day: "2026-03-03", time: "08:00", addedBy: "TEAM" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    await moveBlock({ blockId: single.id, scope: STAFF, day: "2026-03-02", time: "08:00", branchId: thrissur.id });
    expect((await prisma.itineraryItem.findUniqueOrThrow({ where: { id: single.id } })).branchId).toBe(thrissur.id);
  });

  it("refuses deactivated components", async () => {
    const { componentA } = await createInventory();
    await prisma.component.update({ where: { id: componentA.id }, data: { status: "INACTIVE" } });
    const client = await createClientRecord();
    const trip = await createTrip(client.id);
    await expect(
      addBlock({ tripId: trip.id, scope: STAFF, componentId: componentA.id, branchId: null, day: "2026-03-02", time: "08:00", addedBy: "TEAM" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const library = await loadLibrary();
    expect(JSON.stringify(library)).not.toContain(componentA.id);
  });

  it("shows every trip day, flags overlaps and measures the module mix", async () => {
    const { componentA, componentB } = await createInventory();
    const client = await createClientRecord();
    const trip = await createTrip(client.id, { startDate: utcDay("2026-03-01"), endDate: utcDay("2026-03-03") });
    await addBlock({ tripId: trip.id, scope: STAFF, componentId: componentA.id, branchId: null, day: "2026-03-01", time: "09:00", addedBy: "TEAM" });
    await addBlock({ tripId: trip.id, scope: STAFF, componentId: componentB.id, branchId: null, day: "2026-03-01", time: "09:30", addedBy: "TEAM" });

    const view = (await loadBuilderTrip(trip.id, STAFF))!;
    expect(view.days.map((d) => d.key)).toEqual(["2026-03-01", "2026-03-02", "2026-03-03"]);
    expect(view.days[0].blocks.every((b) => b.overlaps)).toBe(true);
    expect(view.mix).toEqual([{ moduleName: "Health & Medical", target: null, actual: 100 }]);
  });

  it("generates a report from stored itinerary data only", async () => {
    const { componentA } = await createInventory();
    const client = await createClientRecord();
    const trip = await createTrip(client.id);
    await addBlock({ tripId: trip.id, scope: STAFF, componentId: componentA.id, branchId: null, day: "2026-03-01", time: "09:00", addedBy: "TEAM" });
    const view = (await loadBuilderTrip(trip.id, STAFF))!;

    const content = generateReportContent({
      clientName: client.name,
      itineraryTitle: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      items: view.days.flatMap((day) =>
        day.blocks.map((b) => ({
          dayNumber: day.dayNumber,
          scheduledDate: utcDay(day.key),
          title: b.title,
          moduleName: b.moduleName,
          catalogueName: b.catalogueName,
          vendorName: b.provider.name,
          vendorLocation: b.branchLabel,
          clientFacingDescription: b.description,
          whatsIncluded: b.whatsIncluded,
          clientDeliverable: b.deliverable,
          clientFacingNotes: b.note,
        })),
      ),
    });
    expect(content).toContain("Blood Panel");
    expect(content).toContain("Test Diagnostics (demo)");
    expect(content).toContain("A written report.");
  });

  it("cascades a client's deletion to trips, itineraries, blocks, requirements and conversations", async () => {
    const { componentA, module } = await createInventory();
    const client = await createClientRecord();
    const trip = await createTrip(client.id);
    await addBlock({ tripId: trip.id, scope: STAFF, componentId: componentA.id, branchId: null, day: "2026-03-01", time: "09:00", addedBy: "TEAM" });
    await prisma.tripRequirements.create({
      data: { tripId: trip.id, summary: "x", moduleMix: { create: { moduleId: module.id, percent: 100 } } },
    });
    await prisma.conversation.create({
      data: { clientId: client.id, tripId: trip.id, channel: "CALL", occurredAt: new Date(), transcript: "x" },
    });

    await prisma.client.delete({ where: { id: client.id } });
    expect(await prisma.trip.count()).toBe(0);
    expect(await prisma.itinerary.count()).toBe(0);
    expect(await prisma.itineraryItem.count()).toBe(0);
    expect(await prisma.tripRequirements.count()).toBe(0);
    expect(await prisma.tripModuleShare.count()).toBe(0);
    expect(await prisma.conversation.count()).toBe(0);
    expect(await prisma.component.count()).toBe(2);
  });
});
