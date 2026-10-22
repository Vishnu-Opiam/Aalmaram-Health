import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createClientRecord, createInventory, createTrip, prisma, resetDatabase } from "./helpers";
import { addBlock } from "@/lib/services/itinerary-blocks";
import { draftItinerary, extractRequirements, loadChat, sendChatMessage, suggestionsForSlot } from "@/lib/services/ai-planning";
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
