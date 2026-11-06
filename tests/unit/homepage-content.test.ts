import { describe, expect, it } from "vitest";
import * as content from "@/app/(site)/content";
import { formatPrice } from "@/domain/site/prices";

// The public site must never promise outcomes or give medical advice (CLAUDE.md §4).
const FORBIDDEN = /\b(cure[sd]?|heal(s|ed|ing)?|guarantee[sd]?|reverse[sd]?|treats? your|diagnos(e|is) you|recover(y)? in|100%|risk[- ]free|miracle)\b/i;

describe("homepage copy", () => {
  it("makes no outcome claims", () => {
    const text = JSON.stringify(content, (_key, value) => (typeof value === "function" ? undefined : value));
    expect(text).not.toMatch(FORBIDDEN);
  });

  it("says we are a concierge, not a clinic, and shows a price in euros and pounds on every tile", () => {
    expect(content.HERO.line).toMatch(/concierge, not a clinic/);
    expect(content.STATEMENT).toMatch(/concierge, not a clinic/);
    for (const item of content.EXPERIENCES) expect(formatPrice(item.priceFromEur)).toMatch(/^€[\d,]+ · ≈ £[\d,]+$/);
  });

  it("gives health, wellness and culture a page each, and every item a unique anchor on its page", () => {
    expect(content.MODULES.map((m) => [m.kind, m.href])).toEqual([
      ["health", "/health"],
      ["wellness", "/wellness"],
      ["culture", "/culture"],
    ]);
    for (const m of content.MODULES) expect(content.EXPERIENCES.some((item) => item.kind === m.kind)).toBe(true);
    const hrefs = content.EXPERIENCES.map(content.experienceHref);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(content.experienceHref(content.NEEDS[0])).toBe("/health#health-check");
    expect(content.experienceSlug("Kerala's kitchens")).toBe("kerala-s-kitchens");
  });

  it("explains cost as the provider's price plus our fee, nothing more", () => {
    expect(content.PRICING.map((p) => p.title)).toEqual(["What the provider charges", "Our service fee"]);
  });

  it("credits every photo and describes it for screen readers", () => {
    for (const photo of Object.values(content.PHOTOS)) {
      expect(photo.src).toMatch(/^https:\/\/images\.unsplash\.com\//);
      expect(photo.alt.length).toBeGreaterThan(10);
      expect(photo.credit).not.toBe("");
    }
  });
});
