import type { BuilderTrip } from "./builder-view";

/**
 * "In your trip · Day 4": where each experience and each place already sits in
 * a trip, for Explore badges. Plain records (not Maps) so the result can be
 * passed to a client component as-is.
 */

export type TripPresence = {
  /** componentId → sorted, de-duplicated day numbers it is on. */
  byComponent: Record<string, number[]>;
  /** place (vendor) slug → sorted, de-duplicated day numbers. */
  byPlace: Record<string, number[]>;
};

export function tripPresence(trip: BuilderTrip | null): TripPresence {
  const byComponent: Record<string, number[]> = {};
  const byPlace: Record<string, number[]> = {};
  const add = (map: Record<string, number[]>, key: string, day: number) => {
    const days = (map[key] ??= []);
    if (!days.includes(day)) days.push(day);
  };
  for (const day of trip?.days ?? []) {
    for (const block of day.blocks) {
      add(byComponent, block.componentId, day.dayNumber);
      add(byPlace, block.place.slug, day.dayNumber);
    }
  }
  for (const days of [...Object.values(byComponent), ...Object.values(byPlace)]) days.sort((a, b) => a - b);
  return { byComponent, byPlace };
}
