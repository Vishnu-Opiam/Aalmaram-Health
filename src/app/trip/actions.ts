"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth/guards";
import { destroyClientSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { blockAddSchema, blockMoveSchema, blockRemoveSchema } from "@/lib/validation/schemas";
import { parseForm, runAction, successState, type FormState } from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import { addBlock, confirmItinerary, moveBlock, removeBlock } from "@/lib/services/itinerary-blocks";
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

export async function signOutClientAction() {
  await destroyClientSession();
  redirect("/trip/sign-in?error=signed_out");
}
