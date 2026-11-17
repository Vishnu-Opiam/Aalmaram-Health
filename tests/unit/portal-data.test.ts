import { describe, expect, it } from "vitest";
import { keralaDay } from "@/domain/shared/dates";
import { countdownParts, tripCountdown } from "@/domain/trips/countdown";
import { blockSpan } from "@/domain/trips/blocks";
import { tripPresence } from "@/domain/trips/in-trip";
import { safePortalReturn } from "@/domain/trips/return-to";
import type { BuilderTrip } from "@/domain/trips/builder-view";
import { slugify, uniqueSlug } from "@/domain/vendors/slug";
import { dayPhotos, freeDayPhoto } from "@/components/portal/days/plan";
import { refreshUrl } from "@/lib/refresh-url";
import { cleanLines, cleanSummary, heroIndex, planPhotos } from "../../scripts/partners-photos.mjs";

/** An instant given as Kerala wall-clock time (IST = UTC+05:30). */
const ist = (local: string) => new Date(`${local}+05:30`);

describe("Kerala calendar day", () => {
  it("is already the next day between 00:00 and 05:30 IST, while UTC is not", () => {
    expect(keralaDay(ist("2026-12-07T00:10")).toISOString()).toBe("2026-12-07T00:00:00.000Z");
    expect(keralaDay(ist("2026-12-07T05:29")).toISOString()).toBe("2026-12-07T00:00:00.000Z");
    expect(keralaDay(ist("2026-12-06T23:59")).toISOString()).toBe("2026-12-06T00:00:00.000Z");
  });
});

describe("trip countdown", () => {
  const trip = { startDate: "2026-12-18", endDate: "2026-12-27" };

  it("counts to 00:00 Kerala time on the start date", () => {
    const c = tripCountdown(trip, ist("2026-11-16T09:55"));
    expect(c.targetIso).toBe("2026-12-17T18:30:00.000Z");
    expect(c).toMatchObject({ phase: "before", daysToGo: 31, dayNumber: null, dayCount: 10 });
    // The big numeral and the ticking line add up to the same instant.
    expect(countdownParts(c.targetIso!, ist("2026-11-16T09:55"))).toEqual({ days: 31, hours: 14, minutes: 5 });
  });

  it("says tomorrow under 24 hours, including the hours before 05:30 IST", () => {
    // At exactly 00:00 it is still "1 day and 0 h"; a minute later, tomorrow.
    expect(tripCountdown(trip, ist("2026-12-17T00:00"))).toMatchObject({ phase: "before", daysToGo: 1 });
    expect(tripCountdown(trip, ist("2026-12-17T00:01"))).toMatchObject({ phase: "tomorrow", daysToGo: 0 });
    // 02:00 IST on the 17th is still the 16th in UTC, but tomorrow in Kerala.
    expect(tripCountdown(trip, ist("2026-12-16T23:59"))).toMatchObject({ phase: "before", daysToGo: 1 });
    expect(tripCountdown(trip, ist("2026-12-17T02:00"))).toMatchObject({ phase: "tomorrow", daysToGo: 0 });
    expect(countdownParts("2026-12-17T18:30:00.000Z", ist("2026-12-17T23:59"))).toEqual({ days: 0, hours: 0, minutes: 1 });
  });

  it("starts Day 1 at midnight in Kerala, not at 05:30", () => {
    expect(tripCountdown(trip, ist("2026-12-18T00:00"))).toMatchObject({ phase: "during", dayNumber: 1, daysToGo: null });
    expect(tripCountdown(trip, ist("2026-12-18T05:00"))).toMatchObject({ phase: "during", dayNumber: 1 });
    expect(tripCountdown(trip, ist("2026-12-19T03:00"))).toMatchObject({ phase: "during", dayNumber: 2 });
  });

  it("marks the last day, then home, again by the Kerala day", () => {
    expect(tripCountdown(trip, ist("2026-12-27T01:00"))).toMatchObject({ phase: "lastDay", dayNumber: 10 });
    expect(tripCountdown(trip, ist("2026-12-28T00:30"))).toMatchObject({ phase: "after", dayNumber: null });
    expect(countdownParts("2026-12-17T18:30:00.000Z", ist("2026-12-28T00:30"))).toEqual({ days: 0, hours: 0, minutes: 0 });
  });

  it("has no last day on a one-day trip, and no countdown without dates", () => {
    expect(tripCountdown({ startDate: "2026-12-18", endDate: "2026-12-18" }, ist("2026-12-18T12:00"))).toMatchObject({
      phase: "during",
      dayNumber: 1,
      dayCount: 1,
    });
    expect(tripCountdown({ startDate: null, endDate: null }, new Date())).toEqual({
      phase: "undated",
      daysToGo: null,
      targetIso: null,
      dayNumber: null,
      dayCount: null,
    });
  });
});

