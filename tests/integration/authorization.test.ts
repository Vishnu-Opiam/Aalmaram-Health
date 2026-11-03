import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createClientRecord,
  createInventory,
  createTrip,
  prisma,
  resetDatabase,
} from "./helpers";
import { loadBuilderTrip, loadLibrary } from "@/domain/trips/queries";
import { addBlock, moveBlock, removeBlock } from "@/lib/services/itinerary-blocks";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clientSessionIsCurrent } from "@/lib/auth/session";

/**
 * The security requirements that matter most in this product:
 * Client A must never reach Client B's trip, the client can never change the
 * team's health core, and the portal never sees internal fields.
 */
describe("client portal authorization (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function tripWithCore(email: string) {
    const client = await createClientRecord({ email });
    const inventory =
      (await prisma.component.findFirst({ where: { name: "Blood Panel" } }))
        ? {
            componentA: await prisma.component.findFirstOrThrow({ where: { name: "Blood Panel" } }),
            componentB: await prisma.component.findFirstOrThrow({ where: { name: "MRI Screening" } }),
          }
        : await createInventory();
    const trip = await createTrip(client.id);
    const core = await addBlock({
      tripId: trip.id,
      scope: { kind: "staff" },
      componentId: inventory.componentA.id,
      branchId: null,
      day: "2026-03-02",
      time: "08:00",
      addedBy: "TEAM",
    });
    return { client, trip, core, ...inventory };
  }

  it("returns a client's own trip", async () => {
    const { client, trip } = await tripWithCore("a@example.com");
    const view = await loadBuilderTrip(trip.id, { kind: "client", clientId: client.id });
    expect(view?.name).toBe("Test trip (demo)");
    expect(view?.blockCount).toBe(1);
  });

  it("returns null when Client A asks for Client B's trip by id", async () => {
    const a = await tripWithCore("a@example.com");
    const b = await tripWithCore("b@example.com");
    expect(await loadBuilderTrip(b.trip.id, { kind: "client", clientId: a.client.id })).toBeNull();
    expect(await loadBuilderTrip(a.trip.id, { kind: "client", clientId: b.client.id })).toBeNull();
  });

  it("refuses to let Client A add to Client B's trip", async () => {
    const a = await tripWithCore("a@example.com");
    const b = await tripWithCore("b@example.com");
    await expect(
      addBlock({
        tripId: b.trip.id,
        scope: { kind: "client", clientId: a.client.id },
        componentId: a.componentB.id,
        branchId: null,
        day: "2026-03-03",
        time: "10:00",
        addedBy: "CLIENT",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets the client move and remove their own blocks but never the health core", async () => {
    const { client, trip, core, componentB } = await tripWithCore("core@example.com");
    const scope = { kind: "client" as const, clientId: client.id };

    await expect(moveBlock({ blockId: core.id, scope, day: "2026-03-04", time: "09:00", branchId: null })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(removeBlock({ blockId: core.id, scope })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const own = await addBlock({
      tripId: trip.id,
      scope,
      componentId: componentB.id,
      branchId: null,
      day: "2026-03-03",
      time: "10:00",
      addedBy: "CLIENT",
    });
    await moveBlock({ blockId: own.id, scope, day: "2026-03-05", time: "11:00", branchId: null });
    const moved = await prisma.itineraryItem.findUniqueOrThrow({ where: { id: own.id } });
    expect(moved.startsAt.toISOString()).toBe("2026-03-05T11:00:00.000Z");
    await removeBlock({ blockId: own.id, scope });
    expect(await prisma.itineraryItem.count({ where: { id: own.id } })).toBe(0);

    const view = await loadBuilderTrip(trip.id, { kind: "client", clientId: client.id });
    const coreView = view!.days.flatMap((d) => d.blocks).find((b) => b.id === core.id);
    expect(coreView?.canEdit).toBe(false);
  });

  it("refuses every change once the itinerary is confirmed", async () => {
    const { client, trip, componentB } = await tripWithCore("locked@example.com");
    await prisma.itinerary.update({ where: { tripId: trip.id }, data: { confirmedAt: new Date() } });
    await prisma.trip.update({ where: { id: trip.id }, data: { status: "AWAITING_PAYMENT" } });
    await expect(
      addBlock({
        tripId: trip.id,
        scope: { kind: "client", clientId: client.id },
        componentId: componentB.id,
        branchId: null,
        day: "2026-03-03",
        time: "10:00",
        addedBy: "CLIENT",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const view = await loadBuilderTrip(trip.id, { kind: "client", clientId: client.id });
    expect(view?.editable).toBe(false);
  });

  it("never exposes internal notes, vendor contacts or cost metadata to the builder view", async () => {
    const { client, trip, componentA, core } = await tripWithCore("notes@example.com");

    await prisma.component.update({
      where: { id: componentA.id },
      data: { source: "SECRET-RATE-CARD", costStatus: "CONFIRMED" },
    });
    await prisma.vendor.update({
      where: { id: componentA.vendorId },
      data: {
        contactName: "SECRET-CONTACT",
        email: "secret@vendor.demo",
        phone: "+91 SECRET",
        notes: "SECRET-VENDOR-NOTE",
      },
    });
    await prisma.itinerary.update({ where: { tripId: trip.id }, data: { adminNotes: "INTERNAL-ADMIN-NOTE" } });
    await prisma.itineraryItem.update({
      where: { id: core.id },
      data: { internalNotes: "INTERNAL-ITEM-NOTE", clientFacingNotes: "Visible to the client." },
    });
    await prisma.itinerary.update({ where: { tripId: trip.id }, data: { confirmedAt: new Date() } });
    await prisma.booking.create({
      data: { itineraryItemId: core.id, status: "DECLINED", vendorReference: "SECRET-VENDOR-REF" },
    });

    const serialised = JSON.stringify(await loadBuilderTrip(trip.id, { kind: "client", clientId: client.id }));
    for (const secret of [
      "INTERNAL-ADMIN-NOTE",
      "INTERNAL-ITEM-NOTE",
      "SECRET-RATE-CARD",
      "costStatus",
      "SECRET-CONTACT",
      "secret@vendor.demo",
      "+91 SECRET",
      "SECRET-VENDOR-NOTE",
      "SECRET-VENDOR-REF",
      "DECLINED",
    ]) {
      expect(serialised).not.toContain(secret);
    }
    expect(serialised).toContain("Visible to the client.");
  });

  it("never exposes requirements or conversation transcripts to the builder view", async () => {
    const { client, trip } = await tripWithCore("conv@example.com");
    await prisma.tripRequirements.create({ data: { tripId: trip.id, summary: "PRIVATE-REQUIREMENT" } });
    await prisma.conversation.create({
      data: {
        clientId: client.id,
        tripId: trip.id,
        channel: "CALL",
        occurredAt: new Date(),
        transcript: "PRIVATE-TRANSCRIPT",
        summary: "PRIVATE-BRIEF",
      },
    });
    const serialised = JSON.stringify(await loadBuilderTrip(trip.id, { kind: "client", clientId: client.id }));
    expect(serialised).not.toContain("PRIVATE-REQUIREMENT");
    expect(serialised).not.toContain("PRIVATE-TRANSCRIPT");
    expect(serialised).not.toContain("PRIVATE-BRIEF");
  });

  it("stores only a bcrypt hash of the client's portal password", async () => {
    const client = await createClientRecord({ email: "login@example.com" });
    await prisma.client.update({
      where: { id: client.id },
      data: { passwordHash: await hashPassword("Kerala-trip-2026"), passwordSetAt: new Date() },
    });
    const stored = await prisma.client.findUniqueOrThrow({ where: { id: client.id } });
    expect(stored.passwordHash).not.toContain("Kerala-trip-2026");
    expect(await verifyPassword("Kerala-trip-2026", stored.passwordHash!)).toBe(true);
    expect(await verifyPassword("wrong-password", stored.passwordHash!)).toBe(false);
  });

  it("keeps the explore library free of vendor contact details and internal fields", async () => {
    const { componentA } = await createInventory();
    await prisma.vendor.update({
      where: { id: componentA.vendorId },
      data: { email: "PRIVATE@vendor.example", phone: "PRIVATE-PHONE", contactName: "PRIVATE-CONTACT", notes: "PRIVATE-NOTES" },
    });
    await prisma.component.update({ where: { id: componentA.id }, data: { source: "PRIVATE-SOURCE" } });
    const serialised = JSON.stringify(await loadLibrary());
    expect(serialised).toContain(componentA.id);
    expect(serialised).not.toContain("PRIVATE");
  });
});

describe("client portal sessions", () => {
  it("are rejected once the password has been reset after they were issued", () => {
    const setAt = new Date("2026-11-03T10:00:00.500Z");
    const at = Math.floor(setAt.getTime() / 1000);
    expect(clientSessionIsCurrent(at, setAt)).toBe(true);
    expect(clientSessionIsCurrent(at + 60, setAt)).toBe(true);
    expect(clientSessionIsCurrent(at - 1, setAt)).toBe(false);
    expect(clientSessionIsCurrent(at + 60, null)).toBe(false);
  });
});
