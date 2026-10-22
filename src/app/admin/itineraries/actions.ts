"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { conflict, notFound, validation } from "@/lib/errors";
import { env } from "@/lib/env";
import {
  itineraryCreateSchema,
  itineraryItemAddSchema,
  itineraryItemMoveSchema,
  itineraryItemUpdateSchema,
  itineraryUpdateSchema,
  reportSaveSchema,
  changeRequestResolveSchema,
} from "@/lib/validation/schemas";
import { dayNumberFor, parseDateInput } from "@/domain/shared/dates";
import {
  assertEditable,
  assertTransition,
  humanStatus,
} from "@/domain/itineraries/status";
import { validateItineraryForPublication } from "@/domain/itineraries/validation";
import {
  defaultReportTitle,
  generateReportContent,
  type ReportItem,
} from "@/domain/reports/generate";
import { nextSequenceForDay } from "@/domain/itineraries/queries";
import {
  parseForm,
  runAction,
  successState,
  type FormState,
} from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import { refreshUrl } from "@/lib/refresh-url";
import {
  buildInviteUrl,
  accessTokenExpiry,
  generateAccessToken,
  hashAccessToken,
} from "@/lib/auth/access-token";
import { sendProposalPublishedEmail } from "@/lib/services/notifications";

/**
 * Loads an itinerary for mutation. Every mutating action goes through this so
 * "does it exist?" is answered in exactly one place.
 */
