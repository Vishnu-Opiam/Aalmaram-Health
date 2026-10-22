import { Prisma } from "@prisma/client";
import { addDays, daysBetweenInclusive, toUtcDay } from "@/domain/shared/dates";
import type { PriceUnit } from "@/domain/vendors/profile";

/**
 * Itinerary blocks: one component at a start time, optionally at a branch.
 *
 * Times are Kerala wall-clock times stored as "floating" UTC timestamps:
 * 09:30 on 6 Dec is stored as 2026-12-06T09:30Z and always read with UTC
 * getters, so no server or browser time zone can shift a block.
 */

/**
 * What a block costs the client: PER_PERSON × travellers, FOR_TWO × one per
 * two travellers (rounded up), PER_GROUP once.
 */
export function blockPrice(
  unitPrice: Prisma.Decimal,
  priceUnit: PriceUnit,
  travellers: number,
): Prisma.Decimal {
  const people = Math.max(1, Math.floor(travellers));
  const multiplier =
    priceUnit === "PER_PERSON" ? people : priceUnit === "FOR_TWO" ? Math.ceil(people / 2) : 1;
  return unitPrice.times(multiplier);
}

/** Combines a `YYYY-MM-DD` day and `HH:MM` time into a floating timestamp. */
export function toBlockStart(day: string, time: string): Date {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!d || !t || Number(t[1]) > 23 || Number(t[2]) > 59) {
    throw new Error(`Invalid block start: ${day} ${time}`);
  }
  return new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2])));
}

export function blockEndsAt(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

/** "09:30" */
export function formatTime(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

/** `YYYY-MM-DD` of a floating timestamp. */
export function blockDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type PlacementInput = {
  startsAt: Date;
  durationMinutes: number;
  tripStart: Date;
  tripEnd: Date;
  branch?: { vendorId: string } | null;
  componentVendorId: string;
};

/** Hard rules a block must satisfy before it is saved. Returns readable problems. */
export function placementProblems(input: PlacementInput): string[] {
  const problems: string[] = [];
  const firstDay = toUtcDay(input.tripStart).getTime();
  const lastDayEnd = addDays(input.tripEnd, 1).getTime();
  const start = input.startsAt.getTime();
  if (start < firstDay || start >= lastDayEnd) {
    problems.push("The block must start within the trip's dates.");
  }
  if (input.branch && input.branch.vendorId !== input.componentVendorId) {
    problems.push("That branch belongs to a different provider.");
  }
  return problems;
}

export type TimedBlock = { id: string; startsAt: Date; durationMinutes: number };

/** Pairs of block ids whose times overlap (a warning, not an error). */
export function findOverlaps(blocks: TimedBlock[]): [string, string][] {
  const sorted = [...blocks].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const overlaps: [string, string][] = [];
  for (let i = 0; i < sorted.length; i++) {
    const end = blockEndsAt(sorted[i].startsAt, sorted[i].durationMinutes).getTime();
    for (let j = i + 1; j < sorted.length && sorted[j].startsAt.getTime() < end; j++) {
      overlaps.push([sorted[i].id, sorted[j].id]);
    }
  }
  return overlaps;
}

export type DayGroup<T> = { date: Date; dayNumber: number; key: string; blocks: T[] };

/**
 * Every day of the trip, in order, each with its blocks sorted by time. Empty
 * days are kept — they are where the client adds things. Blocks outside the
 * trip (dates changed after placing) go to the nearest end so nothing hides.
 */
export function groupBlocksByDay<T extends { startsAt: Date }>(
  tripStart: Date,
  tripEnd: Date,
  blocks: T[],
): DayGroup<T>[] {
  const count = Math.max(1, daysBetweenInclusive(tripStart, tripEnd));
  const days: DayGroup<T>[] = Array.from({ length: count }, (_, i) => {
    const date = addDays(tripStart, i);
    return { date, dayNumber: i + 1, key: blockDay(date), blocks: [] };
  });
  for (const block of [...blocks].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
    const index = Math.min(
      count - 1,
      Math.max(0, Math.floor((toUtcDay(block.startsAt).getTime() - toUtcDay(tripStart).getTime()) / 86_400_000)),
    );
    days[index].blocks.push(block);
  }
  return days;
}

/**
 * Itinerary total. A trip is priced in one currency; if blocks disagree the
 * mix is surfaced instead of adding unlike currencies.
 */
export function itineraryTotal(blocks: { price: Prisma.Decimal; currency: string }[]) {
  const currencies = [...new Set(blocks.map((b) => b.currency))].sort();
  const total = blocks.reduce((sum, b) => sum.plus(b.price), new Prisma.Decimal(0));
  return { total, currency: currencies[0] ?? "EUR", mixedCurrencies: currencies.length > 1 };
}

/** A sensible default start time for a new block on a day: after the last block ends. */
export function suggestedStartTime(
  dayBlocks: { startsAt: Date; durationMinutes: number }[],
  fallback = "09:00",
): string {
  if (dayBlocks.length === 0) return fallback;
  const lastEnd = Math.max(...dayBlocks.map((b) => blockEndsAt(b.startsAt, b.durationMinutes).getTime()));
  const end = new Date(lastEnd);
  // Round up to the next half hour and leave a little breathing room.
  const minutes = end.getUTCHours() * 60 + end.getUTCMinutes() + 30;
  const rounded = Math.min(22 * 60, Math.ceil(minutes / 30) * 30);
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}
