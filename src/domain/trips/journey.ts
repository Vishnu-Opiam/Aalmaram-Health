import type { TripStatus } from "@prisma/client";
import { daysBetweenInclusive, toUtcDay } from "@/domain/shared/dates";

/**
 * The client's "what happens next": the five steps of a trip in plain words,
 * and where today falls against its dates. Framework-free so the home page
 * and its tests read the same rules.
 */

export const JOURNEY_STEPS = ["Plan your days", "Confirm", "Payment", "Booking", "Ready to travel"] as const;

export type TripMoment =
  | { kind: "before"; days: number }
  | { kind: "during"; day: number; of: number }
  | { kind: "after" };

export function tripMoment(start: Date, end: Date, today: Date): TripMoment {
  const now = toUtcDay(today);
  if (now < toUtcDay(start)) return { kind: "before", days: daysBetweenInclusive(now, start) - 1 };
  if (now > toUtcDay(end)) return { kind: "after" };
  return { kind: "during", day: daysBetweenInclusive(start, now), of: daysBetweenInclusive(start, end) };
}

export function momentLabel(moment: TripMoment): string {
  if (moment.kind === "before") return moment.days === 1 ? "Tomorrow" : `${moment.days} days to go`;
  if (moment.kind === "during") return `Day ${moment.day} of ${moment.of}`;
  return "Welcome home";
}

/** `step` indexes JOURNEY_STEPS; past the last step (in Kerala, home again) it equals its length. */
export type JourneyStage = { step: number; title: string; text: string };

/** "your team" → "Your team" where a name or fallback opens a sentence. */
export const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function journeyStage(
  status: TripStatus,
  counts: { activities: number; booked: number },
  contact: string,
): JourneyStage {
  switch (status) {
    case "PLANNING":
      return counts.activities === 0
        ? {
            step: 0,
            title: "Your trip is being prepared",
            text: `${capitalise(contact)} is arranging your health appointments with the clinics. You can already look through your days and add things you would enjoy.`,
          }
        : {
            step: 0,
            title: "Plan your days",
            text: "Your team has arranged your health appointments. Add anything else you would like, then confirm. Nothing is booked until you do.",
          };
    case "AWAITING_PAYMENT":
      return {
        step: 2,
        title: "Thank you for confirming",
        text: `${capitalise(contact)} will be in touch about payment. After that we book each activity for you.`,
      };
    case "BOOKING":
      return {
        step: 3,
        title: "We are booking your activities",
        text:
          counts.activities > 0 && counts.booked === counts.activities
            ? "Every activity is booked. We will let you know when everything is ready."
            : `${counts.booked} of ${counts.activities} booked so far. Each one gets a green tick when the provider confirms it.`,
      };
    case "READY":
      return { step: 4, title: "You are ready to travel", text: "Everything is booked. We look forward to welcoming you in Kerala." };
    case "IN_PROGRESS":
      return { step: JOURNEY_STEPS.length, title: "Enjoy Kerala", text: "Your plan for each day is under Day by day." };
    case "COMPLETED":
      return { step: JOURNEY_STEPS.length, title: "Welcome home", text: "We hope you had a wonderful time. Your team will be in touch." };
    case "CANCELLED":
      return { step: 0, title: "This trip was cancelled", text: `Please ask ${contact} if you have any questions.` };
  }
}
