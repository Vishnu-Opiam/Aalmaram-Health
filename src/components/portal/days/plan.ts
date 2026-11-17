import { PHOTOS } from "@/app/(site)/content";
import type { PhotoSource } from "@/components/portal/kit/photo";
import { formatMoney } from "@/domain/itineraries/pricing";
import { parseDateInput } from "@/domain/shared/dates";
import type { BuilderBlock, BuilderDay, BuilderTrip, LibraryComponent, PlacePhoto } from "@/domain/trips/builder-view";

/**
 * Day by day, as plain functions: free time between activities, which ideas
 * fit it, day states and runs of free days, and the words for dates and
 * prices. No React, so they can be checked on their own.
 */

const pad = (n: number) => String(n).padStart(2, "0");
export const toMin = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const toTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

const fmt = (key: string, options: Intl.DateTimeFormatOptions) =>
  parseDateInput(key).toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });
/** "Monday 21 December" */
export const longDay = (key: string) => fmt(key, { weekday: "long", day: "numeric", month: "long" });
/** "Monday" */
export const weekday = (key: string) => fmt(key, { weekday: "long" });
/** "Mon 21 Dec" */
export const shortDay = (key: string) => fmt(key, { weekday: "short", day: "numeric", month: "short" });

// ---------------------------------------------------------------------------
// The shape of a day
// ---------------------------------------------------------------------------

/** The last start we offer: later than this an evening runs into the night. */
export const DAY_END = 22 * 60;
/** Shorter gaps aren't offered as free time: there is nothing sensible to add. */
const MIN_GAP = 60;

export const PARTS = [
  { key: "morning", label: "Morning", start: 8 * 60, end: 12 * 60, at: 9 * 60, from: 0, to: 12 * 60 },
  { key: "afternoon", label: "Afternoon", start: 12 * 60, end: 17 * 60, at: 14 * 60, from: 12 * 60, to: 17 * 60 },
  { key: "evening", label: "Evening", start: 17 * 60, end: DAY_END, at: 18 * 60 + 30, from: 17 * 60, to: 24 * 60 },
] as const;
export type Part = (typeof PARTS)[number];

export type FreeSlot = {
  kind: "free";
  /** Suggested start ("14:00"), pre-filled in the add sheet. */
  at: string;
  /** Free until (next activity's start, or the end of the day), in minutes. */
  until: number;
  from: number;
  to: number;
};
export type TimelineEntry = { kind: "block"; block: BuilderBlock } | FreeSlot;

const span = (b: BuilderBlock) => {
  const s = toMin(b.time);
  return { b, s, e: s + b.durationMinutes + (b.recoveryMinutes ?? 0) };
};

/**
 * Morning / afternoon / evening, each with its activities in order and the
 * free time around them (an hour or more). Programmes of a day or longer are
 * banners, not timeline rows, so they are left out here.
 */
export function dayTimeline(blocks: BuilderBlock[]): { part: Part; entries: TimelineEntry[] }[] {
  const timed = blocks.filter((b) => b.spanDays === 1).map(span).sort((a, z) => a.s - z.s);
  const nextStart = (after: number) => timed.find((x) => x.s >= after)?.s ?? DAY_END;
  return PARTS.map((part) => {
    let cursor = Math.max(part.start, ...timed.filter((x) => x.s < part.from).map((x) => x.e));
    const entries: TimelineEntry[] = [];
    const free = (from: number, to: number) => {
      if (to - from < MIN_GAP) return;
      // A whole free part starts at its usual hour (09:00, 14:00, 18:30); a gap after an activity, when it ends.
      const at = from <= part.start && part.at + MIN_GAP <= to ? part.at : Math.ceil(from / 15) * 15;
      if (at + 30 > Math.min(to, DAY_END)) return;
      entries.push({ kind: "free", at: toTime(at), until: nextStart(at), from, to });
    };
    for (const x of timed.filter((x) => x.s >= part.from && x.s < part.to)) {
      free(cursor, x.s);
      entries.push({ kind: "block", block: x.b });
      cursor = Math.max(cursor, x.e);
    }
    free(cursor, part.end);
    return { part, entries };
  });
}

/** The first free slot of a day (for "Add something" without a slot). */
export function firstFreeSlot(blocks: BuilderBlock[]): FreeSlot | null {
  for (const { entries } of dayTimeline(blocks)) for (const e of entries) if (e.kind === "free") return e;
  return null;
}

