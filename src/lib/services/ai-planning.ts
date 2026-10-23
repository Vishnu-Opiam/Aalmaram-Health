import "server-only";
import { prisma } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { generateStructured } from "@/lib/ai";
import * as requirementsPrompt from "@/lib/ai/prompts/requirements";
import * as draftPrompt from "@/lib/ai/prompts/itinerary-draft";
import * as chatPrompt from "@/lib/ai/prompts/client-chat";
import { heuristicRequirements, requirementsDraftSchema } from "@/domain/ai/extraction";
import {
  draftPicksSchema,
  draftPlan,
  freeGaps,
  interestMatches,
  minutesToTime,
  startOnDay,
  suggestForSlot,
  validatePicks,
  type PlannerInput,
  type SlotSuggestion,
} from "@/domain/ai/planner";
import { appendToTranscript, chatReplySchema, parseTranscript, scriptedReply, type ChatMessage } from "@/domain/ai/chat";
import { minimisePii } from "@/domain/ai/pii";
import { MEDICAL_DEFLECTION, safeText } from "@/domain/ai/safety";
import { normaliseMix } from "@/domain/trips/module-mix";
import { blockDay, blockPrice, toBlockStart } from "@/domain/trips/blocks";
import { assertItineraryEditable } from "@/domain/trips/status";
import { addDays, daysBetweenInclusive, formatDateRange, toDateInputValue } from "@/domain/shared/dates";
import { addBlock, loadTripForMutation, type BlockScope } from "./itinerary-blocks";

/**
 * The AI layer on top of the model (class diagram: "the agent is not an
 * entity"): conversations → requirements, requirements → a draft itinerary,
 * a gap → suggestions, and the client's discovery chat.
 *
 * Human in the loop: AI only ever adds `AI` blocks, labelled "Suggested",
 * which the client keeps or removes; it never touches the team's health core
 * or the client's own choices, and nothing is booked until the client
 * confirms.
 */

export type Actor = { scope: BlockScope; userId?: string };

const DEFAULT_REASON = "Fits a free part of your day.";

