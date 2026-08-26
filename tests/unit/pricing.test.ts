import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  countsTowardsTotal,
  currenciesUsed,
  effectivePrice,
  formatMoney,
  sumItems,
  totalsByDay,
  type PriceableItem,
} from "@/domain/itineraries/pricing";

const d = (value: string) => new Prisma.Decimal(value);

function item(
  price: string,
  overrides: Partial<PriceableItem> & { dayNumber?: number | null } = {},
) {
  return {
    priceOverride: null,
    status: "PLANNED" as const,
    component: { price: d(price), currency: "EUR" },
    dayNumber: null,
    ...overrides,
  };
}

describe("effectivePrice", () => {
  it("uses the component price when there is no override", () => {
    expect(effectivePrice(item("185.00")).toString()).toBe("185");
  });

  it("prefers the override when one is set", () => {
    expect(
      effectivePrice(item("185.00", { priceOverride: d("150.00") })).toString(),
    ).toBe("150");
  });

  it("honours an override of exactly zero", () => {
    expect(
      effectivePrice(item("185.00", { priceOverride: d("0") })).toString(),
    ).toBe("0");
  });
});

describe("sumItems", () => {
  it("adds prices exactly, without floating point drift", () => {
    // 0.1 + 0.2 must be 0.3, which it would not be with JS numbers.
    const total = sumItems([item("0.10"), item("0.20")]);
    expect(total.toString()).toBe("0.3");
    expect(total.equals(d("0.30"))).toBe(true);
  });

  it("excludes REMOVED items", () => {
    const total = sumItems([
      item("100.00"),
      item("50.00", { status: "REMOVED" }),
      item("25.00", { status: "CONFIRMED" }),
    ]);
    expect(total.toString()).toBe("125");
  });

  it("returns zero for an empty itinerary", () => {
    expect(sumItems([]).toString()).toBe("0");
  });

  it("applies overrides inside the total", () => {
    const total = sumItems([
      item("185.00", { priceOverride: d("100.00") }),
      item("15.00"),
    ]);
    expect(total.toString()).toBe("115");
  });
});

describe("countsTowardsTotal", () => {
  it("counts PLANNED and CONFIRMED, not REMOVED", () => {
    expect(countsTowardsTotal(item("1"))).toBe(true);
    expect(countsTowardsTotal(item("1", { status: "CONFIRMED" }))).toBe(true);
    expect(countsTowardsTotal(item("1", { status: "REMOVED" }))).toBe(false);
  });
});

describe("totalsByDay", () => {
  it("groups by day and orders days ascending", () => {
    const totals = totalsByDay([
      item("100.00", { dayNumber: 2 }),
      item("50.00", { dayNumber: 1 }),
      item("25.00", { dayNumber: 1 }),
    ]);
    expect(totals.map((t) => t.dayNumber)).toEqual([1, 2]);
    expect(totals[0].total.toString()).toBe("75");
    expect(totals[0].itemCount).toBe(2);
    expect(totals[1].total.toString()).toBe("100");
  });

  it("places unscheduled items last", () => {
    const totals = totalsByDay([
      item("10.00", { dayNumber: null }),
      item("20.00", { dayNumber: 3 }),
    ]);
    expect(totals.at(-1)?.dayNumber).toBeNull();
  });

  it("omits REMOVED items from day totals", () => {
    const totals = totalsByDay([
      item("100.00", { dayNumber: 1 }),
      item("999.00", { dayNumber: 1, status: "REMOVED" }),
    ]);
    expect(totals).toHaveLength(1);
    expect(totals[0].total.toString()).toBe("100");
    expect(totals[0].itemCount).toBe(1);
  });
});

describe("currenciesUsed", () => {
  it("reports a single currency once", () => {
    expect(currenciesUsed([item("1"), item("2")])).toEqual(["EUR"]);
  });

  it("surfaces a mixed-currency itinerary rather than hiding it", () => {
    const mixed = currenciesUsed([
      item("1"),
      item("2", { component: { price: d("2"), currency: "INR" } }),
    ]);
    expect(mixed).toEqual(["EUR", "INR"]);
  });

  it("ignores the currency of REMOVED items", () => {
    const used = currenciesUsed([
      item("1"),
      item("2", {
        status: "REMOVED",
        component: { price: d("2"), currency: "USD" },
      }),
    ]);
    expect(used).toEqual(["EUR"]);
  });
});

describe("formatMoney", () => {
  it("renders euros with two decimals", () => {
    expect(formatMoney(d("185"), "EUR")).toMatch(/185\.00/);
    expect(formatMoney(d("185"), "EUR")).toMatch(/€/);
  });

  it("accepts a plain number or string", () => {
    expect(formatMoney(42, "EUR")).toMatch(/42\.00/);
    expect(formatMoney("42.50", "EUR")).toMatch(/42\.50/);
  });

  it("degrades to zero rather than NaN for junk input", () => {
    expect(formatMoney("not-a-number", "EUR")).toMatch(/0\.00/);
  });
});
