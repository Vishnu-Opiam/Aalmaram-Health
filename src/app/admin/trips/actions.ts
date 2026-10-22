"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { notFound, validation } from "@/lib/errors";
import {
  blockAddSchema,
  blockMoveSchema,
  blockRemoveSchema,
  conversationSchema,
  itineraryNotesSchema,
  reportSaveSchema,
  requirementsSchema,
  tripCreateSchema,
  tripSchema,
} from "@/lib/validation/schemas";
import { parseDateInput } from "@/domain/shared/dates";
import { moduleMixProblems, type ModuleShare } from "@/domain/trips/module-mix";
import { assertTransition } from "@/domain/trips/status";
import { formatTime, groupBlocksByDay } from "@/domain/trips/blocks";
import { defaultReportTitle, generateReportContent } from "@/domain/reports/generate";
import {
  parseForm,
  runAction,
  successState,
  type FormState,
} from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import {
  addBlock,
  loadTripForMutation,
  moveBlock,
  removeBlock,
  repriceItinerary,
} from "@/lib/services/itinerary-blocks";
import { refreshUrl } from "@/lib/refresh-url";
import { draftItinerary, extractRequirements, suggestionsForSlot } from "@/lib/services/ai-planning";

const STAFF = { kind: "staff" } as const;
const tripUrl = (tripId: string, hash = "") => `${refreshUrl(`/admin/trips/${tripId}`)}${hash}`;

// ---------------------------------------------------------------------------
// Trip
// ---------------------------------------------------------------------------

/** A trip is created with its (empty) itinerary: Trip 1→1 Itinerary. */
export async function createTripAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("trip.create", formData, async () => {
    const user = await requireUser();
    const input = parseForm(tripCreateSchema, formData);
    const client = await prisma.client.findUnique({ where: { id: input.clientId }, select: { id: true } });
    if (!client) throw notFound("That client");

    const trip = await prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          clientId: client.id,
          name: input.name,
          startDate: parseDateInput(input.startDate),
          endDate: parseDateInput(input.endDate),
          travellers: input.travellers,
          itinerary: { create: {} },
        },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.TRIP_CREATED,
          entityType: "Trip",
          entityId: created.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { clientId: client.id },
        },
        tx,
      );
      return created;
    });
    return successState("Trip created.", `/admin/trips/${trip.id}`);
  });
}

export async function updateTripAction(
  tripId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("trip.update", formData, async () => {
    const user = await requireUser();
    const input = parseForm(tripSchema, formData);
    const trip = await loadTripForMutation(tripId, STAFF);

    await prisma.$transaction(async (tx) => {
      await tx.trip.update({
        where: { id: trip.id },
        data: {
          name: input.name,
          startDate: parseDateInput(input.startDate),
          endDate: parseDateInput(input.endDate),
          travellers: input.travellers,
        },
      });
      // Prices follow the traveller count until the itinerary is confirmed.
      if (!trip.itinerary.confirmedAt && trip.travellers !== input.travellers) {
        await repriceItinerary(trip.id, tx);
      }
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.TRIP_UPDATED,
          entityType: "Trip",
          entityId: trip.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { travellers: input.travellers },
        },
        tx,
      );
    });
    return successState("Trip saved.", tripUrl(trip.id));
  });
}

/**
 * The relationship manager reopens a confirmed (unpaid) itinerary so it can
 * be changed — the only way to change it after the client confirms.
 */
export async function reopenItineraryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("itinerary.reopen", formData, async () => {
    const user = await requireUser();
    const trip = await loadTripForMutation(String(formData.get("tripId") ?? ""), STAFF);
    assertTransition(trip.status, "PLANNING");

    await prisma.$transaction(async (tx) => {
      await tx.trip.update({ where: { id: trip.id }, data: { status: "PLANNING" } });
      await tx.itinerary.update({ where: { id: trip.itinerary.id }, data: { confirmedAt: null } });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.ITINERARY_REOPENED,
          entityType: "Trip",
          entityId: trip.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { from: trip.status },
        },
        tx,
      );
    });
    return successState("Itinerary reopened for changes.", tripUrl(trip.id));
  });
}

export async function saveItineraryNotesAction(
  tripId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("itinerary.notes", formData, async () => {
    await requireUser();
    const input = parseForm(itineraryNotesSchema, formData);
    const trip = await loadTripForMutation(tripId, STAFF);
    await prisma.itinerary.update({ where: { id: trip.itinerary.id }, data: input });
    return successState("Notes saved.", tripUrl(trip.id));
  });
}

// ---------------------------------------------------------------------------
// Requirements & conversations
// ---------------------------------------------------------------------------