describe("multi-day blocks", () => {
  it("span whole 24-hour runs; a late evening stays one day", () => {
    const start = new Date("2026-12-21T08:00:00.000Z");
    expect(blockSpan(start, 7 * 1440)).toEqual({ endDay: "2026-12-27", spanDays: 7 });
    expect(blockSpan(start, 1440)).toEqual({ endDay: "2026-12-21", spanDays: 1 });
    expect(blockSpan(new Date("2026-12-21T22:00:00.000Z"), 180)).toEqual({ endDay: "2026-12-21", spanDays: 1 });
  });
});

describe("trip presence", () => {
  const block = (componentId: string, slug: string) =>
    ({ componentId, place: { slug, name: slug, city: null, photos: [] } }) as unknown as BuilderTrip["days"][number]["blocks"][number];
  const trip = {
    days: [
      { key: "2026-12-18", dayNumber: 1, blocks: [block("c1", "lab"), block("c2", "lab")] },
      { key: "2026-12-19", dayNumber: 2, blocks: [] },
      { key: "2026-12-20", dayNumber: 3, blocks: [block("c1", "lab"), block("c3", "boats")] },
    ],
  } as unknown as BuilderTrip;

  it("maps experiences and places to the days they are on", () => {
    expect(tripPresence(trip)).toEqual({
      byComponent: { c1: [1, 3], c2: [1], c3: [3] },
      byPlace: { lab: [1, 3], boats: [3] },
    });
    expect(tripPresence(null)).toEqual({ byComponent: {}, byPlace: {} });
  });
});

describe("day lead photos", () => {
  const hero = (url: string) => ({ url, alt: url, width: 2000, height: 1300, isHero: true, credit: null });
  const block = (moduleName: string, slug: string) =>
    ({ moduleName, spanDays: 1, day: "", endDay: "", place: { slug, name: slug, city: null, photos: [hero(`/${slug}.webp`)] } }) as unknown as BuilderTrip["days"][number]["blocks"][number];
  const trip = {
    days: [
      { key: "2026-12-18", dayNumber: 1, blocks: [block("Health & Medical", "lab"), block("Heritage & Culture", "theatre")] },
      { key: "2026-12-19", dayNumber: 2, blocks: [block("Health & Medical", "lab")] },
      { key: "2026-12-20", dayNumber: 3, blocks: [block("Health & Medical", "lab")] },
      { key: "2026-12-21", dayNumber: 4, blocks: [] },
    ],
  } as unknown as BuilderTrip;

  it("prefers wellness or culture, then health, then Kerala, never repeating the day before", () => {
    expect(dayPhotos(trip).map((p) => p.src)).toEqual(["/theatre.webp", "/lab.webp", freeDayPhoto(3).src, freeDayPhoto(4).src]);
  });
});

