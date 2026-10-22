import { describe, expect, it } from "vitest";
import {
  draftPlan,
  freeGaps,
  suggestForSlot,
  validatePicks,
  type PlannerComponent,
  type PlannerInput,
} from "@/domain/ai/planner";
import { heuristicRequirements, parseBudget, requirementsDraftSchema } from "@/domain/ai/extraction";
import { minimisePii } from "@/domain/ai/pii";
import { findMedicalClaims, isMedicalQuestion, MEDICAL_DEFLECTION, safeText } from "@/domain/ai/safety";
import { appendToTranscript, CHAT_GREETING, parseTranscript, scriptedReply } from "@/domain/ai/chat";

const comp = (id: string, moduleId: string, extra: Partial<PlannerComponent> = {}): PlannerComponent => ({
  id,
  name: id,
  moduleId,
  moduleName: { h: "Health & Medical", w: "Wellness & Spa", c: "Heritage & Culture" }[moduleId] ?? moduleId,
  catalogueName: "General",
  tags: [],
  durationMinutes: 60,
  recoveryMinutes: null,
  ...extra,
});

const base = (overrides: Partial<PlannerInput> = {}): PlannerInput => ({
  days: ["2026-12-06", "2026-12-07", "2026-12-08"],
  existing: [{ day: "2026-12-06", start: 8 * 60, end: 8 * 60 + 30, moduleId: "h", componentId: "blood" }],
  components: [
    comp("blood", "h"),
    comp("massage", "w", { name: "Swedish Massage", tags: ["massage", "afternoon"] }),
    comp("yoga", "w", { name: "Private Yoga Session", tags: ["yoga", "morning"] }),
    comp("kathakali", "c", { name: "Kathakali Performance", tags: ["kathakali", "evening"], durationMinutes: 150 }),
    comp("walk", "c", { name: "Fort Kochi Walking Tour", tags: ["walking", "morning"], durationMinutes: 150 }),
    comp("dinner", "c", { name: "Dinner at the harbour", catalogueName: "Restaurants", durationMinutes: 90 }),
    comp("panchakarma", "w", { name: "Seven-Day Programme", durationMinutes: 7 * 24 * 60 }),
  ],
  targetMix: [
    { moduleId: "h", percent: 40 },
    { moduleId: "w", percent: 30 },
    { moduleId: "c", percent: 30 },
  ],
  pace: "RELAXED",
  mustHaves: ["Kathakali"],
  avoid: [],
  ...overrides,
});

function overlaps(blocks: { day: string; start: number; end: number }[]) {
  return blocks.some((a, i) => blocks.some((b, j) => i !== j && a.day === b.day && a.start < b.end && b.start < a.end));
}

describe("draftPlan", () => {
  it("places must-haves, respects time of day and never touches existing blocks", () => {
    const input = base();
    const plan = draftPlan(input);
    const kathakali = plan.find((p) => p.componentId === "kathakali");
    expect(kathakali?.reason).toMatch(/kathakali/i);
    expect(kathakali!.start).toBeGreaterThanOrEqual(18 * 60 + 30);
    expect(plan.some((p) => p.componentId === "blood")).toBe(false);

    const byId = new Map(input.components.map((c) => [c.id, c]));
    const all = [
      ...input.existing,
      ...plan.map((p) => ({ day: p.day, start: p.start, end: p.start + byId.get(p.componentId)!.durationMinutes })),
    ];
    expect(overlaps(all)).toBe(false);
  });

  it("keeps to the pace: at most two new blocks a day when relaxed", () => {
    const plan = draftPlan(base());
    for (const day of base().days) expect(plan.filter((p) => p.day === day).length).toBeLessThanOrEqual(2);
    const packed = draftPlan(base({ pace: "PACKED" }));
    expect(packed.length).toBeGreaterThanOrEqual(plan.length);
  });

  it("skips avoided and multi-day components, and uses each component once", () => {
    const plan = draftPlan(base({ avoid: ["massage"] }));
    const ids = plan.map((p) => p.componentId);
    expect(ids).not.toContain("massage");
    expect(ids).not.toContain("panchakarma");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns nothing when there is nothing to offer", () => {
    expect(draftPlan(base({ components: [comp("blood", "h")], mustHaves: [] }))).toEqual([]);
  });
});

describe("validatePicks", () => {
  it("drops invented ids, unknown days, clashes and times outside the day", () => {
    const valid = validatePicks(
      [
        { componentId: "invented", day: "2026-12-06", time: "10:00", reason: "x" },
        { componentId: "yoga", day: "2027-01-01", time: "10:00", reason: "x" },
        { componentId: "yoga", day: "2026-12-06", time: "08:00", reason: "clashes with the blood test" },
        { componentId: "dinner", day: "2026-12-06", time: "21:00", reason: "ends after 21:30" },
        { componentId: "massage", day: "2026-12-07", time: "15:00", reason: "ok" },
        { componentId: "massage", day: "2026-12-08", time: "15:00", reason: "duplicate" },
      ],
      base(),
    );
    expect(valid).toEqual([{ componentId: "massage", day: "2026-12-07", start: 15 * 60, reason: "ok" }]);
  });
});