/** Free time from `at` on this day, for an add or a move: until the next activity. */
export function freeUntil(blocks: BuilderBlock[], at: string, ignoreId?: string): number {
  const start = toMin(at);
  return (
    blocks
      .filter((b) => b.spanDays === 1 && b.id !== ignoreId)
      .map(span)
      .filter((x) => x.s >= start)
      .sort((a, z) => a.s - z.s)[0]?.s ?? DAY_END
  );
}

/** Programmes of a day or more that cover this day (started on it or before it). */
export function coveringBlocks(trip: BuilderTrip, key: string): { block: BuilderBlock; first: number; last: number }[] {
  const out: { block: BuilderBlock; first: number; last: number }[] = [];
  for (const day of trip.days)
    for (const block of day.blocks)
      if (block.spanDays > 1 && block.day <= key && key <= block.endDay)
        out.push({ block, first: day.dayNumber, last: Math.min(trip.days.length, day.dayNumber + block.spanDays - 1) });
  return out;
}

export type DayState = "free" | "planned" | "booked";

export function dayState(trip: BuilderTrip, day: BuilderDay): DayState {
  const all = [...day.blocks, ...coveringBlocks(trip, day.key).map((c) => c.block).filter((b) => b.day !== day.key)];
  if (all.length === 0) return "free";
  return all.every((b) => b.progress === "booked") ? "booked" : "planned";
}

/** Days with something on them stand alone; runs of free days merge. */
export function dayRuns(trip: BuilderTrip): { free: boolean; days: BuilderDay[] }[] {
  const runs: { free: boolean; days: BuilderDay[] }[] = [];
  for (const day of trip.days) {
    const free = dayState(trip, day) === "free";
    const last = runs.at(-1);
    if (free && last?.free) last.days.push(day);
    else runs.push({ free, days: [day] });
  }
  return runs;
}

/** "Days 4–10" or "Day 4". */
export const daysLabel = (days: BuilderDay[]) =>
  days.length === 1 ? `Day ${days[0].dayNumber}` : `Days ${days[0].dayNumber}–${days.at(-1)!.dayNumber}`;

/** "2 activities", "1 activity", "free": how full a day is, for the move picker. */
export function dayLoad(trip: BuilderTrip, day: BuilderDay): string {
  if (day.blocks.length > 0) return day.blocks.length === 1 ? "1 activity" : `${day.blocks.length} activities`;
  const cover = coveringBlocks(trip, day.key)[0];
  return cover ? cover.block.title : "free";
}

/**
 * Does an experience fit a start time on a day? Under a day: it must end
 * before the next activity (or the evening). A programme of several days:
 * only from a morning, with every day it needs still free.
 */
export function fits(trip: BuilderTrip, dayKey: string, at: string, item: { durationMinutes: number }, ignoreId?: string): boolean {
  const day = trip.days.find((d) => d.key === dayKey);
  if (!day) return false;
  if (item.durationMinutes >= 24 * 60) {
    const needed = Math.ceil(item.durationMinutes / (24 * 60));
    const run = trip.days.slice(day.dayNumber - 1, day.dayNumber - 1 + needed);
    return run.length === needed && toMin(at) < 12 * 60 && run.every((d) => dayState(trip, d) === "free");
  }
  return toMin(at) + item.durationMinutes <= freeUntil(day.blocks, at, ignoreId);
}