async function loadPlanningContext(tripId: string, scope: BlockScope) {
  const trip = await loadTripForMutation(tripId, scope);
  const [details, components] = await Promise.all([
    prisma.trip.findUniqueOrThrow({
      where: { id: trip.id },
      select: {
        client: { select: { name: true } },
        requirements: { include: { moduleMix: true } },
        itinerary: {
          select: {
            items: {
              select: {
                id: true,
                startsAt: true,
                addedBy: true,
                componentId: true,
                component: { select: { durationMinutes: true, recoveryTimeMinutes: true, catalogue: { select: { moduleId: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.component.findMany({
      where: { status: "ACTIVE", vendor: { status: "ACTIVE" }, catalogue: { status: "ACTIVE", module: { status: "ACTIVE" } } },
      select: {
        id: true,
        name: true,
        tags: true,
        price: true,
        priceUnit: true,
        currency: true,
        durationMinutes: true,
        recoveryTimeMinutes: true,
        catalogue: { select: { name: true, module: { select: { id: true, name: true } } } },
        vendor: {
          select: { branches: { where: { status: "ACTIVE" }, orderBy: [{ city: "asc" }, { name: "asc" }], select: { id: true }, take: 1 } },
        },
      },
    }),
  ]);
  return { trip, details, components };
}

type Ctx = Awaited<ReturnType<typeof loadPlanningContext>>;

function plannerInput(ctx: Ctx, opts: { excludeAi: boolean }): PlannerInput {
  const days = Array.from({ length: daysBetweenInclusive(ctx.trip.startDate, ctx.trip.endDate) }, (_, i) =>
    toDateInputValue(addDays(ctx.trip.startDate, i)),
  );
  const items = (ctx.details.itinerary?.items ?? []).filter((i) => !(opts.excludeAi && i.addedBy === "AI"));
  const req = ctx.details.requirements;
  return {
    days,
    existing: items.map((i) => {
      const start = i.startsAt.getUTCHours() * 60 + i.startsAt.getUTCMinutes();
      return {
        day: blockDay(i.startsAt),
        start,
        end: start + i.component.durationMinutes + (i.component.recoveryTimeMinutes ?? 0),
        moduleId: i.component.catalogue.moduleId,
        componentId: i.componentId,
      };
    }),
    components: ctx.components.map((c) => ({
      id: c.id,
      name: c.name,
      moduleId: c.catalogue.module.id,
      moduleName: c.catalogue.module.name,
      catalogueName: c.catalogue.name,
      tags: c.tags,
      durationMinutes: c.durationMinutes,
      recoveryMinutes: c.recoveryTimeMinutes,
    })),
    targetMix: req?.moduleMix.map((s) => ({ moduleId: s.moduleId, percent: s.percent })) ?? [],
    pace: req?.pace ?? null,
    mustHaves: req?.mustHaves ?? [],
    avoid: req?.avoid ?? [],
  };
}

// ---------------------------------------------------------------------------
// Conversations → requirements
// ---------------------------------------------------------------------------

export async function extractRequirements(tripId: string, actor: Actor, opts: { overwrite: boolean }) {
  const trip = await loadTripForMutation(tripId, actor.scope);
  const [client, conversations, modules, existing] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: trip.clientId }, select: { name: true } }),
    prisma.conversation.findMany({
      where: { tripId: trip.id },
      orderBy: { occurredAt: "asc" },
      select: { id: true, transcript: true, summary: true },
    }),
    prisma.module.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } }),
    prisma.tripRequirements.findUnique({ where: { tripId: trip.id }, select: { id: true } }),
  ]);
  if (conversations.length === 0) throw conflict("There is no conversation to learn from yet.");

  const transcript = minimisePii(conversations.map((c) => c.transcript).join("\n\n---\n\n"), [client.name]);
  const moduleNames = modules.map((m) => m.name);
  const { data } = await generateStructured({
    task: "TRIP_REQUIREMENTS_EXTRACTION",
    schema: requirementsDraftSchema,
    system: requirementsPrompt.SYSTEM,
    prompt: requirementsPrompt.buildPrompt({ modules: moduleNames, transcript }),
    promptVersion: requirementsPrompt.PROMPT_VERSION,
    model: "fast",
    fake: () => heuristicRequirements(transcript, moduleNames),
    logOutput: (d) => ({ modules: d.moduleMix.length, mustHaves: d.mustHaves.length, avoid: d.avoid.length, pace: d.pace }),
    entity: { type: "Trip", id: trip.id },
    actorUserId: actor.userId,
  });

  const byName = new Map(modules.map((m) => [m.name.toLowerCase(), m.id]));
  const mix = normaliseMix(
    data.moduleMix
      .map((s) => ({ moduleId: byName.get(s.moduleName.toLowerCase()), percent: s.percent }))
      .filter((s): s is { moduleId: string; percent: number } => Boolean(s.moduleId)),
  ).filter((s) => s.percent > 0);

  const summary = safeText(data.summary, "Requirements drafted from the conversation; please review.");
  const brief = safeText(data.brief, "Review the conversation before fixing the health core.");
  const write = opts.overwrite || !existing;

  await prisma.$transaction(async (tx) => {
    if (write) {
      const fields = {
        summary,
        pace: data.pace,
        mustHaves: data.mustHaves,
        avoid: data.avoid,
        budgetAmount: data.budgetAmount === null ? null : data.budgetAmount.toFixed(2),
        budgetCurrency: data.budgetAmount === null ? null : (data.budgetCurrency ?? "EUR"),
      };
      const req = await tx.tripRequirements.upsert({
        where: { tripId: trip.id },
        create: { tripId: trip.id, ...fields },
        update: fields,
      });
      await tx.tripModuleShare.deleteMany({ where: { requirementsId: req.id } });
      if (mix.length) await tx.tripModuleShare.createMany({ data: mix.map((s) => ({ requirementsId: req.id, ...s })) });
    }
    const latest = conversations.at(-1)!;
    if (!latest.summary) await tx.conversation.update({ where: { id: latest.id }, data: { summary: brief } });
  });
  return { wroteRequirements: write };
}

// ---------------------------------------------------------------------------
// Requirements → draft itinerary
// ---------------------------------------------------------------------------

export async function draftItinerary(tripId: string, actor: Actor) {
  const ctx = await loadPlanningContext(tripId, actor.scope);
  assertItineraryEditable(ctx.trip.status, ctx.trip.itinerary.confirmedAt);
  const input = plannerInput(ctx, { excludeAi: true });
  const proposal = draftPlan(input).map((p) => ({ componentId: p.componentId, day: p.day, time: minutesToTime(p.start), reason: p.reason }));
  const names = new Map(input.components.map((c) => [c.id, c.moduleName]));
  const req = ctx.details.requirements;

  const { data } = await generateStructured({
    task: "ITINERARY_DRAFT",
    schema: draftPicksSchema,
    system: draftPrompt.SYSTEM,
    prompt: draftPrompt.buildPrompt({
      summary: minimisePii(req?.summary ?? "", [ctx.details.client.name]),
      pace: input.pace,
      mustHaves: input.mustHaves,
      avoid: input.avoid,
      mix: input.targetMix.map((m) => ({ moduleName: input.components.find((c) => c.moduleId === m.moduleId)?.moduleName ?? m.moduleId, percent: m.percent })),
      gaps: input.days.map((day) => ({ day, free: freeGaps(day, input.existing).map((g) => `${minutesToTime(g.start)}-${minutesToTime(g.end)}`) })),
      candidates: input.components.filter((c) => !input.existing.some((e) => e.componentId === c.id)),
      proposal,
    }),
    promptVersion: draftPrompt.PROMPT_VERSION,
    model: "reasoning",
    fake: () => ({ picks: proposal }),
    logOutput: (d) => ({ picks: d.picks.map((p) => p.componentId), modules: d.picks.map((p) => names.get(p.componentId) ?? "?") }),
    entity: { type: "Trip", id: ctx.trip.id },
    actorUserId: actor.userId,
  });

  // Anything the model invented (unknown ids, clashes, outside the day) is dropped.
  let picks = validatePicks(data.picks, input);
  if (picks.length === 0) picks = validatePicks(proposal, input);
  const components = new Map(ctx.components.map((c) => [c.id, c]));

  const result = await prisma.$transaction(async (tx) => {
    const removed = await tx.itineraryItem.deleteMany({ where: { itineraryId: ctx.trip.itinerary.id, addedBy: "AI" } });
    for (const pick of picks) {
      const c = components.get(pick.componentId)!;
      await tx.itineraryItem.create({
        data: {
          itineraryId: ctx.trip.itinerary.id,
          componentId: c.id,
          // The client picks the location; the first branch is a starting point they can change.
          branchId: c.vendor.branches[0]?.id ?? null,
          startsAt: toBlockStart(pick.day, minutesToTime(pick.start)),
          addedBy: "AI",
          price: blockPrice(c.price, c.priceUnit, ctx.trip.travellers),
          currency: c.currency,
          clientFacingNotes: safeText(pick.reason, DEFAULT_REASON),
        },
      });
    }
    return { removed: removed.count, added: picks.length };
  });
  return { ...result, trip: ctx.trip };
}

// ---------------------------------------------------------------------------
// A "+" in the builder → suggestions
// ---------------------------------------------------------------------------

export async function suggestionsForSlot(tripId: string, scope: BlockScope, day: string, time: string): Promise<SlotSuggestion[]> {
  const ctx = await loadPlanningContext(tripId, scope);
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return [];
  return suggestForSlot(plannerInput(ctx, { excludeAi: false }), day, Number(m[1]) * 60 + Number(m[2]));
}

// ---------------------------------------------------------------------------
// The portal: an idea from the chat placed on a day
// ---------------------------------------------------------------------------

/**
 * The client dropped an idea on a day (or pressed "Add"): we choose the time
 * and, for providers with several locations, the first one — both can be
 * changed on the block afterwards.
 */
export async function placeOnDay(tripId: string, scope: BlockScope, componentId: string, day: string) {
  const ctx = await loadPlanningContext(tripId, scope);
  const input = plannerInput(ctx, { excludeAi: false });
  const component = ctx.components.find((c) => c.id === componentId);
  if (!component) throw conflict("That experience is not available at the moment.");
  if (!input.days.includes(day)) throw conflict("Please choose a day of your trip.");
  return addBlock({
    tripId: ctx.trip.id,
    scope,
    componentId,
    branchId: component.vendor.branches[0]?.id ?? null,
    day,
    time: minutesToTime(startOnDay(input, componentId, day)),
    addedBy: scope.kind === "client" ? "CLIENT" : "TEAM",
  });
}

// ---------------------------------------------------------------------------
// Client chat
// ---------------------------------------------------------------------------

export async function loadChat(tripId: string, clientId: string): Promise<ChatMessage[]> {
  const conversation = await prisma.conversation.findFirst({
    where: { tripId, clientId, channel: "AI_CHAT" },
    select: { transcript: true },
  });
  return conversation ? parseTranscript(conversation.transcript) : [];
}

export async function sendChatMessage(tripId: string, clientId: string, text: string) {
  const scope = { kind: "client" as const, clientId };
  const ctx = await loadPlanningContext(tripId, scope);
  const trip = ctx.trip;
  const existing = await prisma.conversation.findFirst({
    where: { tripId: trip.id, clientId, channel: "AI_CHAT" },
    select: { id: true, transcript: true },
  });
  const transcript = appendToTranscript(existing?.transcript ?? "", { role: "client", text });
  const messages = parseTranscript(transcript);

  // What the assistant may offer: experiences not yet in the trip, never health.
  const input = plannerInput(ctx, { excludeAi: false });
  const inTrip = new Set(input.existing.map((b) => b.componentId));
  const offered = input.components.filter((c) => !inTrip.has(c.id) && !/health|medical/i.test(c.moduleName));
  const matches = interestMatches([text], offered);

  const { data } = await generateStructured({
    task: "CLIENT_CHAT",
    schema: chatReplySchema,
    system: chatPrompt.SYSTEM,
    prompt: chatPrompt.buildPrompt({
      tripName: trip.name,
      dates: formatDateRange(trip.startDate, trip.endDate),
      transcript: minimisePii(transcript, [ctx.details.client.name]),
      experiences: offered.map((c) => ({ id: c.id, name: c.name, tags: c.tags })),
    }),
    promptVersion: chatPrompt.PROMPT_VERSION,
    model: "fast",
    fake: () => scriptedReply(messages, matches.map((m) => m.componentId)),
    logOutput: (d) => ({ readyToBuild: d.readyToBuild, suggestions: d.suggestions, turn: messages.length }),
    entity: { type: "Trip", id: trip.id },
  });

  const reply = safeText(data.reply, MEDICAL_DEFLECTION);
  const updated = appendToTranscript(transcript, { role: "assistant", text: reply });
  if (existing) {
    await prisma.conversation.update({ where: { id: existing.id }, data: { transcript: updated } });
  } else {
    await prisma.conversation.create({
      data: { clientId, tripId: trip.id, channel: "AI_CHAT", occurredAt: new Date(), transcript: updated },
    });
  }
  // Ids the model invented are dropped; a deflected reply offers nothing.
  const offeredIds = new Set(offered.map((c) => c.id));
  const term = new Map(matches.map((m) => [m.componentId, m.term]));
  const suggestions: SlotSuggestion[] =
    reply === MEDICAL_DEFLECTION
      ? []
      : [...new Set(data.suggestions)]
          .filter((id) => offeredIds.has(id))
          .slice(0, 3)
          .map((componentId) => ({
            componentId,
            reason: term.has(componentId) ? `You mentioned ${term.get(componentId)}.` : "Suggested from our chat.",
          }));
  return { messages: parseTranscript(updated), readyToBuild: data.readyToBuild, suggestions };
}
