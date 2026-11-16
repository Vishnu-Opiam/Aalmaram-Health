import "server-only";
import { firstName } from "@/components/portal/ui";
import { slimTrip, type ExploreContext } from "@/components/portal/explore/model";
import { tripPresence } from "@/domain/trips/in-trip";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { loadBuilderTrip } from "@/domain/trips/queries";
import type { BuilderTrip } from "@/domain/trips/builder-view";
import { prisma } from "@/lib/db";
import { param } from "@/lib/utils";

type Search = Record<string, string | string[] | undefined>;

/**
 * What both Explore pages need about the client: the trip an add goes to
 * (`?trip=` or the next one), what is already on it, who their coordinator
 * is, and the "Choosing for Day N" mode from Day by day.
 */
export async function loadExploreContext(clientId: string, search: Search) {
  const [trips, manager] = await Promise.all([
    loadPortalTrips(clientId),
    prisma.client.findUnique({ where: { id: clientId }, select: { relationshipManager: { select: { name: true } } } }),
  ]);
  const picked = pickTrip(trips, param(search, "trip") || undefined);
  const trip = picked ? await loadBuilderTrip(picked.id, { kind: "client", clientId }) : null;

  const forKey = param(search, "for");
  const slot = param(search, "slot");
  const forDay = trip?.editable ? trip.days.find((d) => d.key === forKey) : undefined;

  const context: ExploreContext = {
    trip: trip ? slimTrip(trip) : null,
    tripCount: trips.length,
    coordinator: manager?.relationshipManager ? firstName(manager.relationshipManager.name) : "your coordinator",
    inTrip: tripPresence(trip),
    choosing: forDay ? { dayKey: forDay.key, slot: /^\d{2}:\d{2}$/.test(slot) ? slot : null } : null,
  };
  return { context, trip, added: addedMessage(trip, param(search, "added")) };
}

/** "Added to Day 4" and the day's link, for the toast after an add came back here. */
function addedMessage(trip: BuilderTrip | null, blockId: string) {
  if (!trip || !blockId) return null;
  const day = trip.days.find((d) => d.blocks.some((b) => b.id === blockId));
  if (!day) return null;
  const block = day.blocks.find((b) => b.id === blockId)!;
  return {
    marker: blockId,
    text: `Added to Day ${day.dayNumber} · ${block.title}`,
    componentId: block.componentId,
    href: `/trip/itinerary?trip=${encodeURIComponent(trip.id)}&day=${day.key}`,
    dayNumber: day.dayNumber,
  };
}
