import type { ItineraryStatus } from "@prisma/client";
import { conflict } from "@/lib/errors";

/**
 * Itinerary lifecycle.
 *
 *   DRAFT ──────────────► READY_FOR_REVIEW ──────► PUBLISHED
 *     ▲                        │                    │   │
 *     │                        ▼                    │   ▼
 *     └──────────────────── DRAFT ◄─────────────────┘  APPROVED
 *                                                      ▲
 *   PUBLISHED ──► CHANGES_REQUESTED ──► DRAFT ─┘ (re-publish)
 *
 * Editing a PUBLISHED itinerary is not silently allowed: the admin must pull it
 * back to DRAFT first, which is what keeps half-edited content away from the
 * client. See `assertEditable`.
 */
export const ITINERARY_TRANSITIONS: Record<ItineraryStatus, ItineraryStatus[]> = {
  DRAFT: ["READY_FOR_REVIEW", "PUBLISHED", "ARCHIVED"],
  READY_FOR_REVIEW: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["DRAFT", "CHANGES_REQUESTED", "APPROVED", "ARCHIVED"],
  CHANGES_REQUESTED: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  APPROVED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

/** Statuses whose content the client is allowed to see. */
export const CLIENT_VISIBLE_STATUSES = [
  "PUBLISHED",
  "CHANGES_REQUESTED",
  "APPROVED",
] as const satisfies readonly ItineraryStatus[];

export type ClientVisibleStatus = (typeof CLIENT_VISIBLE_STATUSES)[number];

/** Statuses whose items and report the admin may still edit freely. */
export const EDITABLE_STATUSES = [
  "DRAFT",
  "READY_FOR_REVIEW",
] as const satisfies readonly ItineraryStatus[];

export function canTransition(
  from: ItineraryStatus,
  to: ItineraryStatus,
): boolean {
  if (from === to) return true;
  return ITINERARY_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ItineraryStatus, to: ItineraryStatus) {
  if (!canTransition(from, to)) {
    throw conflict(
      `An itinerary cannot move from ${humanStatus(from)} to ${humanStatus(to)}.`,
    );
  }
}

export function isClientVisible(status: ItineraryStatus): boolean {
  return (CLIENT_VISIBLE_STATUSES as readonly ItineraryStatus[]).includes(status);
}

export function isEditable(status: ItineraryStatus): boolean {
  return (EDITABLE_STATUSES as readonly ItineraryStatus[]).includes(status);
}

export function assertEditable(status: ItineraryStatus) {
  if (!isEditable(status)) {
    throw conflict(
      `This itinerary is ${humanStatus(status)} and is visible to the client. Move it back to Draft before editing so the client never sees a half-finished proposal.`,
    );
  }
}

export function humanStatus(status: ItineraryStatus): string {
  const labels: Record<ItineraryStatus, string> = {
    DRAFT: "Draft",
    READY_FOR_REVIEW: "Ready for review",
    PUBLISHED: "Published",
    CHANGES_REQUESTED: "Changes requested",
    APPROVED: "Approved",
    ARCHIVED: "Archived",
  };
  return labels[status];
}

/** What the client is told, which is not the same as the internal status. */
export function clientFacingStatus(status: ItineraryStatus): {
  label: string;
  tone: "neutral" | "info" | "success" | "warning";
  description: string;
} {
  switch (status) {
    case "PUBLISHED":
      return {
        label: "Awaiting your review",
        tone: "info",
        description:
          "Your proposed journey is ready. Take your time, then approve it or tell us what you would like changed.",
      };
    case "CHANGES_REQUESTED":
      return {
        label: "Changes requested",
        tone: "warning",
        description:
          "We have received your requested changes. The Aalmaram team is revising your proposal and will share an updated version with you.",
      };
    case "APPROVED":
      return {
        label: "Approved",
        tone: "success",
        description:
          "Thank you - you have approved this journey. The Aalmaram team will be in touch to confirm the details with each provider.",
      };
    default:
      return {
        label: "In preparation",
        tone: "neutral",
        description:
          "The Aalmaram team is preparing your proposal. You will hear from us as soon as it is ready.",
      };
  }
}
