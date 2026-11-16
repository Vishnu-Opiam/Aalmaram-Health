import { Prisma } from "@prisma/client";
import { formatMoney } from "@/domain/itineraries/pricing";
import { parseDateInput } from "@/domain/shared/dates";
import type { BuilderTrip, LibraryComponent, Place, PlacePhoto } from "@/domain/trips/builder-view";
import type { PhotoSource } from "@/components/portal/kit";
import { kindOf, type Kind } from "@/components/portal/kit/module";

/**
 * Explore's view model: plain, client-safe shapes and the small rules the
 * page and the add picker share (ordering, "does it fit on this day", money).
 * No React here, so it can be checked on its own.
 */

/** What the add picker needs to know about the trip; a slim cut of BuilderTrip. */
export type ExploreTrip = {
  id: string;
  name: string;
  editable: boolean;
  travellers: number;
  days: {
    key: string;
    dayNumber: number;
    blocks: { id: string; componentId: string; title: string; time: string; endTime: string; durationMinutes: number; spanDays: number }[];
  }[];
};

/** Everything the client components get from the server besides places and experiences. */
export type ExploreContext = {
  trip: ExploreTrip | null;
  /** More than one trip: say which one an add goes to. */
  tripCount: number;
  /** "Priya", or "your coordinator". */
  coordinator: string;
  /** componentId / place slug → day numbers already holding it. */
  inTrip: { byComponent: Record<string, number[]>; byPlace: Record<string, number[]> };
  /** "Choosing for Day N" (from Day by day): the day key and the time to pre-select. */
  choosing: { dayKey: string; slot: string | null } | null;
};

