import type { TripStatus } from "@prisma/client";
import { conflict } from "@/lib/errors";

/**
 * Trip lifecycle (class diagram v1):
 *
 *   PLANNING ──confirm──► AWAITING_PAYMENT ──paid──► BOOKING ──► READY ──► IN_PROGRESS ──► COMPLETED
 *       │                       │                     │           │
 *       └───────────────────────┴─────────────────────┴───────────┴──────► CANCELLED
 *
 * Confirm → lock → pay → book: once the client confirms, the itinerary is
 * locked (`Itinerary.confirmedAt`) and changes go through the relationship
 * manager. AWAITING_PAYMENT can fall back to PLANNING when the relationship
 * manager reopens the itinerary before anything is paid.
 */
export const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  PLANNING: ["AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["PLANNING", "BOOKING", "CANCELLED"],
  BOOKING: ["READY", "CANCELLED"],
  READY: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return from === to || TRIP_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: TripStatus, to: TripStatus) {
  if (!canTransition(from, to)) {
    throw conflict(`A trip cannot move from ${tripStatusLabel(from)} to ${tripStatusLabel(to)}.`);
  }
}

/** Blocks can only change while the trip is being planned and not yet confirmed. */
export function isItineraryEditable(status: TripStatus, confirmedAt: Date | null): boolean {
  return status === "PLANNING" && confirmedAt === null;
}

export function assertItineraryEditable(status: TripStatus, confirmedAt: Date | null) {
  if (!isItineraryEditable(status, confirmedAt)) {
    throw conflict(
      "This itinerary is confirmed and locked. Changes now go through the relationship manager.",
    );
  }
}

const LABELS: Record<TripStatus, string> = {
  PLANNING: "Planning",
  AWAITING_PAYMENT: "Awaiting payment",
  BOOKING: "Booking",
  READY: "Ready",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function tripStatusLabel(status: TripStatus): string {
  return LABELS[status];
}

export const TRIP_STATUS_OPTIONS = (Object.keys(LABELS) as TripStatus[]).map((value) => ({
  value,
  label: LABELS[value],
}));
