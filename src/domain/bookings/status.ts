import type { BookingStatus } from "@prisma/client";
import { conflict } from "@/lib/errors";

/**
 * One booking per block (PLAN.md P6.1):
 *
 *   PENDING ──► REQUESTED ──► CONFIRMED
 *                   │  ▲
 *                   ▼  │ (new time or branch)
 *                DECLINED
 *
 *   any ──► CANCELLED
 *
 * Staff may also record CONFIRMED straight from PENDING (a vendor confirmed
 * by phone before a request was logged).
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["REQUESTED", "CONFIRMED", "CANCELLED"],
  REQUESTED: ["CONFIRMED", "DECLINED", "CANCELLED"],
  DECLINED: ["REQUESTED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return from === to || BOOKING_TRANSITIONS[from].includes(to);
}

export function assertBookingTransition(from: BookingStatus, to: BookingStatus) {
  if (!canTransitionBooking(from, to)) {
    throw conflict(`A booking cannot move from ${bookingStatusLabel(from)} to ${bookingStatusLabel(to)}.`);
  }
}

const LABELS: Record<BookingStatus, string> = {
  PENDING: "Not requested",
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed by provider",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

export function bookingStatusLabel(status: BookingStatus): string {
  return LABELS[status];
}

/**
 * What the client sees on a block: nothing while planning, a double tick once
 * they have confirmed the itinerary, and the big green tick once the provider
 * has confirmed the booking. Booking details never reach the client.
 */
export type BlockProgress = "planned" | "confirmed" | "booked";

export function blockProgress(itineraryConfirmed: boolean, booking: BookingStatus | null): BlockProgress {
  if (!itineraryConfirmed) return "planned";
  return booking === "CONFIRMED" ? "booked" : "confirmed";
}
