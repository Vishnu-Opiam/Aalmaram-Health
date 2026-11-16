/** Whole days, hours and minutes left until `target` (rounded down), or `past`. Server- and client-safe. */
export type CountdownParts = { days: number; hours: number; minutes: number; past: boolean };

export function countdownParts(target: string, nowMs: number): CountdownParts {
  const left = Math.floor((Date.parse(target) - nowMs) / 60_000);
  if (!(left > 0)) return { days: 0, hours: 0, minutes: 0, past: true };
  return { days: Math.floor(left / 1440), hours: Math.floor((left % 1440) / 60), minutes: left % 60, past: false };
}

/** 00:00 in Kerala (Asia/Kolkata, UTC+5:30 all year, no DST) on a YYYY-MM-DD day, as an ISO instant. */
export const keralaMidnight = (day: string) => new Date(`${day}T00:00:00+05:30`).toISOString();
