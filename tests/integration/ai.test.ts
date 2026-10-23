import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createClientRecord, createInventory, createTrip, prisma, resetDatabase } from "./helpers";
import { addBlock } from "@/lib/services/itinerary-blocks";
import {
  boardIdeas,
  draftItinerary,
  extractRequirements,
  loadChat,
  placeOnDay,
  sendChatMessage,
  suggestionsForSlot,
} from "@/lib/services/ai-planning";
import { confirmItinerary } from "@/lib/services/itinerary-blocks";
import { setBookingStatus } from "@/lib/services/bookings";
import { loadBuilderTrip } from "@/domain/trips/queries";
import { generateStructured } from "@/lib/ai";
import { blockEndsAt } from "@/domain/trips/blocks";

const TRANSCRIPT =
  "Client: I'd like a check-up with blood tests. I travel slowly and want free afternoons. I'd love Kathakali and the backwaters. Budget about 3000 euros. My email is someone@example.com.";

describe("AI layer with the fake provider (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function setup() {
    const { componentA, catalogue, vendor } = await createInventory();
    const cultureModule = await prisma.module.create({ data: { name: "Heritage & Culture", sortOrder: 2 } });
    const arts = await prisma.catalogue.create({ data: { moduleId: cultureModule.id, name: "Performing Arts" } });
    const kathakali = await prisma.component.create({
      data: {
        vendorId: vendor.id,
        catalogueId: arts.id,
        name: "Kathakali Performance (demo)",
        tags: ["kathakali", "evening"],
        price: new Prisma.Decimal("42"),
        durationMinutes: 150,
        clientFacingDescription: "An evening performance.",
      },
    });
    const client = await createClientRecord({ name: "Elena Fischer (demo)" });
    const trip = await createTrip(client.id, { startDate: new Date("2026-03-01"), endDate: new Date("2026-03-03") });
    const core = await addBlock({
      tripId: trip.id,
      scope: { kind: "staff" },
      componentId: componentA.id,
      branchId: null,
      day: "2026-03-01",
      time: "08:00",
      addedBy: "TEAM",
    });
    await prisma.conversation.create({
      data: { clientId: client.id, tripId: trip.id, channel: "CALL", occurredAt: new Date(), transcript: TRANSCRIPT },
    });
    return { client, trip, core, kathakali, catalogue };
  }

  it("drafts requirements from the conversation and records an AiRun without client text", async () => {
    const { trip } = await setup();
    await extractRequirements(trip.id, { scope: { kind: "staff" } }, { overwrite: true });

    const req = await prisma.tripRequirements.findUniqueOrThrow({ where: { tripId: trip.id }, include: { moduleMix: true } });
    expect(req.pace).toBe("RELAXED");
    expect(req.budgetAmount?.toString()).toBe("3000");
    expect(req.mustHaves).toEqual(expect.arrayContaining(["Kathakali", "Backwaters"]));
    expect(req.moduleMix.reduce((s, m) => s + m.percent, 0)).toBe(100);

    const conversation = await prisma.conversation.findFirstOrThrow({ where: { tripId: trip.id } });
    expect(conversation.summary).toBeTruthy();

    const run = await prisma.aiRun.findFirstOrThrow({ where: { task: "TRIP_REQUIREMENTS_EXTRACTION" } });
    expect(run.status).toBe("SUCCEEDED");
    expect(run.provider).toBe("fake");
    const stored = JSON.stringify(run);
    expect(stored).not.toMatch(/Kathakali|blood|someone@example\.com|Elena/i);
  });

  it("does not overwrite requirements the team wrote unless asked", async () => {
    const { trip } = await setup();
    await prisma.tripRequirements.create({ data: { tripId: trip.id, summary: "Written by the team." } });
    const result = await extractRequirements(trip.id, { scope: { kind: "staff" } }, { overwrite: false });
    expect(result.wroteRequirements).toBe(false);
    expect((await prisma.tripRequirements.findUniqueOrThrow({ where: { tripId: trip.id } })).summary).toBe(
      "Written by the team.",
    );
  });

  it("drafts AI blocks around the health core, replacing only earlier AI blocks", async () => {
    const { client, trip, core, kathakali } = await setup();
    await extractRequirements(trip.id, { scope: { kind: "staff" } }, { overwrite: true });

    const first = await draftItinerary(trip.id, { scope: { kind: "client", clientId: client.id } });
    expect(first.added).toBeGreaterThan(0);
    const second = await draftItinerary(trip.id, { scope: { kind: "client", clientId: client.id } });
    expect(second.removed).toBe(first.added);

    const items = await prisma.itineraryItem.findMany({
      where: { itinerary: { tripId: trip.id } },
      include: { component: { select: { durationMinutes: true } } },
      orderBy: { startsAt: "asc" },
    });
    expect(items.find((i) => i.id === core.id)?.addedBy).toBe("TEAM");
    const ai = items.filter((i) => i.addedBy === "AI");
    expect(ai.length).toBe(second.added);
    expect(ai.some((i) => i.componentId === kathakali.id)).toBe(true);
    expect(ai.every((i) => i.clientFacingNotes)).toBe(true);
    for (let i = 1; i < items.length; i++) {
      expect(items[i].startsAt.getTime()).toBeGreaterThanOrEqual(
        blockEndsAt(items[i - 1].startsAt, items[i - 1].component.durationMinutes).getTime(),
      );
    }
  });

  it("refuses to draft into a confirmed itinerary or another client's trip", async () => {
    const { trip } = await setup();
    const other = await createClientRecord({ email: "other@example.com" });
    await expect(draftItinerary(trip.id, { scope: { kind: "client", clientId: other.id } })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await prisma.itinerary.update({ where: { tripId: trip.id }, data: { confirmedAt: new Date() } });
    await expect(draftItinerary(trip.id, { scope: { kind: "staff" } })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("suggests things that fit the gap", async () => {
    const { client, trip, kathakali } = await setup();
    await extractRequirements(trip.id, { scope: { kind: "staff" } }, { overwrite: true });
    const ideas = await suggestionsForSlot(trip.id, { kind: "client", clientId: client.id }, "2026-03-01", "18:30");
    expect(ideas[0]?.componentId).toBe(kathakali.id);
  });

  it("chats with the client on their own trip and stores the conversation", async () => {
    const { client, trip } = await setup();
    const first = await sendChatMessage(trip.id, client.id, "Hi, I'd like to plan my trip.");
    expect(first.messages.map((m) => m.role)).toEqual(["client", "assistant"]);
    await sendChatMessage(trip.id, client.id, "Is it safe to do the MRI with my medication?");
    const chat = await loadChat(trip.id, client.id);
    expect(chat.at(-1)?.text).toMatch(/can't give medical advice/);
    expect(await prisma.conversation.count({ where: { tripId: trip.id, channel: "AI_CHAT" } })).toBe(1);

    const other = await createClientRecord({ email: "intruder@example.com" });
    await expect(sendChatMessage(trip.id, other.id, "hello")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await loadChat(trip.id, other.id)).toEqual([]);
  });

  it("answers “I love art” with ideas from the catalogue, and puts them first on the board", async () => {
    const { client, trip, kathakali } = await setup();
    const reply = await sendChatMessage(trip.id, client.id, "I love this art. Can I see it while I'm there?");
    expect(reply.suggestions.map((s) => s.componentId)).toEqual([kathakali.id]);
    expect(reply.suggestions[0].reason).toBe("You mentioned art.");
    // Health is never offered, even when asked about directly.
    const health = await sendChatMessage(trip.id, client.id, "Could I add a blood panel?");
    expect(health.suggestions).toEqual([]);
    expect((await boardIdeas(trip.id, client.id))[0]).toEqual({ componentId: kathakali.id, reason: "You mentioned art." });
  });

  it("drops an idea on a day at a suitable time, only on the client's own open trip", async () => {
    const { client, trip, kathakali } = await setup();
    const scope = { kind: "client" as const, clientId: client.id };
    const { id } = await placeOnDay(trip.id, scope, kathakali.id, "2026-03-02");
    const block = await prisma.itineraryItem.findUniqueOrThrow({ where: { id } });
    expect(block.addedBy).toBe("CLIENT");
    expect(block.startsAt.toISOString()).toBe("2026-03-02T18:30:00.000Z");

    await expect(placeOnDay(trip.id, scope, kathakali.id, "2026-04-01")).rejects.toMatchObject({ code: "CONFLICT" });
    const other = await createClientRecord({ email: "intruder2@example.com" });
    await expect(placeOnDay(trip.id, { kind: "client", clientId: other.id }, kathakali.id, "2026-03-02")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await confirmItinerary(trip.id, scope);
    await expect(placeOnDay(trip.id, scope, kathakali.id, "2026-03-03")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("records bookings once confirmed and shows the client ✓✓ then the green tick", async () => {
    const { client, trip, core } = await setup();
    const scope = { kind: "client" as const, clientId: client.id };
    await expect(setBookingStatus(core.id, "CONFIRMED")).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await loadBuilderTrip(trip.id, scope))!.days[0].blocks[0].progress).toBe("planned");

    await confirmItinerary(trip.id, scope);
    expect((await loadBuilderTrip(trip.id, scope))!.days[0].blocks[0].progress).toBe("confirmed");

    await setBookingStatus(core.id, "REQUESTED");
    await setBookingStatus(core.id, "CONFIRMED");
    await expect(setBookingStatus(core.id, "REQUESTED")).rejects.toMatchObject({ code: "CONFLICT" });
    const seen = (await loadBuilderTrip(trip.id, scope))!.days[0].blocks[0];
    expect(seen.progress).toBe("booked");
    expect(seen.bookingStatus).toBeNull();
    expect((await loadBuilderTrip(trip.id, { kind: "staff" }))!.days[0].blocks[0].bookingStatus).toBe("CONFIRMED");
  });

  it("records INVALID_OUTPUT when a result fails its schema", async () => {
    await expect(
      generateStructured({
        task: "CLIENT_CHAT",
        schema: z.object({ reply: z.string().min(5) }),
        system: "",
        prompt: "",
        promptVersion: "test",
        model: "fast",
        fake: () => ({ reply: "" }),
      }),
    ).rejects.toThrow();
    const run = await prisma.aiRun.findFirstOrThrow({ where: { promptVersion: "test" } });
    expect(run.status).toBe("INVALID_OUTPUT");
  });
});
