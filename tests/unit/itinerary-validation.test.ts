import { describe, expect, it } from "vitest";
import {
  validateItineraryForPublication,
  type ValidatableItinerary,
} from "@/domain/itineraries/validation";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function itinerary(
  overrides: Partial<ValidatableItinerary> = {},
): ValidatableItinerary {
  return {
    title: "Ten days in Kerala",
    startDate: day("2026-03-01"),
    endDate: day("2026-03-10"),
    client: { id: "client_1", name: "Elena Fischer" },
    items: [
      {
        id: "item_1",
        scheduledDate: day("2026-03-02"),
        status: "PLANNED",
        customTitle: null,
        component: { id: "comp_1", name: "Blood Panel", status: "ACTIVE" },
      },
    ],
    ...overrides,
  };
}

const codes = (result: { issues: { code: string }[] }) =>
  result.issues.map((issue) => issue.code);

describe("validateItineraryForPublication", () => {
  it("passes for a complete, in-range itinerary", () => {
    const result = validateItineraryForPublication(itinerary());
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("requires a client", () => {
    const result = validateItineraryForPublication(itinerary({ client: null }));
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain("CLIENT_MISSING");
  });

  it("requires a non-blank title", () => {
    const result = validateItineraryForPublication(itinerary({ title: "   " }));
    expect(codes(result)).toContain("TITLE_MISSING");
  });

  it("requires both trip dates", () => {
    expect(
      codes(validateItineraryForPublication(itinerary({ startDate: null }))),
    ).toContain("TRIP_DATES_MISSING");
    expect(
      codes(validateItineraryForPublication(itinerary({ endDate: null }))),
    ).toContain("TRIP_DATES_MISSING");
  });

  it("rejects an end date before the start date", () => {
    const result = validateItineraryForPublication(
      itinerary({ startDate: day("2026-03-10"), endDate: day("2026-03-01") }),
    );
    expect(codes(result)).toContain("TRIP_DATES_INVERTED");
  });

  it("requires at least one item", () => {
    const result = validateItineraryForPublication(itinerary({ items: [] }));
    expect(codes(result)).toContain("NO_ITEMS");
  });

  it("ignores REMOVED items when counting, and treats an all-removed itinerary as empty", () => {
    const result = validateItineraryForPublication(
      itinerary({
        items: [
          {
            id: "item_1",
            scheduledDate: null,
            status: "REMOVED",
            customTitle: null,
            component: { id: "c", name: "Dropped", status: "ACTIVE" },
          },
        ],
      }),
    );
    expect(codes(result)).toContain("NO_ITEMS");
    // The removed item's missing date must NOT be reported.
    expect(codes(result)).not.toContain("ITEM_DATE_MISSING");
  });

  it("rejects an item whose component is deactivated", () => {
    const result = validateItineraryForPublication(
      itinerary({
        items: [
          {
            id: "item_1",
            scheduledDate: day("2026-03-02"),
            status: "PLANNED",
            customTitle: null,
            component: { id: "c", name: "Retired Test", status: "INACTIVE" },
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain("ITEM_COMPONENT_INACTIVE");
    expect(result.issues[0].message).toContain("Retired Test");
  });

  it("rejects an item with a dangling component reference", () => {
    const result = validateItineraryForPublication(
      itinerary({
        items: [
          {
            id: "item_1",
            scheduledDate: day("2026-03-02"),
            status: "PLANNED",
            customTitle: "Custom name",
            component: null,
          },
        ],
      }),
    );
    expect(codes(result)).toContain("ITEM_COMPONENT_MISSING");
  });

  it("requires every active item to have a proposed date", () => {
    const result = validateItineraryForPublication(
      itinerary({
        items: [
          {
            id: "item_1",
            scheduledDate: null,
            status: "PLANNED",
            customTitle: null,
            component: { id: "c", name: "Yoga", status: "ACTIVE" },
          },
        ],
      }),
    );
    expect(codes(result)).toContain("ITEM_DATE_MISSING");
  });

  it("rejects a date outside the trip window, on either side", () => {
    const before = validateItineraryForPublication(
      itinerary({
        items: [
          {
            id: "a",
            scheduledDate: day("2026-02-28"),
            status: "PLANNED",
            customTitle: null,
            component: { id: "c", name: "Early", status: "ACTIVE" },
          },
        ],
      }),
    );
    const after = validateItineraryForPublication(
      itinerary({
        items: [
          {
            id: "b",
            scheduledDate: day("2026-03-11"),
            status: "PLANNED",
            customTitle: null,
            component: { id: "c", name: "Late", status: "ACTIVE" },
          },
        ],
      }),
    );
    expect(codes(before)).toContain("ITEM_DATE_OUT_OF_RANGE");
    expect(codes(after)).toContain("ITEM_DATE_OUT_OF_RANGE");
  });

  it("accepts items on the boundary dates themselves", () => {
    const result = validateItineraryForPublication(
      itinerary({
        items: [
          {
            id: "a",
            scheduledDate: day("2026-03-01"),
            status: "PLANNED",
            customTitle: null,
            component: { id: "c", name: "First day", status: "ACTIVE" },
          },
          {
            id: "b",
            scheduledDate: day("2026-03-10"),
            status: "PLANNED",
            customTitle: null,
            component: { id: "d", name: "Last day", status: "ACTIVE" },
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("does not report range errors when the trip dates are themselves invalid", () => {
    const result = validateItineraryForPublication(
      itinerary({
        startDate: day("2026-03-10"),
        endDate: day("2026-03-01"),
        items: [
          {
            id: "a",
            scheduledDate: day("2026-03-05"),
            status: "PLANNED",
            customTitle: null,
            component: { id: "c", name: "Mid", status: "ACTIVE" },
          },
        ],
      }),
    );
    expect(codes(result)).toContain("TRIP_DATES_INVERTED");
    expect(codes(result)).not.toContain("ITEM_DATE_OUT_OF_RANGE");
  });

  it("collects every issue rather than stopping at the first", () => {
    const result = validateItineraryForPublication(
      itinerary({
        title: "",
        startDate: null,
        endDate: null,
        items: [],
      }),
    );
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });
});
