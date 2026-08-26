"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth/guards";
import { destroyClientSession } from "@/lib/auth/session";
import { conflict, forbidden, notFound } from "@/lib/errors";
import { env } from "@/lib/env";
import { approvalSchema, changeRequestSchema } from "@/lib/validation/schemas";
import {
  parseForm,
  runAction,
  successState,
  type FormState,
} from "@/lib/validation/form";
import { assertTransition, isClientVisible } from "@/domain/itineraries/status";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import {
  sendChangeRequestedEmail,
  sendClientApprovedEmail,
} from "@/lib/services/notifications";
import { logger } from "@/lib/logger";
import { refreshUrl } from "@/lib/refresh-url";

/**
 * Loads an itinerary that the CURRENT SESSION's client is entitled to act on.
 *
 * The itinerary id arrives from the browser and is therefore untrusted: the
 * clientId in the WHERE clause comes from the session, never from the request
 * body. A client cannot reach another client's itinerary even with a valid id.
 */
async function loadOwnedItinerary(itineraryId: string, clientId: string) {
  const itinerary = await prisma.itinerary.findFirst({
    where: { id: itineraryId, clientId },
    select: {
      id: true,
      clientId: true,
      title: true,
      status: true,
    },
  });

  if (!itinerary) {
    logger.warn("client portal: itinerary access denied");
    throw forbidden("That proposal is not available on your account.");
  }

  if (!isClientVisible(itinerary.status)) {
    throw conflict(
      "This proposal is being revised by the Aalmaram team and is not open for a decision right now.",
    );
  }

  return itinerary;
}

/** Address used for internal notifications about client decisions. */
function opsInbox() {
  return "operations@aalmaram.example";
}

export async function approveItineraryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("client.approve", formData, async () => {
    const client = await requireClient();
    const input = parseForm(approvalSchema, formData);
    const itinerary = await loadOwnedItinerary(input.itineraryId, client.id);

    if (itinerary.status === "APPROVED") {
      return successState("You have already approved this journey.");
    }

    const approvedAt = new Date();

    await prisma.$transaction(async (tx) => {
      assertTransition(itinerary.status, "APPROVED");

      await tx.itinerary.update({
        where: { id: itinerary.id },
        data: { status: "APPROVED", approvedAt },
      });

      await tx.client.update({
        where: { id: client.id },
        data: { status: "CONFIRMED" },
      });

      await logActivity(
        {
          action: ACTIVITY_ACTIONS.CLIENT_APPROVED,
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: null,
          actorLabel: client.name,
          metadata: {
            clientId: client.id,
            itineraryId: itinerary.id,
            approvedAt: approvedAt.toISOString(),
          },
        },
        tx,
      );
    });

    await sendClientApprovedEmail({
      to: opsInbox(),
      clientName: client.name,
      itineraryTitle: itinerary.title,
      adminUrl: `${env().APP_URL.replace(/\/$/, "")}/admin/itineraries/${itinerary.id}`,
    });
    return successState(
      "Thank you - your journey is approved. The Aalmaram team will confirm each element with the providers and be in touch.",
      refreshUrl("/trip"),
    );
  });
}

export async function requestChangesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("client.request_changes", formData, async () => {
    const client = await requireClient();
    const input = parseForm(changeRequestSchema, formData);
    const itinerary = await loadOwnedItinerary(input.itineraryId, client.id);

    // An item id is also untrusted input: verify it belongs to THIS itinerary.
    let itineraryItemId: string | null = null;
    if (input.itineraryItemId) {
      const item = await prisma.itineraryItem.findFirst({
        where: { id: input.itineraryItemId, itineraryId: itinerary.id },
        select: { id: true },
      });
      if (!item) throw notFound("That item of your journey");
      itineraryItemId = item.id;
    }

    await prisma.$transaction(async (tx) => {
      const request = await tx.changeRequest.create({
        data: {
          itineraryId: itinerary.id,
          itineraryItemId,
          message: input.message,
          status: "OPEN",
        },
      });

      if (itinerary.status !== "CHANGES_REQUESTED") {
        assertTransition(itinerary.status, "CHANGES_REQUESTED");
        await tx.itinerary.update({
          where: { id: itinerary.id },
          data: { status: "CHANGES_REQUESTED", approvedAt: null },
        });
      }

      await logActivity(
        {
          action: ACTIVITY_ACTIONS.CHANGE_REQUEST_SUBMITTED,
          entityType: "ChangeRequest",
          entityId: request.id,
          actorUserId: null,
          actorLabel: client.name,
          // The message body is intentionally NOT copied into the audit log.
          metadata: {
            itineraryId: itinerary.id,
            scope: itineraryItemId ? "item" : "trip",
          },
        },
        tx,
      );
    });

    await sendChangeRequestedEmail({
      to: opsInbox(),
      clientName: client.name,
      itineraryTitle: itinerary.title,
      scope: itineraryItemId
        ? "A specific element of the journey"
        : "The whole trip",
      adminUrl: `${env().APP_URL.replace(/\/$/, "")}/admin/itineraries/${itinerary.id}/changes`,
    });
    return successState(
      "Thank you - we have received your request. Your Aalmaram coordinator will revise the proposal and send you an updated version.",
      refreshUrl("/trip"),
    );
  });
}

export async function signOutClientAction() {
  await destroyClientSession();
  redirect("/trip/sign-in?error=signed_out");
}
