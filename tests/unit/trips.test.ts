import { describe, expect, it } from "vitest";
import type { TripStatus } from "@prisma/client";
import {
  blockEndsAt,
  findOverlaps,
  formatTime,
  groupBlocksByDay,
  placementProblems,
  suggestedStartTime,
  toBlockStart,
} from "@/domain/trips/blocks";
import { actualMix, moduleMixProblems, normaliseMix } from "@/domain/trips/module-mix";
import {
  TRIP_TRANSITIONS,
  assertItineraryEditable,
  canTransition,
  isItineraryEditable,
} from "@/domain/trips/status";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("trip status machine", () => {
  it("follows confirm → lock → pay → book", () => {
    expect(canTransition("PLANNING", "AWAITING_PAYMENT")).toBe(true);
    expect(canTransition("AWAITING_PAYMENT", "BOOKING")).toBe(true);
    expect(canTransition("PLANNING", "BOOKING")).toBe(false);
    expect(canTransition("BOOKING", "PLANNING")).toBe(false);
  });

  it("lets every non-final status be cancelled, and nothing leave a final one", () => {
    for (const status of Object.keys(TRIP_TRANSITIONS) as TripStatus[]) {
      if (status === "IN_PROGRESS" || status === "COMPLETED" || status === "CANCELLED") continue;
      expect(canTransition(status, "CANCELLED")).toBe(true);
    }
    expect(TRIP_TRANSITIONS.COMPLETED).toEqual([]);
    expect(TRIP_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it("only allows editing while planning and unconfirmed", () => {
    expect(isItineraryEditable("PLANNING", null)).toBe(true);
    expect(isItineraryEditable("PLANNING", new Date())).toBe(false);
    expect(isItineraryEditable("AWAITING_PAYMENT", null)).toBe(false);
    expect(() => assertItineraryEditable("BOOKING", new Date())).toThrow(/locked/);
  });
});

describe("block times", () => {
  it("stores Kerala wall-clock time as a floating UTC timestamp", () => {
    const start = toBlockStart("2026-12-06", "09:30");
    expect(start.toISOString()).toBe("2026-12-06T09:30:00.000Z");
    expect(formatTime(start)).toBe("09:30");
    expect(formatTime(blockEndsAt(start, 90))).toBe("11:00");
  });

  it("rejects malformed times", () => {
    expect(() => toBlockStart("2026-12-06", "25:00")).toThrow();
    expect(() => toBlockStart("06/12/2026", "09:00")).toThrow();
  });

  it("suggests the half hour after the day's last block, with a gap", () => {
    expect(suggestedStartTime([])).toBe("09:00");
    const blocks = [{ startsAt: toBlockStart("2026-12-06", "09:00"), durationMinutes: 45 }];
    expect(suggestedStartTime(blocks)).toBe("10:30");
  });
});

describe("placementProblems", () => {
  const base = {
    durationMinutes: 60,
    tripStart: day("2026-12-06"),
    tripEnd: day("2026-12-08"),
    componentVendorId: "v1",
  };

  it("accepts a block on the first and the last day", () => {
    expect(placementProblems({ ...base, startsAt: toBlockStart("2026-12-06", "00:00") })).toEqual([]);
    expect(placementProblems({ ...base, startsAt: toBlockStart("2026-12-08", "21:00") })).toEqual([]);
  });

  it("rejects a block outside the trip", () => {
    expect(placementProblems({ ...base, startsAt: toBlockStart("2026-12-09", "09:00") })).toHaveLength(1);
    expect(placementProblems({ ...base, startsAt: toBlockStart("2026-12-05", "23:00") })).toHaveLength(1);
  });

  it("rejects a branch of another vendor", () => {
    const problems = placementProblems({
      ...base,
      startsAt: toBlockStart("2026-12-07", "09:00"),
      branch: { vendorId: "v2" },
    });
    expect(problems).toEqual(["That branch belongs to a different provider."]);
  });
});

describe("findOverlaps", () => {
  it("reports blocks whose times overlap, not ones that touch", () => {
    const at = (time: string) => toBlockStart("2026-12-06", time);
    const overlaps = findOverlaps([
      { id: "a", startsAt: at("09:00"), durationMinutes: 60 },
      { id: "b", startsAt: at("10:00"), durationMinutes: 60 },
      { id: "c", startsAt: at("10:30"), durationMinutes: 30 },
    ]);
    expect(overlaps).toEqual([["b", "c"]]);
  });
});

describe("groupBlocksByDay", () => {
  it("returns every trip day, including empty ones, with blocks sorted by time", () => {
    const blocks = [
      { id: "late", startsAt: toBlockStart("2026-12-06", "15:00") },
      { id: "early", startsAt: toBlockStart("2026-12-06", "08:00") },
      { id: "last", startsAt: toBlockStart("2026-12-08", "10:00") },
    ];
    const days = groupBlocksByDay(day("2026-12-06"), day("2026-12-08"), blocks);
    expect(days.map((d) => d.key)).toEqual(["2026-12-06", "2026-12-07", "2026-12-08"]);
    expect(days[0].blocks.map((b) => b.id)).toEqual(["early", "late"]);
    expect(days[1].blocks).toEqual([]);
    expect(days[2].dayNumber).toBe(3);
  });

  it("keeps blocks outside the trip visible on the nearest day", () => {
    const days = groupBlocksByDay(day("2026-12-06"), day("2026-12-07"), [
      { id: "after", startsAt: toBlockStart("2026-12-10", "10:00") },
    ]);
    expect(days[1].blocks.map((b) => b.id)).toEqual(["after"]);
  });
});

describe("module mix", () => {
  it("accepts an empty mix or one summing to 100", () => {
    expect(moduleMixProblems([])).toEqual([]);
    expect(
      moduleMixProblems([
        { moduleId: "h", percent: 40 },
        { moduleId: "w", percent: 30 },
        { moduleId: "c", percent: 30 },
      ]),
    ).toEqual([]);
  });

  it("rejects a mix that does not sum to 100", () => {
    expect(moduleMixProblems([{ moduleId: "h", percent: 60 }, { moduleId: "w", percent: 30 }])[0]).toMatch(/90%/);
  });

  it("normalises weights to whole percentages summing to 100", () => {
    const mix = normaliseMix([
      { moduleId: "a", percent: 1 },
      { moduleId: "b", percent: 1 },
      { moduleId: "c", percent: 1 },
    ]);
    expect(mix.reduce((s, m) => s + m.percent, 0)).toBe(100);
    expect(mix.map((m) => m.percent).sort()).toEqual([33, 33, 34]);
  });

  it("measures an itinerary's actual mix by time spent", () => {
    const mix = actualMix([
      { moduleId: "h", durationMinutes: 120 },
      { moduleId: "c", durationMinutes: 60 },
      { moduleId: "h", durationMinutes: 60 },
    ]);
    expect(mix).toEqual([
      { moduleId: "h", percent: 75 },
      { moduleId: "c", percent: 25 },
    ]);
  });
});
