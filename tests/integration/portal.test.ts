import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { createClientRecord, createInventory, createTrip, prisma, resetDatabase } from "./helpers";
import { addBlock, confirmItinerary } from "@/lib/services/itinerary-blocks";
import { loadClientFeed } from "@/domain/feed/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";

describe("client portal (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function plannedTrip(email: string) {
    const client = await createClientRecord({ email });
    const inventory = (await prisma.component.findFirst({ where: { name: "Blood Panel" } }))
      ? { componentA: await prisma.component.findFirstOrThrow({ where: { name: "Blood Panel" } }) }
      : await createInventory();
    const trip = await createTrip(client.id, { travellers: 2 });
    await addBlock({
      tripId: trip.id,
      scope: { kind: "client", clientId: client.id },
      componentId: inventory.componentA.id,
      branchId: null,
      day: "2026-03-02",
      time: "08:00",
      addedBy: "CLIENT",
    });
    return { client, trip, componentId: inventory.componentA.id };
  }

  it("confirms and locks the client's own itinerary, freezing current prices", async () => {
    const { client, trip, componentId } = await plannedTrip("confirm@example.com");
    // A price change before confirming is picked up; after confirming it is not.
    await prisma.component.update({ where: { id: componentId }, data: { price: new Prisma.Decimal("200.00") } });

    await confirmItinerary(trip.id, { kind: "client", clientId: client.id });

    const after = await prisma.trip.findUniqueOrThrow({
      where: { id: trip.id },
      include: { itinerary: { include: { items: true } } },
    });
    expect(after.status).toBe("AWAITING_PAYMENT");
    expect(after.itinerary?.confirmedAt).not.toBeNull();
    expect(after.itinerary?.items[0].price.toString()).toBe("400");

    await prisma.component.update({ where: { id: componentId }, data: { price: new Prisma.Decimal("999.00") } });
    const frozen = await prisma.itineraryItem.findFirstOrThrow({ where: { itineraryId: after.itinerary!.id } });
    expect(frozen.price.toString()).toBe("400");

    await expect(confirmItinerary(trip.id, { kind: "client", clientId: client.id })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("refuses to confirm another client's trip or an empty itinerary", async () => {
    const a = await plannedTrip("a@example.com");
    const b = await plannedTrip("b@example.com");
    await expect(confirmItinerary(b.trip.id, { kind: "client", clientId: a.client.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    const empty = await createTrip(a.client.id);
    await expect(confirmItinerary(empty.id, { kind: "client", clientId: a.client.id })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("shows only visible feed posts, newest first, without vendor contact details", async () => {
    const { vendor } = await createInventory();
    await prisma.vendor.update({ where: { id: vendor.id }, data: { email: "secret@vendor.demo", notes: "SECRET-NOTE" } });
    await prisma.feedPost.createMany({
      data: [
        { source: "NEWS", caption: "Older", link: "https://example.com/1", publishedAt: new Date("2026-01-01") },
        { source: "VENDOR_INSTAGRAM", vendorId: vendor.id, caption: "Newer", link: "https://example.com/2", publishedAt: new Date("2026-02-01") },
        { source: "NEWS", caption: "Hidden", link: "https://example.com/3", publishedAt: new Date("2026-03-01"), hiddenAt: new Date() },
      ],
    });
    const feed = await loadClientFeed();
    expect(feed.map((p) => p.caption)).toEqual(["Newer", "Older"]);
    const serialised = JSON.stringify(feed);
    expect(serialised).not.toContain("secret@vendor.demo");
    expect(serialised).not.toContain("SECRET-NOTE");
  });

  it("picks the requested trip only if it is the client's, else the next unfinished one", async () => {
    const client = await createClientRecord();
    const past = await createTrip(client.id, { startDate: new Date("2025-01-01"), endDate: new Date("2025-01-05") });
    const next = await createTrip(client.id, { startDate: new Date("2026-06-01"), endDate: new Date("2026-06-10") });
    const other = await createTrip((await createClientRecord()).id);
    const trips = await loadPortalTrips(client.id);
    const today = new Date("2026-03-01");

    expect(pickTrip(trips, undefined, today)?.id).toBe(next.id);
    expect(pickTrip(trips, past.id, today)?.id).toBe(past.id);
    expect(pickTrip(trips, other.id, today)?.id).toBe(next.id);
    expect(pickTrip([], undefined, today)).toBeNull();
  });
});
