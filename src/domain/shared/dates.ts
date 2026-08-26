/**
 * Date helpers.
 *
 * Trip and itinerary dates are calendar dates, not instants. They are stored as
 * UTC midnight so that a proposal never shifts a day because of the reader's
 * timezone.
 */

export function toUtcDay(value: Date | string): Date {
  const date = typeof value === "string" ? parseDateInput(value) : value;
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

/** Parses `YYYY-MM-DD` (the HTML date input format) as a UTC calendar day. */
export function parseDateInput(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match) {
    return new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    );
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return toUtcDay(parsed);
}

/** Formats a Date back into `YYYY-MM-DD` for date inputs. */
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return toUtcDay(a).getTime() === toUtcDay(b).getTime();
}

export function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = toUtcDay(end).getTime() - toUtcDay(start).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

/** 1-based day number of `date` within a trip starting on `start`. */
export function dayNumberFor(start: Date, date: Date): number {
  const ms = toUtcDay(date).getTime() - toUtcDay(start).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export function addDays(date: Date, days: number): Date {
  const next = toUtcDay(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  const d = toUtcDay(date).getTime();
  return d >= toUtcDay(start).getTime() && d <= toUtcDay(end).getTime();
}

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export const formatLongDate = (d: Date | null | undefined) =>
  d ? LONG_DATE.format(d) : "Date to be confirmed";

export const formatShortDate = (d: Date | null | undefined) =>
  d ? SHORT_DATE.format(d) : "-";

export const formatDayMonth = (d: Date | null | undefined) =>
  d ? DAY_MONTH.format(d) : "-";

export function formatDateRange(
  start: Date | null | undefined,
  end: Date | null | undefined,
): string {
  if (!start && !end) return "Dates to be confirmed";
  if (start && !end) return `From ${formatShortDate(start)}`;
  if (!start && end) return `Until ${formatShortDate(end)}`;
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

export function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatShortDate(date);
}
