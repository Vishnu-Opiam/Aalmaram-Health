import "server-only";
import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { assertBookingTransition } from "@/domain/bookings/status";

/**
 * Staff record a block's booking outcome (PLAN.md P6.4, recorded by hand
 * until the booking agent exists). Only a confirmed itinerary is booked; the
 * Booking row is created on the first recorded outcome.
 *
 * shortcut: payment is not tracked yet (Phase 5), so booking is not gated on
 * it — gate on Trip.status BOOKING once payments land.
 */
export async function setBookingStatus(blockId: string, status: BookingStatus) {
  const block = await prisma.itineraryItem.findUnique({
    where: { id: blockId },
    select: {
      id: true,
      booking: { select: { status: true } },
      itinerary: { select: { tripId: true, confirmedAt: true } },
    },
  });
  if (!block) throw notFound("That block");
  if (!block.itinerary.confirmedAt) {
    throw conflict("Bookings are recorded once the client has confirmed the itinerary.");
  }
  const from = block.booking?.status ?? "PENDING";
  assertBookingTransition(from, status);
  await prisma.booking.upsert({
    where: { itineraryItemId: block.id },
    create: { itineraryItemId: block.id, status },
    update: { status },
  });
  return { tripId: block.itinerary.tripId, from };
}
