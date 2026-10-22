import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { formatMoney } from "@/domain/itineraries/pricing";
import { blockPrice, itineraryTotal } from "@/domain/trips/blocks";

const d = (value: string) => new Prisma.Decimal(value);

describe("blockPrice", () => {
  it("multiplies a per-person price by the travellers", () => {
    expect(blockPrice(d("185.00"), "PER_PERSON", 2).toString()).toBe("370");
  });

  it("charges one 'for two' price per two travellers, rounding up", () => {
    expect(blockPrice(d("35"), "FOR_TWO", 1).toString()).toBe("35");
    expect(blockPrice(d("35"), "FOR_TWO", 2).toString()).toBe("35");
    expect(blockPrice(d("35"), "FOR_TWO", 3).toString()).toBe("70");
  });

  it("charges a group price once", () => {
    expect(blockPrice(d("260"), "PER_GROUP", 4).toString()).toBe("260");
  });

  it("treats zero or fractional travellers as at least one person", () => {
    expect(blockPrice(d("10"), "PER_PERSON", 0).toString()).toBe("10");
    expect(blockPrice(d("10"), "PER_PERSON", 2.7).toString()).toBe("20");
  });
});

describe("itineraryTotal", () => {
  it("adds prices exactly, without floating point drift", () => {
    const { total } = itineraryTotal([
      { price: d("0.10"), currency: "EUR" },
      { price: d("0.20"), currency: "EUR" },
    ]);
    expect(total.toString()).toBe("0.3");
  });

  it("returns zero in EUR for an empty itinerary", () => {
    const result = itineraryTotal([]);
    expect(result.total.toString()).toBe("0");
    expect(result.currency).toBe("EUR");
    expect(result.mixedCurrencies).toBe(false);
  });

  it("surfaces a mixed-currency itinerary rather than hiding it", () => {
    const result = itineraryTotal([
      { price: d("1"), currency: "EUR" },
      { price: d("1"), currency: "INR" },
    ]);
    expect(result.mixedCurrencies).toBe(true);
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