describe("freeGaps and suggestForSlot", () => {
  it("keeps a buffer around existing blocks", () => {
    expect(freeGaps("2026-12-06", base().existing)[0]).toEqual({ start: 9 * 60, end: 21 * 60 + 30 });
  });

  it("ranks must-haves first and only offers what fits before the next block", () => {
    const input = base({
      existing: [
        { day: "2026-12-06", start: 8 * 60, end: 8 * 60 + 30, moduleId: "h", componentId: "blood" },
        { day: "2026-12-06", start: 20 * 60, end: 21 * 60, moduleId: "c", componentId: "dinner" },
      ],
    });
    const evening = suggestForSlot(input, "2026-12-06", 17 * 60 + 30);
    expect(evening[0].componentId).toBe("kathakali");
    expect(evening[0].reason).toMatch(/kathakali/i);
    // 17:30 + 150 min ends exactly at the 20:00 dinner; from 18:30 it would run into it.
    const tight = suggestForSlot(input, "2026-12-06", 18 * 60 + 30);
    expect(tight.map((s) => s.componentId)).not.toContain("kathakali");
  });
});

describe("requirements extraction (deterministic)", () => {
  const transcript = `Client: I'd like a proper check-up, blood tests and a scan, and a doctor who'll go through them in English.
I like to travel slowly, free afternoons. I've always wanted to see Kathakali and the backwaters, maybe yoga.
Budget around three thousand euros. I don't want early starts every day.`;
  const modules = ["Health & Medical", "Wellness & Spa", "Heritage & Culture"];

  it("reads pace, budget, interests and things to avoid", () => {
    const draft = requirementsDraftSchema.parse(heuristicRequirements(transcript, modules));
    expect(draft.pace).toBe("RELAXED");
    expect(draft.budgetAmount).toBe(3000);
    expect(draft.mustHaves).toEqual(expect.arrayContaining(["Kathakali", "Backwaters", "Yoga", "Check-up", "Blood tests"]));
    expect(draft.avoid).toContain("Early starts");
    expect(draft.moduleMix.map((m) => m.moduleName).sort()).toEqual([...modules].sort());
    expect(findMedicalClaims(draft.summary + draft.brief)).toEqual([]);
  });

  it("says unknown rather than guessing", () => {
    const draft = heuristicRequirements("Hello, we'd like to visit.", modules);
    expect(draft.pace).toBeNull();
    expect(draft.budgetAmount).toBeNull();
    expect(draft.moduleMix).toEqual([]);
  });

  it.each([
    ["about €3,000", 3000],
    ["2500 euros", 2500],
    ["five thousand euros", 5000],
    ["no idea", null],
    ["€ 0", null],
  ])("parses a budget from %s", (text, value) => {
    expect(parseBudget(text)).toBe(value);
  });
});

describe("PII minimisation", () => {
  it("removes emails, phone numbers and the client's name", () => {
    const out = minimisePii("Elena Fischer (demo) — elena@example.com, +49 30 123 4567. Elena likes yoga.", [
      "Elena Fischer (demo)",
    ]);
    expect(out).not.toMatch(/Elena|Fischer|example\.com|4567/);
    expect(out).toContain("likes yoga");
  });
});

describe("medical safety", () => {
  it.each([
    "This programme will reduce your blood pressure.",
    "Your results show you are healthy.",
    "We guarantee you will feel better.",
    "The doctor will diagnose the problem.",
    "You should stop taking aspirin.",
  ])("flags: %s", (text) => {
    expect(findMedicalClaims(text).length).toBeGreaterThan(0);
    expect(safeText(text, "fallback")).toBe("fallback");
  });

  it.each([
    "You asked for kathakali.",
    "A one-hour consultation with a senior physician who speaks English.",
    "Balances your trip with a little more wellness, in a free part of the day.",
  ])("allows: %s", (text) => {
    expect(findMedicalClaims(text)).toEqual([]);
  });

  it("recognises medical questions and deflects them in the scripted chat", () => {
    expect(isMedicalQuestion("Is it safe to do the MRI if I have a pacemaker?")).toBe(true);
    expect(isMedicalQuestion("Can I see Kathakali?")).toBe(false);
    const reply = scriptedReply([{ role: "client", text: "What does my result mean for my cholesterol?" }]);
    expect(reply.reply).toBe(MEDICAL_DEFLECTION);
  });

  it("keeps every fixed assistant line free of medical claims", () => {
    const lines = [CHAT_GREETING, MEDICAL_DEFLECTION];
    for (let i = 1; i <= 5; i++) {
      lines.push(scriptedReply(Array.from({ length: i }, () => ({ role: "client" as const, text: "ok" }))).reply);
    }
    for (const line of lines) expect(findMedicalClaims(line)).toEqual([]);
  });
});

describe("chat transcript", () => {
  it("round-trips messages, keeping line breaks but not blank lines", () => {
    let t = appendToTranscript("", { role: "client", text: "Hello\n\n\nthere" });
    t = appendToTranscript(t, { role: "assistant", text: "Hi!" });
    expect(parseTranscript(t)).toEqual([
      { role: "client", text: "Hello\nthere" },
      { role: "assistant", text: "Hi!" },
    ]);
  });

  it("asks discovery questions, then invites the client to build", () => {
    const one = scriptedReply([{ role: "client", text: "Hi" }]);
    expect(one.readyToBuild).toBe(false);
    const three = scriptedReply(Array.from({ length: 3 }, () => ({ role: "client" as const, text: "x" })));
    expect(three.readyToBuild).toBe(true);
  });
});