async function loadForMutation(itineraryId: string) {
  const itinerary = await prisma.itinerary.findUnique({
    where: { id: itineraryId },
    select: {
      id: true,
      clientId: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!itinerary) throw notFound("That itinerary");
  return itinerary;
}

/** Recomputes dayNumber for every item after the trip start date changes. */
async function resyncDayNumbers(
  tx: Prisma.TransactionClient,
  itineraryId: string,
  startDate: Date | null,
) {
  const items = await tx.itineraryItem.findMany({
    where: { itineraryId },
    select: { id: true, scheduledDate: true, dayNumber: true },
  });

  for (const item of items) {
    const nextDayNumber =
      startDate && item.scheduledDate
        ? dayNumberFor(startDate, item.scheduledDate)
        : null;
    if (nextDayNumber !== item.dayNumber) {
      await tx.itineraryItem.update({
        where: { id: item.id },
        data: { dayNumber: nextDayNumber },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

export async function createItineraryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await runAction("itinerary.create", formData, async () => {
    const user = await requireUser();
    const input = parseForm(itineraryCreateSchema, formData);

    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
      select: { id: true, tripStartDate: true, tripEndDate: true },
    });
    if (!client) {
      throw validation("Choose an existing client.", {
        clientId: ["That client no longer exists."],
      });
    }

    // Default the itinerary window to the client's recorded trip window.
    const startDate = input.startDate
      ? parseDateInput(input.startDate)
      : client.tripStartDate;
    const endDate = input.endDate
      ? parseDateInput(input.endDate)
      : client.tripEndDate;

    const itinerary = await prisma.$transaction(async (tx) => {
      const created = await tx.itinerary.create({
        data: {
          clientId: input.clientId,
          title: input.title,
          startDate,
          endDate,
          adminNotes: input.adminNotes,
          status: "DRAFT",
        },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.ITINERARY_CREATED,
          entityType: "Itinerary",
          entityId: created.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { clientId: created.clientId, title: created.title },
        },
        tx,
      );
      return created;
    });

    // A create navigates to a different route, so no refresh nonce is needed.
    return successState(
      "Itinerary created.",
      `/admin/itineraries/${itinerary.id}`,
    );
  });

  return result;
}

export async function updateItineraryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("itinerary.update", formData, async () => {
    const user = await requireUser();
    const input = parseForm(itineraryUpdateSchema, formData);
    const itinerary = await loadForMutation(input.itineraryId);
    assertEditable(itinerary.status);

    const startDate = input.startDate ? parseDateInput(input.startDate) : null;
    const endDate = input.endDate ? parseDateInput(input.endDate) : null;

    await prisma.$transaction(async (tx) => {
      await tx.itinerary.update({
        where: { id: itinerary.id },
        data: {
          title: input.title,
          startDate,
          endDate,
          adminNotes: input.adminNotes,
          clientNotes: input.clientNotes,
        },
      });
      await resyncDayNumbers(tx, itinerary.id, startDate);
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.ITINERARY_UPDATED,
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
        },
        tx,
      );
    });
    return successState(
      "Trip details saved.",
      refreshUrl(`/admin/itineraries/${itinerary.id}`),
    );
  });
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function addItineraryItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("itinerary.item.add", formData, async () => {
    const user = await requireUser();
    const input = parseForm(itineraryItemAddSchema, formData);
    const itinerary = await loadForMutation(input.itineraryId);
    assertEditable(itinerary.status);

    const component = await prisma.component.findUnique({
      where: { id: input.componentId },
      select: { id: true, name: true, status: true },
    });
    if (!component) throw notFound("That component");
    if (component.status !== "ACTIVE") {
      throw conflict(
        `"${component.name}" is deactivated and cannot be added to a proposal.`,
      );
    }

    const scheduledDate = input.scheduledDate
      ? parseDateInput(input.scheduledDate)
      : null;
    const dayNumber =
      scheduledDate && itinerary.startDate
        ? dayNumberFor(itinerary.startDate, scheduledDate)
        : null;

    await prisma.$transaction(async (tx) => {
      const sequence = await nextSequenceForDay(itinerary.id, dayNumber, tx);
      const item = await tx.itineraryItem.create({
        data: {
          itineraryId: itinerary.id,
          componentId: component.id,
          scheduledDate,
          dayNumber,
          sequence,
          status: "PLANNED",
        },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.ITINERARY_ITEM_ADDED,
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { itemId: item.id, componentId: component.id },
        },
        tx,
      );
    });

    return successState(
      "Component added.",
      refreshUrl(`/admin/itineraries/${itinerary.id}`),
    );
  });
}

export async function updateItineraryItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("itinerary.item.update", formData, async () => {
    const user = await requireUser();
    const input = parseForm(itineraryItemUpdateSchema, formData);

    const item = await prisma.itineraryItem.findUnique({
      where: { id: input.itemId },
      select: { id: true, itineraryId: true },
    });
    if (!item) throw notFound("That itinerary item");

    const itinerary = await loadForMutation(item.itineraryId);
    assertEditable(itinerary.status);

    const scheduledDate = input.scheduledDate
      ? parseDateInput(input.scheduledDate)
      : null;
    const dayNumber =
      scheduledDate && itinerary.startDate
        ? dayNumberFor(itinerary.startDate, scheduledDate)
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.itineraryItem.update({
        where: { id: item.id },
        data: {
          scheduledDate,
          dayNumber,
          customTitle: input.customTitle,
          clientFacingNotes: input.clientFacingNotes,
          internalNotes: input.internalNotes,
          priceOverride:
            input.priceOverride === null
              ? null
              : new Prisma.Decimal(Number(input.priceOverride).toFixed(2)),
          status: input.status,
        },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.ITINERARY_ITEM_UPDATED,
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { itemId: item.id, status: input.status },
        },
        tx,
      );
    });
    return successState(
      "Item updated.",
      refreshUrl(`/admin/itineraries/${itinerary.id}`),
    );
  });
}

export async function removeItineraryItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("itinerary.item.remove", formData, async () => {
    const user = await requireUser();
    const itemId = String(formData.get("itemId") ?? "");

    const item = await prisma.itineraryItem.findUnique({
      where: { id: itemId },
      select: { id: true, itineraryId: true },
    });
    if (!item) throw notFound("That itinerary item");

    const itinerary = await loadForMutation(item.itineraryId);
    assertEditable(itinerary.status);

    await prisma.$transaction(async (tx) => {
      // Hard delete: a draft item the admin removed has no audit value beyond the
      // log entry, and keeping it would clutter the builder. ChangeRequest rows
      // referencing it survive via onDelete: SetNull.
      await tx.itineraryItem.delete({ where: { id: itemId } });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.ITINERARY_ITEM_REMOVED,
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { itemId },
        },
        tx,
      );
    });

    return successState("Item removed.", `/admin/itineraries/${itinerary.id}`);
  });
}

