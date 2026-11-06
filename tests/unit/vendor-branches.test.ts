import { describe, expect, it } from "vitest";
import { MAX_BRANCH_LINES, parseBranchLines } from "@/domain/vendors/branches";

describe("parseBranchLines", () => {
  it("reads one branch per line, with an optional address after the city", () => {
    const parsed = parseBranchLines("Malabar (demo), Kochi\n\n  Bekal (demo) , Kasaragod, Beach Road, Bekal  \r\n", []);
    expect(parsed).toEqual({
      branches: [
        { name: "Malabar (demo)", city: "Kochi", addressLine: null },
        { name: "Bekal (demo)", city: "Kasaragod", addressLine: "Beach Road, Bekal" },
      ],
      skipped: [],
      errors: [],
    });
  });

  it("skips names the vendor already has or that repeat, ignoring case", () => {
    const parsed = parseBranchLines("Kumarakom (demo), Kottayam\nkumarakom (DEMO), Kottayam\nVarkala (demo), Varkala", ["Varkala (demo)"]);
    expect(parsed.branches.map((b) => b.name)).toEqual(["Kumarakom (demo)"]);
    expect(parsed.skipped).toEqual(["kumarakom (DEMO)", "Varkala (demo)"]);
  });

  it("names every line it cannot read", () => {
    const parsed = parseBranchLines("Munnar (demo)\n, Kochi\nFort Kochi (demo), Kochi", []);
    expect(parsed.errors).toEqual([
      "Line 1: write the branch name, a comma, then the city.",
      "Line 2: write the branch name, a comma, then the city.",
    ]);
    expect(parsed.branches).toHaveLength(1);
  });

  it("refuses a paste longer than the limit", () => {
    const text = Array.from({ length: MAX_BRANCH_LINES + 1 }, (_, i) => `Branch ${i} (demo), Kochi`).join("\n");
    expect(parseBranchLines(text, []).errors).toHaveLength(1);
  });
});
