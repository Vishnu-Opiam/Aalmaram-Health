import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Lightweight audit trail.
 *
 * Privacy: metadata carries identifiers, counts and status names only. Intake
 * free text, change-request messages and report bodies are never copied here.
 */
export const ACTIVITY_ACTIONS = {
  CLIENT_CREATED: "client.created",
  CLIENT_UPDATED: "client.updated",
  CLIENT_INVITED: "client.invited",
  CLIENT_PORTAL_SIGNED_IN: "client.portal_signed_in",
  VENDOR_CREATED: "vendor.created",
  VENDOR_UPDATED: "vendor.updated",
  MODULE_CREATED: "module.created",
  MODULE_UPDATED: "module.updated",
  CATALOGUE_CREATED: "catalogue.created",
  CATALOGUE_UPDATED: "catalogue.updated",
  COMPONENT_CREATED: "component.created",
  COMPONENT_UPDATED: "component.updated",
  ITINERARY_CREATED: "itinerary.created",
  ITINERARY_UPDATED: "itinerary.updated",
  ITINERARY_ITEM_ADDED: "itinerary.item_added",
  ITINERARY_ITEM_UPDATED: "itinerary.item_updated",
  ITINERARY_ITEM_REMOVED: "itinerary.item_removed",
  ITINERARY_ITEM_REORDERED: "itinerary.item_reordered",
  ITINERARY_PUBLISHED: "itinerary.published",
  ITINERARY_UNPUBLISHED: "itinerary.unpublished",
  ITINERARY_REPUBLISHED: "itinerary.republished",
  ITINERARY_STATUS_CHANGED: "itinerary.status_changed",
  REPORT_GENERATED: "report.generated",
  REPORT_UPDATED: "report.updated",
  REPORT_PUBLISHED: "report.published",
  CLIENT_APPROVED: "client.approved_itinerary",
  CHANGE_REQUEST_SUBMITTED: "change_request.submitted",
  CHANGE_REQUEST_RESOLVED: "change_request.resolved",
} as const;

export type ActivityAction =
  (typeof ACTIVITY_ACTIONS)[keyof typeof ACTIVITY_ACTIONS];

export type ActivityEntity =
  | "Client"
  | "Vendor"
  | "Module"
  | "Catalogue"
  | "Component"
  | "Itinerary"
  | "ItineraryItem"
  | "Report"
  | "ChangeRequest";

export type LogActivityInput = {
  action: ActivityAction;
  entityType: ActivityEntity;
  entityId: string;
  /** Null when the actor is a client rather than an internal user. */
  actorUserId?: string | null;
  /** Human label shown in the activity feed, e.g. "Priya Menon" or "Client". */
  actorLabel: string;
  metadata?: Prisma.InputJsonValue;
};

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Writes an audit row. Never allowed to break the operation it is recording -
 * a failed audit write is logged and swallowed.
 */
export async function logActivity(
  input: LogActivityInput,
  db: Db = prisma,
): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorUserId: input.actorUserId ?? null,
        actorLabel: input.actorLabel,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    logger.error("activity log write failed", error, {
      action: input.action,
      entityType: input.entityType,
    });
  }
}

const ACTION_LABELS: Record<string, string> = {
  "client.created": "Client created",
  "client.updated": "Client details updated",
  "client.invited": "Portal invitation sent",
  "client.portal_signed_in": "Client opened their portal",
  "vendor.created": "Vendor created",
  "vendor.updated": "Vendor updated",
  "module.created": "Module created",
  "module.updated": "Module updated",
  "catalogue.created": "Catalogue created",
  "catalogue.updated": "Catalogue updated",
  "component.created": "Component created",
  "component.updated": "Component updated",
  "itinerary.created": "Itinerary created",
  "itinerary.updated": "Itinerary updated",
  "itinerary.item_added": "Component added to itinerary",
  "itinerary.item_updated": "Itinerary item updated",
  "itinerary.item_removed": "Itinerary item removed",
  "itinerary.item_reordered": "Itinerary reordered",
  "itinerary.published": "Proposal published to client",
  "itinerary.unpublished": "Proposal withdrawn for editing",
  "itinerary.republished": "Revised proposal published",
  "itinerary.status_changed": "Itinerary status changed",
  "report.generated": "What-to-Expect report generated",
  "report.updated": "What-to-Expect report edited",
  "report.published": "What-to-Expect report published",
  "client.approved_itinerary": "Client approved the itinerary",
  "change_request.submitted": "Client requested changes",
  "change_request.resolved": "Change request resolved",
};

export function activityLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
