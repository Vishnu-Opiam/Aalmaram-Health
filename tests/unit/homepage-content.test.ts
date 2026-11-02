import { describe, expect, it } from "vitest";
import * as content from "@/app/(site)/content";

// The public site must never promise outcomes or give medical advice (CLAUDE.md §4).
const FORBIDDEN = /\b(cure[sd]?|heal(s|ed|ing)?|guarantee[sd]?|reverse[sd]?|treats? your|diagnos(e|is) you|recover(y)? in|100%|risk[- ]free|miracle)\b/i;

describe("homepage copy", () => {
  it("makes no outcome claims", () => {
    const text = JSON.stringify(content, (_key, value) => (typeof value === "function" ? undefined : value));
    expect(text).not.toMatch(FORBIDDEN);
  });

  it("says we are a concierge, not a clinic, and shows a price on every tile", () => {
    expect(content.HERO.line).toMatch(/concierge, not a clinic/);
    for (const need of content.NEEDS) expect(need.price).toMatch(/€\d/);
  });
});