/** Module-mix inputs arrive as `mix.<moduleId>`; all blank means "no mix yet". */
async function parseModuleMix(formData: FormData): Promise<ModuleShare[]> {
  const entries = [...formData.entries()].filter(([key]) => key.startsWith("mix."));
  if (entries.every(([, value]) => String(value).trim() === "")) return [];
  const modules = await prisma.module.findMany({ select: { id: true } });
  const known = new Set(modules.map((m) => m.id));
  const shares = entries
    .map(([key, value]) => ({ moduleId: key.slice(4), percent: Number(String(value).trim() || "0") }))
    .filter((s) => known.has(s.moduleId));
  const problems = moduleMixProblems(shares);
  if (problems.length > 0) throw validation(problems[0], { moduleMix: problems });
  return shares.filter((s) => s.percent > 0);
}

export async function saveRequirementsAction(
  tripId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("trip.requirements", formData, async () => {
    const user = await requireUser();
    const input = parseForm(requirementsSchema, formData);
    const mix = await parseModuleMix(formData);
    const trip = await loadTripForMutation(tripId, STAFF);

    const data = {
      summary: input.summary,
      budgetAmount: input.budgetAmount === null ? null : new Prisma.Decimal(Number(input.budgetAmount).toFixed(2)),
      budgetCurrency: input.budgetAmount === null ? null : (input.budgetCurrency ?? "EUR"),
      pace: input.pace,
      mustHaves: input.mustHaves,
      avoid: input.avoid,
    };

    await prisma.$transaction(async (tx) => {
      const requirements = await tx.tripRequirements.upsert({
        where: { tripId: trip.id },
        create: { tripId: trip.id, ...data },
        update: data,
      });
      await tx.tripModuleShare.deleteMany({ where: { requirementsId: requirements.id } });
      if (mix.length > 0) {
        await tx.tripModuleShare.createMany({
          data: mix.map((share) => ({ requirementsId: requirements.id, ...share })),
        });
      }
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.TRIP_REQUIREMENTS_UPDATED,
          entityType: "Trip",
          entityId: trip.id,
          actorUserId: user.id,
          actorLabel: user.name,
          // Counts only: requirement text is client data and stays out of the audit log.
          metadata: { modules: mix.length, mustHaves: input.mustHaves.length, avoid: input.avoid.length },
        },
        tx,
      );
    });
    return successState("Requirements saved.", tripUrl(trip.id, "#requirements"));
  });
}

export async function addConversationAction(
  tripId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("conversation.add", formData, async () => {
    const user = await requireUser();
    const input = parseForm(conversationSchema, formData);
    const trip = await loadTripForMutation(tripId, STAFF);

    await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          clientId: trip.clientId,
          tripId: trip.id,
          channel: input.channel,
          // datetime-local carries no zone; it is recorded as entered (Kerala time).
          occurredAt: new Date(`${input.occurredAt}:00.000Z`),
          transcript: input.transcript,
          summary: input.summary,
          createdById: user.id,
        },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.CONVERSATION_ADDED,
          entityType: "Conversation",
          entityId: conversation.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { tripId: trip.id, channel: input.channel },
        },
        tx,
      );
    });
    return successState("Conversation recorded.", tripUrl(trip.id, "#conversations"));
  });
}

// ---------------------------------------------------------------------------
// Blocks (staff place the health core; they may adjust any block)
// ---------------------------------------------------------------------------

export async function addBlockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("itinerary.block.add", formData, async () => {
    const user = await requireUser();
    const input = parseForm(blockAddSchema, formData);
    const block = await addBlock({ ...input, scope: STAFF, addedBy: "TEAM" });
    await logActivity({
      action: ACTIVITY_ACTIONS.BLOCK_ADDED,
      entityType: "Trip",
      entityId: input.tripId,
      actorUserId: user.id,
      actorLabel: user.name,
      metadata: { blockId: block.id, componentId: input.componentId, addedBy: "TEAM" },
    });
    return successState("Added to the itinerary.", tripUrl(input.tripId, `#day-${input.day}`));
  });
}

export async function moveBlockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("itinerary.block.move", formData, async () => {
    const user = await requireUser();
    const input = parseForm(blockMoveSchema, formData);
    const { tripId } = await moveBlock({ ...input, scope: STAFF });
    await logActivity({
      action: ACTIVITY_ACTIONS.BLOCK_MOVED,
      entityType: "Trip",
      entityId: tripId,
      actorUserId: user.id,
      actorLabel: user.name,
      metadata: { blockId: input.blockId },
    });
    return successState("Activity moved.", tripUrl(tripId, `#day-${input.day}`));
  });
}

export async function removeBlockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("itinerary.block.remove", formData, async () => {
    const user = await requireUser();
    const input = parseForm(blockRemoveSchema, formData);
    const { tripId } = await removeBlock({ ...input, scope: STAFF });
    await logActivity({
      action: ACTIVITY_ACTIONS.BLOCK_REMOVED,
      entityType: "Trip",
      entityId: tripId,
      actorUserId: user.id,
      actorLabel: user.name,
      metadata: { blockId: input.blockId },
    });
    return successState("Activity removed.", tripUrl(tripId, "#itinerary"));
  });
}

// ---------------------------------------------------------------------------
// AI drafts (always drafts: staff review requirements; AI blocks are "Suggested")
// ---------------------------------------------------------------------------

