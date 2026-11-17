import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createClientRecord, createInventory, createTrip, prisma, resetDatabase } from "./helpers";
import { addBlock } from "@/lib/services/itinerary-blocks";

// The portal actions take the client from the session; here the session is whoever `signedIn` says.
const session = vi.hoisted(() => ({ client: null as null | { id: string; name: string } }));
vi.mock("@/lib/auth/guards", () => ({
  requireClient: async () => {
    if (!session.client) throw new Error("not signed in");
    return session.client;
  },
}));

const { addClientBlockAction, talkToPersonAction } = await import("@/app/trip/actions");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const idle = { status: "idle" as const, message: null, fieldErrors: {} };

describe("portal actions: returnTo and ask context (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    // Leave the dev database empty for `npm run db:seed`, not holding the last test's rows.
    await resetDatabase();
    await prisma.$disconnect();
  });

  async function signedInWithTrip(email: string) {
    const client = await createClientRecord({ email });
    const inventory = (await prisma.component.findFirst({ where: { name: "Blood Panel" } }))
      ? {
          componentA: await prisma.component.findFirstOrThrow({ where: { name: "Blood Panel" } }),
          componentB: await prisma.component.findFirstOrThrow({ where: { name: "MRI Screening" } }),
        }
      : await createInventory();
    const trip = await createTrip(client.id);
    session.client = { id: client.id, name: client.name };
    return { client, trip, ...inventory };
  }

  it("adds from a place page and returns there with an added marker", async () => {
    const { trip, componentB } = await signedInWithTrip("explore@example.com");
    const result = await addClientBlockAction(
      idle,
      form({
        tripId: trip.id,
        componentId: componentB.id,
        day: "2026-03-03",
        time: "10:00",
        returnTo: "/trip/explore/test-diagnostics-demo?for=2026-03-03&added=old",
      }),
    );
    expect(result.status).toBe("success");
    const block = await prisma.itineraryItem.findFirstOrThrow({ where: { itinerary: { tripId: trip.id } } });
    expect(result.redirectTo).toMatch(
      new RegExp(`^/trip/explore/test-diagnostics-demo\\?for=2026-03-03&added=${block.id}&u=[0-9a-f]{8}$`),
    );
  });

  it("keeps the itinerary as the default destination", async () => {
    const { trip, componentB } = await signedInWithTrip("default@example.com");
    const result = await addClientBlockAction(idle, form({ tripId: trip.id, componentId: componentB.id, day: "2026-03-03", time: "10:00" }));
    expect(result.redirectTo).toMatch(new RegExp(`^/trip/itinerary\\?trip=${trip.id}&just=`));
    expect(result.redirectTo).toContain("#day-2026-03-03");
  });

  it("refuses a returnTo outside the portal, without adding anything", async () => {
    const { trip, componentB } = await signedInWithTrip("redirect@example.com");
    for (const returnTo of ["https://evil.example/trip/explore", "//evil.example", "/admin/clients", "/trip/../admin"]) {
      const result = await addClientBlockAction(
        idle,
        form({ tripId: trip.id, componentId: componentB.id, day: "2026-03-03", time: "10:00", returnTo }),
      );
      expect(result.status, returnTo).toBe("error");
      expect(result.fieldErrors.returnTo).toBeDefined();
      expect(result.redirectTo).toBeUndefined();
    }
    expect(await prisma.itineraryItem.count()).toBe(0);
  });

  it("logs what the client asked about as ids only and tells the admin in plain words", async () => {
    const { trip, componentA } = await signedInWithTrip("ask@example.com");
    const result = await talkToPersonAction(
      idle,
      form({
        tripId: trip.id,
        componentId: componentA.id,
        vendorSlug: "test-diagnostics-demo",
        dayKey: "2026-03-04",
        returnTo: "/trip/explore/test-diagnostics-demo",
      }),
    );
    expect(result.status).toBe("success");
    expect(result.redirectTo).toMatch(/^\/trip\/explore\/test-diagnostics-demo\?asked=1&u=/);

    const entry = await prisma.activityLog.findFirstOrThrow({ where: { action: "client.asked_for_person", entityId: trip.id } });
    expect(entry.metadata).toEqual({
      componentId: componentA.id,
      vendorId: componentA.vendorId,
      blockId: null,
      day: "2026-03-04",
      dayNumber: 4,
    });

    const { personRequestLabels } = await import("@/lib/services/person-request");
    expect((await personRequestLabels([entry])).get(entry.id)).toBe("Blood Panel at Test Diagnostics (demo), Day 4");
  });

  it("still works with no context (the existing Ask us button)", async () => {
    const { trip } = await signedInWithTrip("plain@example.com");
    const result = await talkToPersonAction(idle, form({ tripId: trip.id }));
    expect(result.redirectTo).toMatch(new RegExp(`^/trip/chat\\?trip=${trip.id}&asked=1&u=`));
  });

  it("refuses context from another client's trip or outside the trip", async () => {
    const a = await signedInWithTrip("a@example.com");
    const b = await signedInWithTrip("b@example.com");
    const bBlock = await addBlock({
      tripId: b.trip.id,
      scope: { kind: "staff" },
      componentId: b.componentA.id,
      branchId: null,
      day: "2026-03-02",
      time: "08:00",
      addedBy: "TEAM",
    });

    session.client = { id: a.client.id, name: a.client.name };
    const cases: [Record<string, string>, string][] = [
      [{ tripId: b.trip.id }, "FORBIDDEN trip"],
      [{ tripId: a.trip.id, blockId: bBlock.id }, "another trip's block"],
      [{ tripId: a.trip.id, componentId: "no-such-component" }, "unknown component"],
      [{ tripId: a.trip.id, vendorSlug: "no-such-place" }, "unknown place"],
      [{ tripId: a.trip.id, dayKey: "2026-04-01" }, "day outside the trip"],
      [{ tripId: a.trip.id, returnTo: "https://evil.example" }, "open redirect"],
    ];
    for (const [fields, label] of cases) {
      const result = await talkToPersonAction(idle, form(fields));
      expect(result.status, label).toBe("error");
    }
    expect(await prisma.activityLog.count({ where: { action: "client.asked_for_person" } })).toBe(0);
  });
});
