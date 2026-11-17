import type { TripStatus } from "@prisma/client";
import type { BuilderBlock, BuilderDay, PlacePhoto } from "@/domain/trips/builder-view";
import type { TripCountdown } from "@/domain/trips/countdown";
import { JOURNEY_STEPS, capitalise } from "@/domain/trips/journey";
import { parseDateInput } from "@/domain/shared/dates";
import type { PhotoSource } from "@/components/portal/kit/photo";

/**
 * My trip's words and choices as plain functions of the trip, the clock and
 * the status (no React, no server imports), so every phase can be checked
 * without rendering: the hero's headline per anticipation band, the one next
 * step, "where we are", the photo of the day.
 */

export type HeroItem = { time: string; title: string; where: string | null };

export type HeroCopy = {
  /** The big element: a numeral ("31", "3") or words ("Tomorrow"). Null: the trip name carries the page. */
  big: string | null;
  numeric: boolean;
  /** Under or beside the big element: "days to go", "of 10". */
  bigLabel: string | null;
  /** The live "and 14 h 05 min" ("and"), "14 h 05 min" ("bare"), or none. */
  ticker: "and" | "bare" | null;
  /** One sentence for the paper under the photo. */
  line: string;
};

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n: number) => WORDS[n] ?? String(n);

const itemText = (i: HeroItem) => `${i.time}, ${i.title}${i.where ? `, ${i.where}` : ""}`;

function bookedLine(activities: number, booked: number): string {
  if (activities > 0 && booked === activities)
    return activities === 1 ? "Your booking is confirmed." : `All ${word(activities)} bookings are confirmed.`;
  if (booked === 0) return "We're booking your days now.";
  return `${capitalise(word(booked))} of your ${word(activities)} bookings ${booked === 1 ? "is" : "are"} confirmed by the people hosting you.`;
}

/**
 * The hero as a function of (time until travel × trip status), after the
 * anticipation table: undated, 60+, 30–59, 8–29, 2–7 days, tomorrow, during,
 * last day, after, cancelled. `status` null means no trip yet.
 */
export function heroCopy(input: {
  countdown: TripCountdown;
  status: TripStatus | null;
  name: string;
  /** Coordinator's first name, or "your coordinator". */
  contact: string;
  activities: number;
  booked: number;
  firstItem: HeroItem | null;
  today: HeroItem[];
}): HeroCopy {
  const { countdown: c, status, name, contact, activities, booked } = input;
  const Contact = capitalise(contact);
  const words = (big: string | null, line: string): HeroCopy => ({ big, numeric: false, bigLabel: null, ticker: null, line });

  if (!status) return words(`Welcome, ${name}`, `${Contact} is putting your trip together. It will appear here once your dates are agreed.`);
  if (status === "CANCELLED") return words(null, `This trip was cancelled. ${Contact} is here if you have questions.`);
  if (c.phase === "undated") return words(`Welcome, ${name}`, `${Contact} is putting your trip together.`);
  if (c.phase === "after" || status === "COMPLETED")
    return words(`Welcome home, ${name}`, "Thank you for travelling with us. Your trip stays here whenever you want to look back.");

  const today = input.today.length
    ? `Today: ${input.today.slice(0, 2).map(itemText).join(" · ")}.`
    : "Nothing planned today. Rest, wander, or ask us for an idea.";
  if (c.phase === "lastDay") return words("Your last day in Kerala", today);
  if (c.phase === "during")
    return { big: `Day ${c.dayNumber}`, numeric: true, bigLabel: `of ${c.dayCount}`, ticker: null, line: c.dayNumber === 1 ? `Welcome to Kerala. ${today}` : today };
  if (c.phase === "tomorrow")
    return {
      ...words("Tomorrow", input.firstItem ? `Your first morning: ${itemText(input.firstItem)}.` : "Your trip begins in Kerala tomorrow."),
      ticker: "bare",
    };

  const days = c.daysToGo ?? 0;
  const counted = (line: string): HeroCopy => ({ big: String(days), numeric: true, bigLabel: days === 1 ? "day to go" : "days to go", ticker: "and", line });
  if (days <= 7) return counted(days === 7 ? "This time next week you'll be in Kerala." : "Almost there.");
  switch (status) {
    case "AWAITING_PAYMENT":
      return counted(`Thank you, ${name}. Your plan is set.`);
    case "BOOKING":
      return counted(
        booked === 0
          ? days >= 60
            ? "Everything is in hand. We'll show each booking here as it's confirmed."
            : "Your days are being booked, one by one."
          : bookedLine(activities, booked),
      );
    case "READY":
    case "IN_PROGRESS":
      return counted(activities > 0 ? `You're ready. ${bookedLine(activities, booked)}` : "You're ready.");
    default:
      if (days >= 60) return counted("Plenty of time. Shape your days whenever it suits you.");
      if (days >= 30)
        return counted(`${days < 45 ? "A month to go. " : ""}When your days feel right, confirm and ${contact} will start booking.`);
      return counted(`Bookings take a little time to confirm. Confirm when you're ready and ${contact} will begin.`);
  }
}

export type Action = { label: string; href: string };

