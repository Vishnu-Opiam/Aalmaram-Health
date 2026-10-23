"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth/guards";
import { destroyClientSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { blockAddSchema, blockMoveSchema, blockPlaceSchema, blockRemoveSchema } from "@/lib/validation/schemas";
import { parseForm, runAction, successState, type FormState } from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import {
  addBlock,
  confirmItinerary,
  loadTripForMutation,
  moveBlock,
  removeBlock,
} from "@/lib/services/itinerary-blocks";
import {
  draftItinerary,
  extractRequirements,
  placeOnDay,
  sendChatMessage,
  suggestionsForSlot,
} from "@/lib/services/ai-planning";
import type { SlotSuggestion } from "@/domain/ai/planner";
import type { ChatMessage } from "@/domain/ai/chat";
import { chatMessageSchema } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/rate-limit";
import { toUserMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { OPS_INBOX, sendStaffTripNotice } from "@/lib/services/notifications";
import { refreshUrl } from "@/lib/refresh-url";

/**
 * Client portal writes. The client comes from the session; every trip and
 * block id from the browser is re-checked against it in the block service,
 * which also keeps the team's health core out of the client's reach.
 */

const itineraryUrl = (tripId: string, hash = "") =>
  `${refreshUrl(`/trip/itinerary?trip=${encodeURIComponent(tripId)}`)}${hash}`;

export async function addClientBlockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("portal.block.add", formData, async () => {
    const client = await requireClient();
    const input = parseForm(blockAddSchema, formData);
    const block = await addBlock({ ...input, scope: { kind: "client", clientId: client.id }, addedBy: "CLIENT" });
    await logActivity({
      action: ACTIVITY_ACTIONS.BLOCK_ADDED,
      entityType: "Trip",
      entityId: input.tripId,
      actorLabel: client.name,
      metadata: { blockId: block.id, componentId: input.componentId, addedBy: "CLIENT" },
    });
    return successState("Added to your trip.", itineraryUrl(input.tripId, `#day-${input.day}`));
  });
}

/** An idea dropped on a day (or "Add" pressed): the server picks the time. */
export async function placeClientIdeaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("portal.block.place", formData, async () => {
    const client = await requireClient();
    const input = parseForm(blockPlaceSchema, formData);
    const block = await placeOnDay(input.tripId, { kind: "client", clientId: client.id }, input.componentId, input.day);
    await logActivity({
      action: ACTIVITY_ACTIONS.BLOCK_ADDED,
      entityType: "Trip",
      entityId: input.tripId,
      actorLabel: client.name,
      metadata: { blockId: block.id, componentId: input.componentId, addedBy: "CLIENT" },
    });
    return successState("Added to your trip.", itineraryUrl(input.tripId, `#day-${input.day}`));
  });
}

export async function moveClientBlockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("portal.block.move", formData, async () => {
    const client = await requireClient();
    const input = parseForm(blockMoveSchema, formData);
    const { tripId } = await moveBlock({ ...input, scope: { kind: "client", clientId: client.id } });
    await logActivity({
      action: ACTIVITY_ACTIONS.BLOCK_MOVED,
      entityType: "Trip",
      entityId: tripId,
      actorLabel: client.name,
      metadata: { blockId: input.blockId },
    });
    return successState("Moved.", itineraryUrl(tripId, `#day-${input.day}`));
  });
}

export async function removeClientBlockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("portal.block.remove", formData, async () => {
    const client = await requireClient();
    const input = parseForm(blockRemoveSchema, formData);
    const { tripId } = await removeBlock({ ...input, scope: { kind: "client", clientId: client.id } });
    await logActivity({
      action: ACTIVITY_ACTIONS.BLOCK_REMOVED,
      entityType: "Trip",
      entityId: tripId,
      actorLabel: client.name,
      metadata: { blockId: input.blockId },
    });
    return successState("Removed.", itineraryUrl(tripId));
  });
}