export function slimTrip(trip: BuilderTrip): ExploreTrip {
  return {
    id: trip.id,
    name: trip.name,
    editable: trip.editable,
    travellers: trip.travellers,
    days: trip.days.map((d) => ({
      key: d.key,
      dayNumber: d.dayNumber,
      blocks: d.blocks.map((b) => ({
        id: b.id,
        componentId: b.componentId,
        title: b.title,
        time: b.time,
        endTime: b.endTime,
        durationMinutes: b.durationMinutes,
        spanDays: b.spanDays,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Words and numbers
// ---------------------------------------------------------------------------

/** "€955" when the cents are zero, "€38.50" otherwise. */
export const money = (amount: string, currency: string) => formatMoney(amount, currency).replace(/[.,]00(?!\d)/, "");

/** "Mon 21 Dec" */
export const shortDate = (key: string) =>
  parseDateInput(key).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export const daysLabel = (days: number[]) =>
  days.length === 1 ? `Day ${days[0]}` : `Days ${days.slice(0, -1).join(", ")} and ${days[days.length - 1]}`;

/** The price for this trip when the unit makes it plain: "€590 for your 2 travellers". */
export function tripPrice(item: Pick<LibraryComponent, "price" | "currency" | "priceUnitLabel">, travellers: number | null) {
  if (!travellers || travellers < 2 || item.priceUnitLabel !== "per person") return null;
  return `${money(new Prisma.Decimal(item.price).times(travellers).toString(), item.currency)} for your ${travellers} travellers`;
}

export const KINDS: Kind[] = ["health", "wellness", "culture"];
export const placeKind = (p: Pick<Place, "module">): Kind | null => (p.module ? kindOf(p.module) : null);

/** "/partners/…" photo → the kit's PhotoSource. */
export const toPhoto = (p: PlacePhoto): PhotoSource => ({ src: p.url, alt: p.alt, credit: p.credit, w: p.width, h: p.height });

/** Design renders are labelled as such in their alt text by the photo pipeline. */
export const isRender = (p: { alt: string }) => /design render/i.test(p.alt);

/** A photo that may lead a page or a large card (the pipeline's hero rule). */
export const heroOf = (p: Pick<Place, "photos">) => (p.photos[0]?.isHero ? p.photos[0] : null);

/** A smaller real photo a typographic card can carry as an inset (never a render). */
export const insetOf = (p: Pick<Place, "photos">) => (heroOf(p) ? null : (p.photos.find((ph) => !isRender(ph)) ?? null));

/** The photo an experience card shows: its place's photos in turn, so siblings differ. */
export function photoForExperience(place: Pick<Place, "photos">, index: number): PlacePhoto | null {
  const usable = place.photos.filter((p) => !isRender(p) && p.width >= 900);
  return usable.length ? usable[index % usable.length] : null;
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

const strength = (p: Pick<Place, "photos">) => (heroOf(p) ? 100 : 0) + p.photos.filter((ph) => !isRender(ph)).length;

/**
 * Places with strong photography first, then the typographic cards woven in
 * one at a time after the first two photographs, so a module never ends in a
 * block of identical dark cards and never opens with one.
 */
export function arrangePlaces<T extends Pick<Place, "photos" | "name">>(places: T[]): T[] {
  const sorted = [...places].sort((a, b) => strength(b) - strength(a) || a.name.localeCompare(b.name));
  const photo = sorted.filter((p) => heroOf(p));
  const typo = sorted.filter((p) => !heroOf(p));
  const out = photo.splice(0, 2);
  while (photo.length && typo.length) out.push(typo.shift()!, photo.shift()!);
  return [...out, ...photo, ...typo];
}

// ---------------------------------------------------------------------------
// Does it fit? (the add picker)
// ---------------------------------------------------------------------------

export const PARTS = [
  { label: "Morning", time: "09:00" },
  { label: "Afternoon", time: "14:00" },
  { label: "Evening", time: "18:30" },
] as const;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Why `durationMinutes` starting at `time` on day `dayIndex` doesn't fit, in plain words, or null. */
export function clash(trip: ExploreTrip, dayIndex: number, time: string, durationMinutes: number): string | null {
  const start = dayIndex * 1440 + toMin(time);
  const end = start + durationMinutes;
  if (end > trip.days.length * 1440) {
    return durationMinutes >= 1440
      ? `It runs for ${Math.round(durationMinutes / 1440)} days, so it would go past the end of your trip.`
      : "It would run past the end of your trip.";
  }
  for (const [i, day] of trip.days.entries()) {
    for (const b of day.blocks) {
      const bStart = i * 1440 + toMin(b.time);
      const bEnd = bStart + b.durationMinutes;
      if (start < bEnd && bStart < end) {
        return b.spanDays > 1
          ? `You are at ${b.title} then (Day ${day.dayNumber}–${day.dayNumber + b.spanDays - 1}).`
          : `That clashes with ${b.title}, ${b.time}–${b.endTime}${i === dayIndex ? "" : ` on Day ${day.dayNumber}`}.`;
      }
    }
  }
  return null;
}

/** A sensible start time on a day: the asked-for slot, then morning/afternoon/evening, then any half hour 08:00–20:00. */
export function firstFit(trip: ExploreTrip, dayIndex: number, durationMinutes: number, preferred?: string | null): string | null {
  const tries = [preferred, ...PARTS.map((p) => p.time)].filter((t): t is string => Boolean(t && /^\d{2}:\d{2}$/.test(t)));
  for (let m = 8 * 60; m <= 20 * 60; m += 30) tries.push(toHhmm(m));
  return tries.find((t) => !clash(trip, dayIndex, t, durationMinutes)) ?? null;
}

/** "Free", "Kathakali 18:00", "3 things". */
export function dayLoad(day: ExploreTrip["days"][number], trip: ExploreTrip): string {
  const covering = trip.days
    .slice(0, day.dayNumber - 1)
    .flatMap((d) => d.blocks.filter((b) => d.dayNumber + b.spanDays - 1 >= day.dayNumber).map((b) => b.title));
  if (covering.length) return covering[0];
  if (day.blocks.length === 0) return "Free";
  if (day.blocks.length === 1) return `${day.blocks[0].title}, ${day.blocks[0].time}`;
  return `${day.blocks.length} things planned`;
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/** Query keys that travel with the client between the list and place pages. */
export const CARRY = ["trip", "module", "q", "for", "slot"] as const;

export function carryQuery(from: { get(key: string): string | null } | Record<string, string | undefined>, extra: Record<string, string | null> = {}) {
  const get = (k: string) => (typeof from.get === "function" ? (from as { get(key: string): string | null }).get(k) : (from as Record<string, string | undefined>)[k]);
  const out = new URLSearchParams();
  for (const k of CARRY) {
    const v = k in extra ? extra[k] : get(k);
    if (v) out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

/** The page the client is on, minus one-shot markers and open panels: where an action returns to. */
export function returnHere(hash = "") {
  const url = new URL(window.location.href);
  for (const k of ["item", "photo", "pphoto", "u", "added", "asked"]) url.searchParams.delete(k);
  return `${url.pathname}${url.search}${hash}`;
}
