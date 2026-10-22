import "server-only";
import type { TripStatus } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { toUtcDay } from "@/domain/shared/dates";

export type PortalTrip = { id: string; name: string; startDate: Date; endDate: Date; status: TripStatus };

/** The client's own, non-cancelled trips, soonest first. */
export const loadPortalTrips = cache(async (clientId: string): Promise<PortalTrip[]> =>
  prisma.trip.findMany({
    where: { clientId, status: { not: "CANCELLED" } },
    orderBy: { startDate: "asc" },
    select: { id: true, name: true, startDate: true, endDate: true, status: true },
  }),
);

/**
 * The trip a portal page shows: the one asked for (if it is the client's own),
 * else the next one that hasn't finished, else the most recent.
 */
export function pickTrip(trips: PortalTrip[], requested: string | undefined, today = new Date()): PortalTrip | null {
  if (trips.length === 0) return null;
  const asked = requested ? trips.find((t) => t.id === requested) : undefined;
  if (asked) return asked;
  const now = toUtcDay(today).getTime();
  return trips.find((t) => t.endDate.getTime() >= now) ?? trips[trips.length - 1];
}