/** The client's explicit "Confirm my itinerary": locks it ahead of payment and booking. */
export async function confirmItineraryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("portal.itinerary.confirm", formData, async () => {
    const client = await requireClient();
    const tripId = String(formData.get("tripId") ?? "");
    const { trip, blocks } = await confirmItinerary(tripId, { kind: "client", clientId: client.id });

    await logActivity({
      action: ACTIVITY_ACTIONS.ITINERARY_CONFIRMED,
      entityType: "Trip",
      entityId: trip.id,
      actorLabel: client.name,
      metadata: { blocks },
    });
    const manager = await prisma.client.findUnique({
      where: { id: client.id },
      select: { relationshipManager: { select: { email: true } } },
    });
    await sendStaffTripNotice({
      to: manager?.relationshipManager?.email ?? OPS_INBOX,
      subject: "Itinerary confirmed",
      clientName: client.name,
      tripName: trip.name,
      what: `${client.name} confirmed their itinerary (${blocks} activities). Next: collect payment, then book.`,
      adminUrl: `${env().APP_URL.replace(/\/$/, "")}/admin/trips/${trip.id}`,
    });
    return successState("Thank you — your itinerary is confirmed.", itineraryUrl(trip.id));
  });
}

// ---------------------------------------------------------------------------
// AI: suggestions, chat, "Build my itinerary", "Talk to a person"
// ---------------------------------------------------------------------------

/** Ideas for a "+" in the client's builder. */
export async function suggestForClientSlot(tripId: string, day: string, time: string) {
  const client = await requireClient();
  return suggestionsForSlot(tripId, { kind: "client", clientId: client.id }, day, time);
}

export type ChatState = {
  messages: ChatMessage[];
  readyToBuild: boolean;
  suggestions: SlotSuggestion[];
  error: string | null;
};

export async function sendChatMessageAction(prev: ChatState, formData: FormData): Promise<ChatState> {
  try {
    const client = await requireClient();
    const input = chatMessageSchema.safeParse({ tripId: formData.get("tripId"), text: formData.get("text") });
    if (!input.success) return { ...prev, error: input.error.issues[0]?.message ?? "Please write a message." };
    await enforceRateLimit(`chat:${client.id}`, 30, 10 * 60_000);
    const result = await sendChatMessage(input.data.tripId, client.id, input.data.text);
    return { ...result, error: null };
  } catch (error) {
    logger.warn("portal chat failed", { code: (error as { code?: string })?.code });
    return { ...prev, error: toUserMessage(error) };
  }
}

async function notifyManager(clientId: string, trip: { id: string; name: string }, subject: string, what: string) {
  const record = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true, relationshipManager: { select: { email: true } } },
  });
  await sendStaffTripNotice({
    to: record?.relationshipManager?.email ?? OPS_INBOX,
    subject,
    clientName: record?.name ?? "A client",
    tripName: trip.name,
    what,
    adminUrl: `${env().APP_URL.replace(/\/$/, "")}/admin/trips/${trip.id}`,
  });
}

/**
 * Chat → requirements (unless the team has already written them) → AI
 * blocks around the health core. The result is a draft the client edits and
 * must still confirm; the relationship manager is told so they can review it.
 */
export async function buildMyItineraryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("portal.ai.build", formData, async () => {
    const client = await requireClient();
    const tripId = String(formData.get("tripId") ?? "");
    const scope = { kind: "client" as const, clientId: client.id };
    await enforceRateLimit(`build:${client.id}`, 5, 10 * 60_000);
    const hasConversation = await prisma.conversation.count({ where: { tripId, clientId: client.id } });
    if (hasConversation) await extractRequirements(tripId, { scope }, { overwrite: false });
    const { added, trip } = await draftItinerary(tripId, { scope });
    await logActivity({
      action: ACTIVITY_ACTIONS.AI_ITINERARY_DRAFTED,
      entityType: "Trip",
      entityId: trip.id,
      actorLabel: client.name,
      metadata: { added, by: "client" },
    });
    await notifyManager(client.id, trip, "AI draft ready", `${client.name} asked the assistant for an itinerary: ${added} suggested activities were added around the health core. Please review.`);
    return successState(`${added} suggestions added to your itinerary.`, itineraryUrl(trip.id));
  });
}

export async function talkToPersonAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("portal.ai.person", formData, async () => {
    const client = await requireClient();
    const trip = await loadTripForMutation(String(formData.get("tripId") ?? ""), { kind: "client", clientId: client.id });
    await logActivity({
      action: ACTIVITY_ACTIONS.CLIENT_ASKED_FOR_PERSON,
      entityType: "Trip",
      entityId: trip.id,
      actorLabel: client.name,
    });
    await notifyManager(client.id, trip, "Client asked for a person", `${client.name} would like to talk to a person. Please get in touch.`);
    return successState(
      "We've let your relationship manager know — they will be in touch shortly.",
      itineraryUrl(trip.id),
    );
  });
}

export async function signOutClientAction() {
  await destroyClientSession();
  redirect("/trip/sign-in?error=signed_out");
}