describe("refresh nonce", () => {
  it("goes before the hash so anchors survive", () => {
    expect(refreshUrl("/trip/itinerary?trip=t1#day-2026-12-18")).toMatch(/^\/trip\/itinerary\?trip=t1&u=[0-9a-f]{8}#day-2026-12-18$/);
    expect(refreshUrl("/trip#where")).toMatch(/^\/trip\?u=[0-9a-f]{8}#where$/);
    expect(refreshUrl("/trip")).toMatch(/^\/trip\?u=[0-9a-f]{8}$/);
  });
});

describe("portal returnTo allowlist", () => {
  it("keeps known portal pages and their query, adding the marker", () => {
    expect(safePortalReturn("/trip/explore?module=wellness", { added: "b1" })).toBe("/trip/explore?module=wellness&added=b1");
    expect(safePortalReturn("/trip/explore/kaumudi-ayurveda-retreat-demo?for=2026-12-21&u=abc&added=old", { added: "b2" })).toBe(
      "/trip/explore/kaumudi-ayurveda-retreat-demo?for=2026-12-21&added=b2",
    );
    expect(safePortalReturn("/trip/itinerary?trip=t1#day-2026-12-21")).toBe("/trip/itinerary?trip=t1#day-2026-12-21");
    expect(safePortalReturn("/trip")).toBe("/trip");
  });

  it("refuses anything that could leave the portal", () => {
    for (const bad of [
      "https://evil.example/trip/explore",
      "//evil.example/trip/explore",
      "/\\evil.example",
      "/trip/../admin",
      "/trip/explore/../../admin/clients",
      "/trip/sign-in",
      "/trip/explore/Bad_Slug",
      "/trip/explore/a/b",
      "/admin",
      "javascript:alert(1)",
      "/tripx",
      "",
    ]) {
      expect(safePortalReturn(bad), bad).toBeNull();
    }
  });
});

describe("vendor slugs", () => {
  it("are lower-case and hyphenated, with a suffix when taken", async () => {
    expect(slugify("Kairali - Ayurvedic Healing Village")).toBe("kairali-ayurvedic-healing-village");
    expect(slugify("Backwater Diagnostics Centre (demo)")).toBe("backwater-diagnostics-centre-demo");
    const taken = new Set(["oliva", "oliva-2"]);
    expect(await uniqueSlug("Oliva", async (s) => taken.has(s))).toBe("oliva-3");
    expect(await uniqueSlug("!!!", async () => false)).toBe("place");
  });
});

describe("partner photo pipeline rules", () => {
  it("drops unsourced lines and named individuals", () => {
    expect(
      cleanLines([
        "Founded 2019",
        "Surgeon named in third-party pages (unverified)",
        "Practice in Kochi per directories",
        "Director: Dr Example Person",
      ]),
    ).toEqual(["Founded 2019"]);
    expect(cleanSummary("A clinic in Kochi. Led by Dr Example Person. Offers consultations.")).toBe(
      "A clinic in Kochi. Offers consultations.",
    );
  });

  it("applies drop, alt and hero rulings; a narrow image is never the hero", () => {
    const manifest = {
      images: [
        { file: "01.jpg", shows: "Interior", hero: true },
        { file: "02.jpg", shows: "Garden", hero: true },
        { file: "03.jpg", shows: "Gate", hero: false },
      ],
    };
    type Planned = { file: string; alt: string; heroCandidate: boolean };
    const plan: Planned[] = planPhotos(manifest, { dropImages: ["03.jpg"], notHero: ["01.jpg"], altPrefix: { "01.jpg": "Studio design render: " } });
    expect(plan.map((p: Planned) => [p.file, p.alt, p.heroCandidate])).toEqual([
      ["01.jpg", "Studio design render: Interior", false],
      ["02.jpg", "Garden", true],
    ]);
    expect(heroIndex(plan.map((p: Planned) => ({ ...p, width: 2000 })))).toBe(1);
    expect(heroIndex(plan.map((p: Planned) => ({ ...p, width: 1000 })))).toBe(-1);
  });
});