/** The other activity a block overlaps on its day, if any. */
export function overlapPartner(day: BuilderDay, block: BuilderBlock): BuilderBlock | null {
  if (!block.overlaps || block.spanDays > 1) return null;
  const a = span(block);
  return (
    day.blocks.find((o) => {
      if (o.id === block.id || o.spanDays > 1) return false;
      const b = span(o);
      return a.s < b.s + o.durationMinutes && b.s < a.s + block.durationMinutes;
    }) ?? null
  );
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export const toSource = (p: PlacePhoto): PhotoSource => ({ src: p.url, alt: p.alt, credit: p.credit, w: p.width, h: p.height });

/**
 * A photo for each card in a list: experiences of the same place take the
 * place's photos in turn, so three cards from one boat company aren't one picture three times.
 */
export function cardPhotos<T extends { place: { slug: string; photos: PlacePhoto[] } }>(items: T[]): (PhotoSource | null)[] {
  const seen = new Map<string, number>();
  return items.map(({ place }) => {
    const n = seen.get(place.slug) ?? 0;
    seen.set(place.slug, n + 1);
    return place.photos.length ? toSource(place.photos[n % place.photos.length]) : null;
  });
}

/** Which kinds suit a time of day, first to last: check-ups in the morning, culture in the evening. */
export function kindOrder(at: string): string[] {
  const m = toMin(at);
  return m < 12 * 60 ? ["health", "wellness", "culture"] : m < 17 * 60 ? ["wellness", "culture", "health"] : ["culture", "wellness", "health"];
}

/** Kerala, not a partner: for days without a place photo, and credited as the site credits it. */
const KERALA = [PHOTOS.lake, PHOTOS.palms, PHOTOS.canal, PHOTOS.tea, PHOTOS.nets, PHOTOS.houseboat, PHOTOS.coast, PHOTOS.river, PHOTOS.hills, PHOTOS.prow, PHOTOS.kochi];
export const freeDayPhoto = (dayNumber: number): PhotoSource => {
  const p = KERALA[(dayNumber - 1) % KERALA.length];
  return { src: p.src, alt: p.alt, focus: p.focus, credit: `${p.credit} / Unsplash`, w: p.w, h: p.h };
};

/** A photo that can lead a full-bleed slot: marked hero and at least 1200px wide. */
const leads = (p: PlacePhoto | undefined): p is PlacePhoto => Boolean(p?.isHero && p.width >= 1200);

/**
 * Each day's lead photo (My trip's stepper and rail, Day by day's chapters),
 * in order of preference: a wellness or culture place on the day, a health
 * place (clinic photos make poor openers), then a Kerala scene. Two days in a
 * row never share a photo while the day has another to offer.
 */
export function dayPhotos(trip: BuilderTrip): PhotoSource[] {
  let previous: string | null = null;
  return trip.days.map((day) => {
    const blocks = [...day.blocks, ...coveringBlocks(trip, day.key).map((c) => c.block)];
    const heroes = (health: boolean) =>
      blocks.filter((b) => /health|medical/i.test(b.moduleName) === health && leads(b.place.photos[0])).map((b) => toSource(b.place.photos[0]));
    const options = [...heroes(false), ...heroes(true), freeDayPhoto(day.dayNumber), freeDayPhoto(day.dayNumber + 1)];
    const photo = options.find((p) => p.src !== previous)!;
    previous = photo.src;
    return photo;
  });
}

/** The towns of a day's places, in order: the chapter's title ("Fort Kochi · Alappuzha"). */
export function dayTowns(blocks: BuilderBlock[]): string[] {
  return [...new Set(blocks.map((b) => b.place.city ?? b.branchLabel).filter((t): t is string => Boolean(t)))];
}

// ---------------------------------------------------------------------------
// Money: whole euros when the cents are zero; always "for your trip"
// ---------------------------------------------------------------------------

export function euros(amount: string, currency = "EUR"): string {
  const text = formatMoney(amount, currency);
  return /[.,]00$/.test(text) ? text.slice(0, -3) : text;
}

/** "for 2 travellers", or "" for one. Every price on this page is for the whole party. */
export const forParty = (travellers: number) => (travellers > 1 ? `for ${travellers} travellers` : "");

const PARTY: Record<string, (t: number) => number> = {
  "per person": (t) => t,
  "for two": (t) => Math.ceil(t / 2),
  "per group": () => 1,
};

/**
 * What an experience would cost this trip, as the server will price it.
 * shortcut: float maths for display only; the block is priced with Decimal
 * (blockPrice) when it is added. Upgrade when the library projects a trip price.
 */
export function tripPrice(item: Pick<LibraryComponent, "price" | "priceUnitLabel">, travellers: number): string {
  const times = (PARTY[item.priceUnitLabel] ?? PARTY["per person"])(Math.max(1, travellers));
  return (Number(item.price) * times).toFixed(2);
}

/** "€590 for 2 travellers (€295 per person)", "€185". */
export function libraryPriceLine(item: LibraryComponent, travellers: number): string {
  const total = euros(tripPrice(item, travellers), item.currency);
  if (travellers <= 1) return `${total} ${item.priceUnitLabel}`;
  const unit = euros(item.price, item.currency);
  return item.priceUnitLabel === "per group" ? `${total} ${forParty(travellers)}` : `${total} ${forParty(travellers)} (${unit} ${item.priceUnitLabel})`;
}
