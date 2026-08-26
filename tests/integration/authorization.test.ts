import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createClientRecord,
  createInventory,
  prisma,
  resetDatabase,
  utcDay,
} from "./helpers";
import { loadClientItinerary } from "@/domain/itineraries/client-view";
import { hashAccessToken, generateAccessToken } from "@/lib/auth/access-token";

/**
 * The security requirement that matters most in this product:
 * Client A must never be able to reach Client B's itinerary.
 */
describe("client portal authorization (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function publishedItineraryFor(email: string, title: string) {
    const client = await createClientRecord({ email });
    const { componentA } = await createInventory().catch(async () => {
      // Inventory already exists in this test run; reuse it.
      const component = await prisma.component.findFirstOrThrow();
      return { componentA: component };
    });

    const now = new Date();
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title,
        status: "PUBLISHED",
        publishedAt: now,
        startDate: utcDay("2026-03-01"),
        endDate: utcDay("2026-03-10"),
        items: {
          create: {
            componentId: componentA.id,
            scheduledDate: utcDay("2026-03-02"),
            dayNumber: 2,
            sequence: 0,
          },
        },
        report: {
          create: {
            title: "What to Expect",
            content: "# Private content",
            status: "PUBLISHED",
            publishedAt: now,
          },
        },
      },
    });

    return { client, itinerary };
  }

  it("returns a client's own published itinerary", async () => {
    const { client, itinerary } = await publishedItineraryFor(
      "a@example.com",
      "Client A journey",
    );
    const view = await loadClientItinerary(client.id, itinerary.id);
    expect(view?.title).toBe("Client A journey");
  });

  it("returns null when Client A asks for Client B's itinerary by id", async () => {
    const a = await publishedItineraryFor("a@example.com", "Client A journey");
    const b = await publishedItineraryFor("b@example.com", "Client B journey");

    // A valid, correct itinerary id - but belonging to someone else.
    const leaked = await loadClientItinerary(a.client.id, b.itinerary.id);
    expect(leaked).toBeNull();

    const reverse = await loadClientItinerary(b.client.id, a.itinerary.id);
    expect(reverse).toBeNull();
  });

  it("never returns a DRAFT itinerary to the client", async () => {
    const client = await createClientRecord({ email: "draft@example.com" });
    const { componentA } = await createInventory();
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Still a draft",
        status: "DRAFT",
        items: { create: { componentId: componentA.id, sequence: 0 } },
      },
    });

    expect(await loadClientItinerary(client.id)).toBeNull();
    expect(await loadClientItinerary(client.id, itinerary.id)).toBeNull();
  });

  it("never returns a READY_FOR_REVIEW or ARCHIVED itinerary to the client", async () => {
    const client = await createClientRecord({ email: "internal@example.com" });
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Internal review",
        status: "READY_FOR_REVIEW",
      },
    });

    expect(await loadClientItinerary(client.id, itinerary.id)).toBeNull();

    await prisma.itinerary.update({
      where: { id: itinerary.id },
      data: { status: "ARCHIVED" },
    });
    expect(await loadClientItinerary(client.id, itinerary.id)).toBeNull();
  });

  it("hides an unpublished report even when the itinerary is published", async () => {
    const client = await createClientRecord({ email: "report@example.com" });
    const { componentA } = await createInventory();
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Published, draft report",
        status: "PUBLISHED",
        publishedAt: new Date(),
        items: { create: { componentId: componentA.id, sequence: 0 } },
        report: {
          create: {
            title: "Work in progress",
            content: "# Not ready for the client",
            status: "DRAFT",
          },
        },
      },
    });

    const view = await loadClientItinerary(client.id, itinerary.id);
    expect(view).not.toBeNull();
    expect(view!.report).toBeNull();
  });

  it("excludes REMOVED items from the client projection", async () => {
    const client = await createClientRecord({ email: "removed@example.com" });
    const { componentA, componentB } = await createInventory();
    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "With a removed item",
        status: "PUBLISHED",
        publishedAt: new Date(),
        startDate: utcDay("2026-03-01"),
        endDate: utcDay("2026-03-10"),
        items: {
          create: [
            {
              componentId: componentA.id,
              scheduledDate: utcDay("2026-03-01"),
              dayNumber: 1,
              sequence: 0,
            },
            {
              componentId: componentB.id,
              scheduledDate: utcDay("2026-03-02"),
              dayNumber: 2,
              sequence: 0,
              status: "REMOVED",
            },
          ],
        },
      },
    });

    const view = await loadClientItinerary(client.id, itinerary.id);
    expect(view!.itemCount).toBe(1);
    expect(JSON.stringify(view)).not.toContain("MRI Screening");
  });

  it("never exposes internal notes, admin notes or cost metadata", async () => {
    const client = await createClientRecord({ email: "notes@example.com" });
    const { componentA } = await createInventory();

    await prisma.component.update({
      where: { id: componentA.id },
      data: { source: "SECRET-RATE-CARD", costStatus: "CONFIRMED" },
    });

    const itinerary = await prisma.itinerary.create({
      data: {
        clientId: client.id,
        title: "Notes test",
        status: "PUBLISHED",
        publishedAt: new Date(),
        adminNotes: "INTERNAL-ADMIN-NOTE",
        startDate: utcDay("2026-03-01"),
        endDate: utcDay("2026-03-10"),
        items: {
          create: {
            componentId: componentA.id,
            scheduledDate: utcDay("2026-03-01"),
            dayNumber: 1,
            sequence: 0,
            internalNotes: "INTERNAL-ITEM-NOTE",
            clientFacingNotes: "Visible to the client.",
          },
        },
      },
    });

    const view = await loadClientItinerary(client.id, itinerary.id);
    const serialised = JSON.stringify(view);

    expect(serialised).not.toContain("INTERNAL-ADMIN-NOTE");
    expect(serialised).not.toContain("INTERNAL-ITEM-NOTE");
    expect(serialised).not.toContain("SECRET-RATE-CARD");
    expect(serialised).not.toContain("costStatus");
    expect(serialised).toContain("Visible to the client.");
  });

  it("stores only the hash of a portal token, and finds the client by that hash", async () => {
    const client = await createClientRecord({ email: "token@example.com" });
    const token = generateAccessToken();

    await prisma.client.update({
      where: { id: client.id },
      data: { accessTokenHash: hashAccessToken(token) },
    });

    const stored = await prisma.client.findUniqueOrThrow({
      where: { id: client.id },
    });
    expect(stored.accessTokenHash).not.toBe(token);
    expect(stored.accessTokenHash).toMatch(/^[0-9a-f]{64}$/);

    const found = await prisma.client.findUnique({
      where: { accessTokenHash: hashAccessToken(token) },
    });
    expect(found?.id).toBe(client.id);

    const wrong = await prisma.client.findUnique({
      where: { accessTokenHash: hashAccessToken(generateAccessToken()) },
    });
    expect(wrong).toBeNull();
  });

  it("keeps portal tokens unique across clients", async () => {
    const a = await createClientRecord({ email: "ta@example.com" });
    const b = await createClientRecord({ email: "tb@example.com" });
    const token = generateAccessToken();

    await prisma.client.update({
      where: { id: a.id },
      data: { accessTokenHash: hashAccessToken(token) },
    });

    await expect(
      prisma.client.update({
        where: { id: b.id },
        data: { accessTokenHash: hashAccessToken(token) },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