/** Moves an item within its day by swapping sequence with its neighbour. */
export async function moveItineraryItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("itinerary.item.move", formData, async () => {
    const user = await requireUser();
    const input = parseForm(itineraryItemMoveSchema, formData);

    const item = await prisma.itineraryItem.findUnique({
      where: { id: input.itemId },
      select: { id: true, itineraryId: true, dayNumber: true, sequence: true },
    });
    if (!item) throw notFound("That itinerary item");

    const itinerary = await loadForMutation(item.itineraryId);
    assertEditable(itinerary.status);

    await prisma.$transaction(async (tx) => {
      const siblings = await tx.itineraryItem.findMany({
        where: { itineraryId: item.itineraryId, dayNumber: item.dayNumber },
        orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });

      const index = siblings.findIndex((sibling) => sibling.id === item.id);
      const targetIndex = input.direction === "up" ? index - 1 : index + 1;
      if (index === -1 || targetIndex < 0 || targetIndex >= siblings.length)
        return;

      const reordered = [...siblings];
      [reordered[index], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[index],
      ];

      for (const [position, sibling] of reordered.entries()) {
        await tx.itineraryItem.update({
          where: { id: sibling.id },
          data: { sequence: position },
        });
      }

      await logActivity(
        {
          action: ACTIVITY_ACTIONS.ITINERARY_ITEM_REORDERED,
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { itemId: item.id, direction: input.direction },
        },
        tx,
      );
    });

    return successState(
      "Itinerary reordered.",
      refreshUrl(`/admin/itineraries/${itinerary.id}`),
    );
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/**
 * Generates (or regenerates) the What-to-Expect report from itinerary data.
 * Regenerating overwrites admin edits, so the UI asks for confirmation.
 */
export async function generateReportAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("report.generate", formData, async () => {
    const user = await requireUser();
    const itineraryId = String(formData.get("itineraryId") ?? "");

    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: {
        client: { select: { name: true } },
        report: { select: { id: true } },
        items: {
          where: { status: { not: "REMOVED" } },
          orderBy: [{ dayNumber: "asc" }, { sequence: "asc" }],
          include: {
            component: {
              include: {
                vendor: { select: { name: true, hqCity: true } },
                catalogue: {
                  select: { name: true, module: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!itinerary) throw notFound("That itinerary");
    assertEditable(itinerary.status);

    const items: ReportItem[] = itinerary.items.map((item) => ({
      dayNumber: item.dayNumber,
      scheduledDate: item.scheduledDate,
      title: item.customTitle?.trim() || item.component.name,
      moduleName: item.component.catalogue.module.name,
      catalogueName: item.component.catalogue.name,
      vendorName: item.component.vendor.name,
      vendorLocation: item.component.vendor.hqCity,
      clientFacingDescription: item.component.clientFacingDescription,
      whatsIncluded: item.component.whatsIncluded,
      clientDeliverable: item.component.clientDeliverable,
      clientFacingNotes: item.clientFacingNotes,
    }));

    const content = generateReportContent({
      clientName: itinerary.client.name,
      itineraryTitle: itinerary.title,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      items,
    });
    const title = defaultReportTitle(itinerary.title);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.report.upsert({
        where: { itineraryId: itinerary.id },
        create: {
          itineraryId: itinerary.id,
          title,
          content,
          status: "DRAFT",
          generatedAt: now,
        },
        update: { title, content, status: "DRAFT", generatedAt: now },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.REPORT_GENERATED,
          entityType: "Report",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { itineraryId: itinerary.id, itemCount: items.length },
        },
        tx,
      );
    });
    return successState(
      "Report generated from the itinerary.",
      refreshUrl(`/admin/itineraries/${itinerary.id}/report`),
    );
  });
}

export async function saveReportAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("report.save", formData, async () => {
    const user = await requireUser();
    const input = parseForm(reportSaveSchema, formData);
    const itinerary = await loadForMutation(input.itineraryId);
    assertEditable(itinerary.status);

    await prisma.$transaction(async (tx) => {
      await tx.report.upsert({
        where: { itineraryId: itinerary.id },
        create: {
          itineraryId: itinerary.id,
          title: input.title,
          content: input.content,
          status: "DRAFT",
          generatedAt: new Date(),
        },
        update: { title: input.title, content: input.content },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.REPORT_UPDATED,
          entityType: "Report",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
        },
        tx,
      );
    });
    return successState(
      "Report saved.",
      refreshUrl(`/admin/itineraries/${itinerary.id}/report`),
    );
  });
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

/**
 * Publishes the proposal to the client.
 *
 * Runs the full validation suite first and refuses on any issue - nothing is
 * silently repaired. Publishing also publishes the report and, if the client
 * has never been invited, issues a portal link so the email is actionable.
 */
export async function publishItineraryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("itinerary.publish", formData, async () => {
    const user = await requireUser();
    const itineraryId = String(formData.get("itineraryId") ?? "");

    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: {
        client: true,
        report: true,
        items: { include: { component: true } },
      },
    });
    if (!itinerary) throw notFound("That itinerary");

    if (
      !["DRAFT", "READY_FOR_REVIEW", "CHANGES_REQUESTED"].includes(
        itinerary.status,
      )
    ) {
      throw conflict(
        `This itinerary is ${humanStatus(itinerary.status)} and cannot be published from here.`,
      );
    }

    const result = validateItineraryForPublication({
      title: itinerary.title,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      client: { id: itinerary.client.id, name: itinerary.client.name },
      items: itinerary.items.map((item) => ({
        id: item.id,
        scheduledDate: item.scheduledDate,
        status: item.status,
        customTitle: item.customTitle,
        component: {
          id: item.component.id,
          name: item.component.name,
          status: item.component.status,
        },
      })),
    });

    if (!result.ok) {
      throw validation(
        `This proposal cannot be published yet: ${result.issues.length} issue${result.issues.length === 1 ? "" : "s"} to resolve.`,
        { _form: result.issues.map((issue) => issue.message) },
      );
    }

    const isRepublish = Boolean(itinerary.publishedAt);
    const now = new Date();

    // Issue portal access if the client has never been invited, so the
    // notification link works immediately.
    let inviteToken: string | null = null;
    if (!itinerary.client.accessTokenHash) inviteToken = generateAccessToken();

    await prisma.$transaction(async (tx) => {
      assertTransition(itinerary.status, "PUBLISHED");

      await tx.itinerary.update({
        where: { id: itinerary.id },
        data: {
          status: "PUBLISHED",
          publishedAt: now,
          // A re-publication supersedes any previous approval.
          approvedAt: null,
        },
      });

      if (itinerary.report) {
        await tx.report.update({
          where: { itineraryId: itinerary.id },
          data: { status: "PUBLISHED", publishedAt: now },
        });
        await logActivity(
          {
            action: ACTIVITY_ACTIONS.REPORT_PUBLISHED,
            entityType: "Report",
            entityId: itinerary.id,
            actorUserId: user.id,
            actorLabel: user.name,
          },
          tx,
        );
      }

      if (inviteToken) {
        await tx.client.update({
          where: { id: itinerary.clientId },
          data: {
            accessTokenHash: hashAccessToken(inviteToken),
            accessTokenIssuedAt: now,
            accessTokenExpiresAt: accessTokenExpiry(now),
          },
        });
      }

      if (
        itinerary.client.status === "LEAD" ||
        itinerary.client.status === "INTAKE" ||
        itinerary.client.status === "PLANNING"
      ) {
        await tx.client.update({
          where: { id: itinerary.clientId },
          data: { status: "PROPOSAL_SENT" },
        });
      }

      await logActivity(
        {
          action: isRepublish
            ? ACTIVITY_ACTIONS.ITINERARY_REPUBLISHED
            : ACTIVITY_ACTIONS.ITINERARY_PUBLISHED,
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { itemCount: itinerary.items.length },
        },
        tx,
      );
    });

    // Notification is fire-and-forget by design: a mail failure must not undo a
    // successful publication.
    await sendProposalPublishedEmail({
      to: itinerary.client.email,
      clientName: itinerary.client.name,
      itineraryTitle: itinerary.title,
      inviteUrl: inviteToken
        ? buildInviteUrl(env().APP_URL, inviteToken)
        : `${env().APP_URL.replace(/\/$/, "")}/trip`,
    });
    return successState(
      isRepublish
        ? "Revised proposal published. The client has been notified."
        : "Proposal published. The client has been notified.",
      refreshUrl(`/admin/itineraries/${itinerary.id}`),
    );
  });
}

/**
 * Pulls a published proposal back to DRAFT so it can be edited safely.
 * This is the explicit alternative to editing live client-facing content.
 */
export async function unpublishItineraryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("itinerary.unpublish", formData, async () => {
    const user = await requireUser();
    const itineraryId = String(formData.get("itineraryId") ?? "");
    const itinerary = await loadForMutation(itineraryId);

    assertTransition(itinerary.status, "DRAFT");

    await prisma.$transaction(async (tx) => {
      await tx.itinerary.update({
        where: { id: itinerary.id },
        data: { status: "DRAFT" },
      });
      await tx.report.updateMany({
        where: { itineraryId: itinerary.id },
        data: { status: "DRAFT" },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.ITINERARY_UNPUBLISHED,
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { from: itinerary.status },
        },
        tx,
      );
    });
    return successState(
      "Moved back to Draft. The client can no longer see this proposal while you edit it.",
      refreshUrl(`/admin/itineraries/${itinerary.id}`),
    );
  });
}

export async function setReadyForReviewAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("itinerary.ready", formData, async () => {
    const user = await requireUser();
    const itineraryId = String(formData.get("itineraryId") ?? "");
    const itinerary = await loadForMutation(itineraryId);

    assertTransition(itinerary.status, "READY_FOR_REVIEW");

    await prisma.$transaction(async (tx) => {
      await tx.itinerary.update({
        where: { id: itinerary.id },
        data: { status: "READY_FOR_REVIEW" },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.ITINERARY_STATUS_CHANGED,
          entityType: "Itinerary",
          entityId: itinerary.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { status: "READY_FOR_REVIEW" },
        },
        tx,
      );
    });
    return successState(
      "Marked ready for internal review.",
      refreshUrl(`/admin/itineraries/${itinerary.id}`),
    );
  });
}

// ---------------------------------------------------------------------------
// Change requests
// ---------------------------------------------------------------------------

export async function resolveChangeRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("change_request.resolve", formData, async () => {
    const user = await requireUser();
    const input = parseForm(changeRequestResolveSchema, formData);

    const request = await prisma.changeRequest.findUnique({
      where: { id: input.changeRequestId },
      select: { id: true, itineraryId: true, status: true },
    });
    if (!request) throw notFound("That change request");
    if (request.status === "RESOLVED") {
      return successState("That change request was already resolved.");
    }

    const itinerary = await loadForMutation(request.itineraryId);

    await prisma.$transaction(async (tx) => {
      await tx.changeRequest.update({
        where: { id: request.id },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.CHANGE_REQUEST_RESOLVED,
          entityType: "ChangeRequest",
          entityId: request.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { itineraryId: itinerary.id },
        },
        tx,
      );
    });
    return successState(
      "Change request resolved.",
      refreshUrl(`/admin/itineraries/${itinerary.id}/changes`),
    );
  });
}
