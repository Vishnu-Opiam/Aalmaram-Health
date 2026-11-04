import { describe, expect, it } from "vitest";
import { adjustMix, MIX_KEYS, MIX_PRESETS, pickExamples, type Mix, type MixKey } from "@/domain/site/mix";
import { formatPrice, formatPriceRange, toGbp } from "@/domain/site/prices";

const total = (mix: Mix) => MIX_KEYS.reduce((sum, k) => sum + mix[k], 0);

describe("adjustMix", () => {
  it("keeps the total at 100 and takes from the largest other share", () => {
    const next = adjustMix({ health: 40, wellness: 30, culture: 30 }, "culture", 1);
    expect(next).toEqual({ health: 30, wellness: 30, culture: 40 });
    expect(total(next)).toBe(100);
  });

  it("gives a lowered share to the smallest other share", () => {
    expect(adjustMix({ health: 60, wellness: 20, culture: 20 }, "health", -1)).toEqual({ health: 50, wellness: 30, culture: 20 });
  });

  it("stops at 0 and 100", () => {
    const empty = { health: 0, wellness: 50, culture: 50 };
    expect(adjustMix(empty, "health", -1)).toBe(empty);
    const full = { health: 100, wellness: 0, culture: 0 };
    expect(adjustMix(full, "health", 1)).toBe(full);
  });

  it("stays at 100 over many random presses", () => {
    let mix: Mix = { health: 40, wellness: 30, culture: 30 };
    for (let i = 0; i < 200; i++) {
      mix = adjustMix(mix, MIX_KEYS[i % 3], i % 7 < 4 ? 1 : -1);
      expect(total(mix)).toBe(100);
      for (const k of MIX_KEYS) expect(mix[k]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("pickExamples", () => {
  const pool = (["health", "health", "health", "health", "health", "wellness", "wellness", "wellness", "culture", "culture", "culture", "culture"] as MixKey[]).map(
    (kind, i) => ({ id: i, kind }),
  );
  const count = (items: { kind: MixKey }[], kind: MixKey) => items.filter((i) => i.kind === kind).length;

  it("follows the shares", () => {
    const picked = pickExamples(MIX_PRESETS[0].mix, pool);
    expect(picked).toHaveLength(6);
    expect([count(picked, "health"), count(picked, "wellness"), count(picked, "culture")]).toEqual([4, 1, 1]);
  });

  it("fills a short category from the others without repeats", () => {
    const picked = pickExamples({ health: 0, wellness: 100, culture: 0 }, pool);
    expect(picked).toHaveLength(6);
    expect(count(picked, "wellness")).toBe(3);
    expect(new Set(picked).size).toBe(6);
  });
});

describe("prices", () => {
  it("shows euros with an approximate pound figure rounded to £5", () => {
    expect(toGbp(250)).toBe(215);
    expect(formatPrice(250)).toBe("€250 · ≈ £215");
    expect(formatPriceRange(2200, 3000)).toBe("€2,200–€3,000 · ≈ £1,890–£2,580");
  });
});