/** The one next step for the pass, plus an optional quiet second link. */
export function nextStep(input: {
  status: TripStatus;
  phase: TripCountdown["phase"];
  blockCount: number;
  tripId: string;
  todayKey: string | null;
  contact: string;
}): { primary: Action; secondary: Action | null } {
  const q = `trip=${encodeURIComponent(input.tripId)}`;
  const days = `/trip/itinerary?${q}`;
  if (input.status === "CANCELLED") return { primary: { label: `Ask ${input.contact}`, href: `/trip/chat?${q}` }, secondary: null };
  if ((input.phase === "during" || input.phase === "lastDay") && input.todayKey)
    return { primary: { label: "Today's plan", href: `${days}&day=${input.todayKey}#day-${input.todayKey}` }, secondary: null };
  if (input.phase === "after" || input.status === "COMPLETED") return { primary: { label: "Look back at your days", href: days }, secondary: null };
  switch (input.status) {
    case "PLANNING":
      return {
        primary: { label: "Shape your days", href: days },
        secondary: input.blockCount > 0 ? { label: "Review and confirm", href: `/trip/itinerary/confirm?${q}` } : null,
      };
    case "AWAITING_PAYMENT":
      return { primary: { label: "What happens now", href: "#where-we-are" }, secondary: { label: "See your days", href: days } };
    case "BOOKING":
      return { primary: { label: "See what's booked", href: days }, secondary: null };
    default:
      return { primary: { label: "See your days", href: days }, secondary: null };
  }
}

/** "Where we are": the five steps and a few words on the current one. Null once in Kerala or home. */
export function whereWeAre(
  status: TripStatus,
  counts: { activities: number },
  contact: string,
): { step: number; title: string; text: string } | null {
  const Contact = capitalise(contact);
  switch (status) {
    case "PLANNING":
      return counts.activities === 0
        ? {
            step: 0,
            title: "Your trip is being prepared",
            text: `${Contact} is arranging your appointments with the clinics. Your days are already open to shape. Nothing is booked until you confirm.`,
          }
        : {
            step: 0,
            title: "Your days are taking shape",
            text: "Your appointments are in place. The other days are yours: add what appeals, and confirm when it feels right. Nothing is booked until you confirm.",
          };
    case "AWAITING_PAYMENT":
      return {
        step: 2,
        title: "Payment next",
        text: `${Contact} will be in touch about payment. Then we book each day with the people hosting you, and you'll see each one turn green here.`,
      };
    case "BOOKING":
      return {
        step: 3,
        title: "Your days are being booked",
        text: "Each booking gets a green tick here when the people hosting you confirm it.",
      };
    case "READY":
      return { step: 4, title: "You're ready", text: "Everything is booked. We look forward to welcoming you in Kerala." };
    default:
      return null;
  }
}

export const STEPS = JOURNEY_STEPS;

/** A day's state for the rail: free (nothing in it), booked (all booked), else planned. */
export function dayState(blocks: Pick<BuilderBlock, "progress">[]): "free" | "planned" | "booked" {
  if (blocks.length === 0) return "free";
  return blocks.every((b) => b.progress === "booked") ? "booked" : "planned";
}

export const toPhoto = (p: PlacePhoto): PhotoSource => ({ src: p.url, alt: p.alt, credit: p.credit, w: p.width, h: p.height });

/** A photo that can lead a full-bleed slot: marked hero and at least 1200px wide. */
export const heroCapable = (p: PlacePhoto | undefined): p is PlacePhoto => Boolean(p?.isHero && p.width >= 1200);

/** The trip's places in day order, once each, with the first day they appear on. */
export function tripPlaces(days: BuilderDay[]): { place: BuilderBlock["place"]; moduleName: string; dayNumber: number }[] {
  const seen = new Map<string, { place: BuilderBlock["place"]; moduleName: string; dayNumber: number }>();
  for (const d of days)
    for (const b of d.blocks) if (!seen.has(b.place.slug)) seen.set(b.place.slug, { place: b.place, moduleName: b.moduleName, dayNumber: d.dayNumber });
  return [...seen.values()];
}

/**
 * The hero photo: a hero-capable photo of a place on this trip (today's place
 * first while in Kerala), else a Kerala photo from the brand set. It turns
 * with the Kerala calendar day, so a return visit on another day looks fresh
 * while a refresh never changes it.
 */
export function pickHeroPhoto(own: PlacePhoto[], brand: PhotoSource[], dayIndex: number): PhotoSource {
  const capable = own.filter(heroCapable);
  if (capable.length) return toPhoto(capable[dayIndex % capable.length]);
  return brand[dayIndex % brand.length];
}

/** Days since 1970 of a UTC-midnight calendar date (keralaDay(now)), for daily rotation. */
export const dayIndexOf = (day: Date) => Math.floor(day.getTime() / 86_400_000);

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });

/** The house date range, "18 – 27 December 2026" (or "18 – 27 Dec 2026" short), sharing month and year when they match. */
export function dateRange(startKey: string, endKey: string, short = false): string {
  const s = parseDateInput(startKey);
  const e = parseDateInput(endKey);
  const month = short ? "short" : "long";
  const sep = " – ";
  const full = fmt(e, { day: "numeric", month, year: "numeric" });
  // Short (phones) drops the first year: "31 Dec – 9 Jan 2027" fits one line beside the numeral.
  if (s.getUTCFullYear() !== e.getUTCFullYear() && !short) return `${fmt(s, { day: "numeric", month, year: "numeric" })}${sep}${full}`;
  if (s.getUTCMonth() !== e.getUTCMonth()) return `${fmt(s, { day: "numeric", month })}${sep}${full}`;
  return `${s.getUTCDate()}${sep}${full}`;
}

/** "Friday 18 December" (or "Fri 18 Dec"). */
export const dayDate = (key: string, short = false) =>
  fmt(parseDateInput(key), short ? { weekday: "short", day: "numeric", month: "short" } : { weekday: "long", day: "numeric", month: "long" });

/** Whole euros for the pass ("€955"), as the owner asked: no cents on the hero. */
export const wholeMoney = (amount: string, currency: string) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(Number(amount) || 0));
