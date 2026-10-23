import { describe, expect, it } from "vitest";
import { JOURNEY_STEPS, journeyStage, momentLabel, tripMoment } from "@/domain/trips/journey";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("trip moment", () => {
  const start = day("2026-12-07");
  const end = day("2026-12-16");

  it("counts the days to go, then the day of the trip, then home", () => {
    expect(tripMoment(start, end, day("2026-10-23"))).toEqual({ kind: "before", days: 45 });
    expect(momentLabel(tripMoment(start, end, day("2026-12-06")))).toBe("Tomorrow");
    expect(tripMoment(start, end, new Date("2026-12-07T23:30:00.000Z"))).toEqual({ kind: "during", day: 1, of: 10 });
    expect(momentLabel(tripMoment(start, end, day("2026-12-16")))).toBe("Day 10 of 10");
    expect(momentLabel(tripMoment(start, end, day("2026-12-17")))).toBe("Welcome home");
  });
});

describe("journey stage", () => {
  it("asks the client to plan, then tells them what happens next", () => {
    expect(journeyStage("PLANNING", { activities: 0, booked: 0 }, "Arjun").text).toContain("Arjun is arranging");
    expect(journeyStage("AWAITING_PAYMENT", { activities: 1, booked: 0 }, "your team").text).toMatch(/^Your team will be in touch/);
    expect(journeyStage("PLANNING", { activities: 3, booked: 0 }, "Arjun")).toMatchObject({ step: 0, title: "Plan your days" });
    expect(journeyStage("AWAITING_PAYMENT", { activities: 3, booked: 0 }, "Arjun")).toMatchObject({ step: 2 });
    expect(journeyStage("READY", { activities: 3, booked: 3 }, "Arjun").step).toBe(4);
    expect(journeyStage("IN_PROGRESS", { activities: 3, booked: 3 }, "Arjun").step).toBe(JOURNEY_STEPS.length);
  });

  it("counts bookings in words while booking", () => {
    expect(journeyStage("BOOKING", { activities: 3, booked: 1 }, "Arjun").text).toMatch(/^1 of 3 booked/);
    expect(journeyStage("BOOKING", { activities: 3, booked: 3 }, "Arjun").text).toMatch(/^Every activity is booked/);
  });

  it("never promises a health outcome", () => {
    const statuses = ["PLANNING", "AWAITING_PAYMENT", "BOOKING", "READY", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
    for (const status of statuses) {
      const { title, text } = journeyStage(status, { activities: 2, booked: 1 }, "Arjun");
      expect(`${title} ${text}`).not.toMatch(/diagnos|\bcure|treat|heal(?!th)|result/i);
    }
  });
});