export async function draftRequirementsWithAiAction(
  tripId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("ai.requirements", formData, async () => {
    const user = await requireUser();
    // Staff asked for it explicitly, so the draft replaces the form; they edit from there.
    await extractRequirements(tripId, { scope: STAFF, userId: user.id }, { overwrite: true });
    await logActivity({
      action: ACTIVITY_ACTIONS.AI_REQUIREMENTS_DRAFTED,
      entityType: "Trip",
      entityId: tripId,
      actorUserId: user.id,
      actorLabel: user.name,
    });
    return successState("Requirements drafted from the conversations. Please review them.", tripUrl(tripId, "#requirements"));
  });
}

export async function draftItineraryWithAiAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("ai.itinerary", formData, async () => {
    const user = await requireUser();
    const tripId = String(formData.get("tripId") ?? "");
    const { added, removed } = await draftItinerary(tripId, { scope: STAFF, userId: user.id });
    await logActivity({
      action: ACTIVITY_ACTIONS.AI_ITINERARY_DRAFTED,
      entityType: "Trip",
      entityId: tripId,
      actorUserId: user.id,
      actorLabel: user.name,
      metadata: { added, removed },
    });
    return successState(`${added} suggested activities added.`, tripUrl(tripId, "#itinerary"));
  });
}

/** Ideas for a "+" in the staff builder. */
export async function suggestForStaffSlot(tripId: string, day: string, time: string) {
  await requireUser();
  return suggestionsForSlot(tripId, STAFF, day, time);
}

// ---------------------------------------------------------------------------
// What-to-Expect report (a document generated from the itinerary)
// ---------------------------------------------------------------------------

export async function generateReportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("report.generate", formData, async () => {
    const user = await requireUser();
    const tripId = String(formData.get("tripId") ?? "");
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        client: { select: { name: true } },
        itinerary: {
          include: {
            items: {
              orderBy: { startsAt: "asc" },
              include: {
                branch: { select: { name: true, city: true } },
                component: {
                  include: {
                    vendor: { select: { name: true, hqCity: true } },
                    catalogue: { select: { name: true, module: { select: { name: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!trip?.itinerary) throw notFound("That trip");
    const itinerary = trip.itinerary;

    const days = groupBlocksByDay(trip.startDate, trip.endDate, itinerary.items);
    const items = days.flatMap((day) =>
      day.blocks.map((item) => ({
        dayNumber: day.dayNumber,
        scheduledDate: day.date,
        title: `${formatTime(item.startsAt)} · ${item.customTitle?.trim() || item.component.name}`,
        moduleName: item.component.catalogue.module.name,
        catalogueName: item.component.catalogue.name,
        vendorName: item.component.vendor.name,
        vendorLocation: item.branch ? `${item.branch.name}, ${item.branch.city}` : item.component.vendor.hqCity,
        clientFacingDescription: item.component.clientFacingDescription,
        whatsIncluded: item.component.whatsIncluded,
        clientDeliverable: item.component.clientDeliverable,
        clientFacingNotes: item.clientFacingNotes,
      })),
    );

    const content = generateReportContent({
      clientName: trip.client.name,
      itineraryTitle: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      items,
    });
    const title = defaultReportTitle(trip.name);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.report.upsert({
        where: { itineraryId: itinerary.id },
        create: { itineraryId: itinerary.id, title, content, status: "DRAFT", generatedAt: now },
        update: { title, content, status: "DRAFT", generatedAt: now },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.REPORT_GENERATED,
          entityType: "Report",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { tripId: trip.id, itemCount: items.length },
        },
        tx,
      );
    });
    return successState("Report generated from the itinerary.", refreshUrl(`/admin/trips/${trip.id}/report`));
  });
}

export async function saveReportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("report.save", formData, async () => {
    const user = await requireUser();
    const input = parseForm(reportSaveSchema, formData);
    const trip = await loadTripForMutation(input.tripId, STAFF);
    // Saving with "share" publishes it to the client portal; otherwise it stays a draft.
    const share = formData.get("intent") === "share";
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.report.upsert({
        where: { itineraryId: trip.itinerary.id },
        create: {
          itineraryId: trip.itinerary.id,
          title: input.title,
          content: input.content,
          status: share ? "PUBLISHED" : "DRAFT",
          generatedAt: now,
          publishedAt: share ? now : null,
        },
        update: {
          title: input.title,
          content: input.content,
          ...(share ? { status: "PUBLISHED", publishedAt: now } : {}),
        },
      });
      await logActivity(
        {
          action: share ? ACTIVITY_ACTIONS.REPORT_PUBLISHED : ACTIVITY_ACTIONS.REPORT_UPDATED,
          entityType: "Report",
          entityId: trip.itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { tripId: trip.id },
        },
        tx,
      );
    });
    return successState(
      share ? "Report shared with the client." : "Report saved.",
      refreshUrl(`/admin/trips/${trip.id}/report`),
    );
  });
}
