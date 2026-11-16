import { KERALA_OFFSET_MS, daysBetweenInclusive, keralaDay, parseDateInput } from "@/domain/shared/dates";

/**
 * The My trip countdown. Everything is counted in Kerala time: the target is
 * 00:00 Asia/Kolkata on the start date, and "today" is the Kerala calendar day.
 * Framework-free and free of server imports, so the browser's minute ticker
 * can use `countdownParts` and agree with the server-rendered numbers.
 */

export type TripPhase = "undated" | "before" | "tomorrow" | "during" | "lastDay" | "after";

export type TripCountdown = {
  phase: TripPhase;
  /**
   * Whole 24-hour days left until the target (before / tomorrow only), so the
   * big numeral and "and 14 h 05 min" under it add up. 0 when under 24 h.
   */
  daysToGo: number | null;
  /** 00:00 Kerala time on the start date as an ISO instant (null when undated). */
  targetIso: string | null;
  /** Day N of `dayCount` while in Kerala (during / lastDay), else null. */
  dayNumber: number | null;
  dayCount: number | null;
};

const DAY_MS = 86_400_000;

const asDay = (d: Date | string) => (typeof d === "string" ? parseDateInput(d) : d);

/** 00:00 in Kerala on `day` (a UTC-midnight calendar date). */
export const keralaMidnight = (day: Date | string) => new Date(asDay(day).getTime() - KERALA_OFFSET_MS);

export function tripCountdown(
  trip: { startDate: Date | string | null; endDate: Date | string | null },
  now: Date,
): TripCountdown {
  if (!trip.startDate || !trip.endDate) {
    return { phase: "undated", daysToGo: null, targetIso: null, dayNumber: null, dayCount: null };
  }
  const start = asDay(trip.startDate);
  const end = asDay(trip.endDate);
  const target = keralaMidnight(start);
  const today = keralaDay(now);
  const dayCount = daysBetweenInclusive(start, end);
  const base = { targetIso: target.toISOString(), dayCount };

  if (today < start) {
    const daysToGo = Math.floor((target.getTime() - now.getTime()) / DAY_MS);
    return { ...base, phase: daysToGo === 0 ? "tomorrow" : "before", daysToGo, dayNumber: null };
  }
  if (today > end) return { ...base, phase: "after", daysToGo: null, dayNumber: null };
  const dayNumber = daysBetweenInclusive(start, today);
  return { ...base, phase: dayNumber === dayCount && dayCount > 1 ? "lastDay" : "during", daysToGo: null, dayNumber };
}

/** Time left until `targetIso`, floored to the minute; all zero once it has passed. */
export function countdownParts(targetIso: string, now: Date): { days: number; hours: number; minutes: number } {
  const minutesLeft = Math.max(0, Math.floor((new Date(targetIso).getTime() - now.getTime()) / 60_000));
  return {
    days: Math.floor(minutesLeft / 1440),
    hours: Math.floor((minutesLeft % 1440) / 60),
    minutes: minutesLeft % 60,
  };
}
