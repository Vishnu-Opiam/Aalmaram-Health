import { z } from "zod";

/**
 * Itinerary drafting, deterministic around the model (PLAN.md P4.2):
 *
 *   1. Slot budget — each day has a window (08:00–21:30) and an activity
 *      budget from the pace; existing blocks (the health core, the client's
 *      own) are kept and use it up first.
 *   2. Candidates — active components, minus avoided ones and anything
 *      already in the itinerary, scored by must-haves and the module-mix gap.
 *   3. Placement — must-haves first, then the module furthest below its target
 *      share, each at the first gap that fits its time of day.
 *
 * The model may then re-pick from the same candidates and gaps; whatever it
 * returns is validated by `validatePicks` and anything invalid is dropped.
 * Times are minutes after midnight (Kerala wall-clock); days are `YYYY-MM-DD`.
 */

export type Pace = "RELAXED" | "BALANCED" | "PACKED";

export type PlannerComponent = {
  id: string;
  name: string;
  moduleId: string;
  moduleName: string;
  catalogueName: string;
  tags: string[];
  durationMinutes: number;
  recoveryMinutes: number | null;
};

export type ExistingBlock = { day: string; start: number; end: number; moduleId: string; componentId: string };

export type PlannerInput = {
  days: string[];
  existing: ExistingBlock[];
  components: PlannerComponent[];
  targetMix: { moduleId: string; percent: number }[];
  pace: Pace | null;
  mustHaves: string[];
  avoid: string[];
};

export type PlannedBlock = { componentId: string; day: string; start: number; reason: string };

export const DAY_START = 8 * 60;
export const DAY_END = 21 * 60 + 30;
const BUFFER = 30;
const MAX_BLOCK = 10 * 60; // multi-day programmes are arranged by the team, not slotted

const PACE_BUDGET: Record<Pace, { minutes: number; blocks: number }> = {
  RELAXED: { minutes: 240, blocks: 2 },
  BALANCED: { minutes: 360, blocks: 3 },
  PACKED: { minutes: 480, blocks: 4 },
};

export function paceBudget(pace: Pace | null) {
  return PACE_BUDGET[pace ?? "BALANCED"];
}

type Window = { earliest: number; latest: number };

/** Time-of-day preference from tags: evening things in the evening, mornings early. */
export function preferredWindow(component: Pick<PlannerComponent, "tags" | "catalogueName">): Window {
  const tags = component.tags.map((t) => t.toLowerCase());
  if (tags.some((t) => /evening|dinner|night/.test(t)) || /restaurant/i.test(component.catalogueName)) {
    return { earliest: 18 * 60 + 30, latest: DAY_END };
  }
  if (tags.some((t) => /early-morning|sunrise/.test(t))) return { earliest: DAY_START, latest: 9 * 60 };
  if (tags.some((t) => /morning/.test(t))) return { earliest: DAY_START, latest: 11 * 60 + 30 };
  if (tags.some((t) => /afternoon/.test(t))) return { earliest: 13 * 60 + 30, latest: 18 * 60 };
  return { earliest: 9 * 60 + 30, latest: 18 * 60 };
}

/** Free gaps on a day, keeping a buffer around existing blocks. */
export function freeGaps(day: string, blocks: { day: string; start: number; end: number }[]): { start: number; end: number }[] {
  const busy = blocks
    .filter((b) => b.day === day)
    .map((b) => ({ start: b.start - BUFFER, end: b.end + BUFFER }))
    .sort((a, b) => a.start - b.start);
  const gaps: { start: number; end: number }[] = [];
  let cursor = DAY_START;
  for (const b of busy) {
    if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start, DAY_END) });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < DAY_END) gaps.push({ start: cursor, end: DAY_END });
  return gaps.filter((g) => g.end > g.start);
}

/** Earliest start (rounded up to a half hour) where the component fits a gap and its window. */
export function fitStart(component: PlannerComponent, gaps: { start: number; end: number }[]): number | null {
  const window = preferredWindow(component);
  const needed = component.durationMinutes + (component.recoveryMinutes ?? 0);
  for (const gap of gaps) {
    const start = Math.ceil(Math.max(gap.start, window.earliest) / 30) * 30;
    if (start <= window.latest && start + needed <= gap.end) return start;
  }
  return null;
}

const matches = (component: PlannerComponent, term: string) => {
  const t = term.toLowerCase().trim();
  if (!t) return false;
  // Name and tags only: a category name ("Backwaters & Nature") would make a spice walk "backwaters".
  const haystack = [component.name, ...component.tags].join(" ").toLowerCase();
  return t.split(/\s+/).every((word) => haystack.includes(word.replace(/s$/, "")));
};

export function candidateComponents(input: PlannerInput): PlannerComponent[] {
  const used = new Set(input.existing.map((b) => b.componentId));
  return input.components.filter(
    (c) =>
      !used.has(c.id) &&
      c.durationMinutes <= MAX_BLOCK &&
      !input.avoid.some((term) => matches(c, term)),
  );
}

/** Minutes per module, and each module's shortfall against its target share. */
function mixDeficits(input: PlannerInput, placed: { moduleId: string; minutes: number }[]) {
  const minutes = new Map<string, number>();
  for (const b of input.existing) minutes.set(b.moduleId, (minutes.get(b.moduleId) ?? 0) + (b.end - b.start));
  for (const p of placed) minutes.set(p.moduleId, (minutes.get(p.moduleId) ?? 0) + p.minutes);
  const total = [...minutes.values()].reduce((s, m) => s + m, 0) || 1;
  const targets = input.targetMix.length
    ? input.targetMix
    : [...new Set(input.components.map((c) => c.moduleId))].map((moduleId, _i, all) => ({ moduleId, percent: 100 / all.length }));
  return targets
    .map((t) => ({ moduleId: t.moduleId, target: t.percent, deficit: t.percent - ((minutes.get(t.moduleId) ?? 0) / total) * 100 }))
    .sort((a, b) => b.deficit - a.deficit);
}

/** The deterministic draft. */
export function draftPlan(input: PlannerInput): PlannedBlock[] {
  const budget = paceBudget(input.pace);
  const blocks = input.existing.map((b) => ({ day: b.day, start: b.start, end: b.end }));
  const dayLoad = new Map(input.days.map((d) => [d, { minutes: 0, added: 0 }]));
  for (const b of input.existing) {
    const load = dayLoad.get(b.day);
    if (load) load.minutes += b.end - b.start;
  }
  let pool = candidateComponents(input);
  const picks: PlannedBlock[] = [];
  const placed: { moduleId: string; minutes: number }[] = [];

  const place = (component: PlannerComponent, reason: string, days = input.days): boolean => {
    for (const day of days) {
      const load = dayLoad.get(day)!;
      if (load.added >= budget.blocks || load.minutes + component.durationMinutes > budget.minutes) continue;
      const start = fitStart(component, freeGaps(day, blocks));
      if (start === null) continue;
      picks.push({ componentId: component.id, day, start, reason });
      blocks.push({ day, start, end: start + component.durationMinutes + (component.recoveryMinutes ?? 0) });
      load.minutes += component.durationMinutes;
      load.added += 1;
      placed.push({ moduleId: component.moduleId, minutes: component.durationMinutes });
      pool = pool.filter((c) => c.id !== component.id);
      return true;
    }
    return false;
  };

  // 1. Must-haves first, each on the earliest day it fits.
  for (const term of input.mustHaves) {
    const component = pool.find((c) => matches(c, term));
    if (component) place(component, `You asked for ${term.toLowerCase()}.`);
  }

  // 2. Fill each day towards the target mix.
  for (const day of input.days) {
    for (let guard = 0; guard < budget.blocks; guard++) {
      const deficits = mixDeficits(input, placed);
      let added = false;
      for (const { moduleId, deficit } of deficits) {
        if (deficit <= 0 && picks.length > 0) break;
        const options = pool.filter((c) => c.moduleId === moduleId);
        const component = options.find((c) => fitStart(c, freeGaps(day, blocks)) !== null);
        if (component && place(component, mixReason(component.moduleName), [day])) {
          added = true;
          break;
        }
      }
      if (!added) break;
    }
  }
  return picks.sort((a, b) => a.day.localeCompare(b.day) || a.start - b.start);
}

function mixReason(moduleName: string): string {
  const family = /health/i.test(moduleName) ? "health" : /wellness/i.test(moduleName) ? "wellness" : "culture";
  return `Balances your trip with a little more ${family}, in a free part of the day.`;
}

/** What the model may return when it re-picks. */
export const draftPicksSchema = z.object({
  picks: z
    .array(
      z.object({
        componentId: z.string(),
        day: z.string(),
        time: z.string(),
        reason: z.string().max(200),
      }),
    )
    .max(40),
});

/**
 * Keeps only picks that use offered components once, on trip days, inside the
 * day window, without overlapping existing blocks or each other.
 */
export function validatePicks(
  raw: { componentId: string; day: string; time: string; reason: string }[],
  input: PlannerInput,
): PlannedBlock[] {
  const offered = new Map(candidateComponents(input).map((c) => [c.id, c]));
  const days = new Set(input.days);
  const taken = input.existing.map((b) => ({ day: b.day, start: b.start, end: b.end }));
  const used = new Set<string>();
  const valid: PlannedBlock[] = [];
  for (const pick of raw) {
    const component = offered.get(pick.componentId);
    const m = /^(\d{1,2}):(\d{2})$/.exec(pick.time);
    if (!component || !days.has(pick.day) || !m || used.has(component.id)) continue;
    const start = Number(m[1]) * 60 + Number(m[2]);
    const end = start + component.durationMinutes + (component.recoveryMinutes ?? 0);
    if (start < DAY_START || end > DAY_END) continue;
    if (taken.some((b) => b.day === pick.day && start < b.end && b.start < end)) continue;
    taken.push({ day: pick.day, start, end });
    used.add(component.id);
    valid.push({ componentId: component.id, day: pick.day, start, reason: pick.reason });
  }
  return valid;
}

export type SlotSuggestion = { componentId: string; reason: string };

/**
 * Ranked ideas for one "+" in the builder: things that fit between the
 * previous block and the next, best first — must-haves, then whatever moves
 * the mix towards its target, then whatever suits the time of day.
 */
export function suggestForSlot(input: PlannerInput, day: string, start: number, limit = 4): SlotSuggestion[] {
  const blocks = input.existing.map((b) => ({ day: b.day, start: b.start, end: b.end }));
  const next = blocks.filter((b) => b.day === day && b.start >= start).sort((a, b) => a.start - b.start)[0];
  const gapEnd = next ? next.start : DAY_END;
  const deficits = new Map(mixDeficits(input, []).map((d) => [d.moduleId, d.deficit]));

  return candidateComponents(input)
    .map((c) => {
      const window = preferredWindow(c);
      const fits = start + c.durationMinutes + (c.recoveryMinutes ?? 0) <= gapEnd;
      const must = input.mustHaves.find((term) => matches(c, term));
      const deficit = deficits.get(c.moduleId) ?? 0;
      const timely = start >= window.earliest - 60 && start <= window.latest;
      const score = (must ? 100 : 0) + Math.max(-20, Math.min(40, deficit)) + (timely ? 15 : 0);
      const reason = must
        ? `You mentioned ${must.toLowerCase()}.`
        : deficit > 5
          ? mixReason(c.moduleName)
          : timely
            ? "A good fit for this time of day."
            : "Fits the time you have free.";
      return { c, fits, score, reason };
    })
    .filter((x) => x.fits)
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name))
    .slice(0, limit)
    .map((x) => ({ componentId: x.c.id, reason: x.reason }));
}

export const minutesToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// ---------------------------------------------------------------------------
// The portal board: "Ideas for you", interests from the chat, drop on a day
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(
  "the and for with that this there would like love can could just visit some about what want into also very really much more have from your you our are was were will them they lot any see".split(" "),
);

// Everyday words clients use → the words our components are tagged with.
const SYNONYMS: Record<string, string[]> = {
  art: ["performance", "kathakali"],
  arts: ["performance", "kathakali"],
  dance: ["performance", "kathakali"],
  theatre: ["performance", "kathakali"],
  music: ["performance"],
  history: ["heritage", "history"],
  boat: ["backwaters", "boat", "canoe"],
  lake: ["backwaters"],
  spa: ["massage", "wellness"],
  relax: ["relaxation", "massage", "restorative"],
  eat: ["food", "dinner"],
  cook: ["cooking"],
  walk: ["walking"],
  nature: ["nature"],
  spice: ["spice"],
};

const singular = (word: string) => (word.length > 3 ? word.replace(/s$/, "") : word);

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

/**
 * Components the client's own words point at ("I love this art" → Kathakali),
 * best first, with the word that matched. Health is left to the team: the
 * client's health core is arranged by staff, and we never suggest a clinical
 * service from what someone says about themselves.
 */
export function interestMatches(
  texts: string[],
  components: PlannerComponent[],
): { componentId: string; term: string }[] {
  const terms = new Map<string, string>();
  for (const word of texts.flatMap(words)) {
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    const root = singular(word);
    for (const key of [root, ...(SYNONYMS[word] ?? SYNONYMS[root] ?? [])]) if (!terms.has(key)) terms.set(key, word);
  }
  return components
    .filter((c) => !/health|medical/i.test(c.moduleName))
    .map((c) => {
      // Name and tags only, as with must-haves: a category name is too broad.
      const own = new Set([c.name, ...c.tags].flatMap(words).map(singular));
      const hits = [...terms.keys()].filter((t) => own.has(t));
      return { c, hits };
    })
    .filter((x) => x.hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length || a.c.name.localeCompare(b.c.name))
    .map((x) => ({ componentId: x.c.id, term: terms.get(x.hits[0])! }));
}

/**
 * Start time for something dropped on a day: the first free gap that suits
 * it, else straight after the day's last activity (the builder then shows an
 * overlap warning and the client can change the time).
 */
export function startOnDay(input: PlannerInput, componentId: string, day: string): number {
  const component = input.components.find((c) => c.id === componentId);
  const blocks = input.existing.map((b) => ({ day: b.day, start: b.start, end: b.end }));
  const fitted = component ? fitStart(component, freeGaps(day, blocks)) : null;
  if (fitted !== null) return fitted;
  const lastEnd = Math.max(DAY_START + 60, ...blocks.filter((b) => b.day === day).map((b) => b.end));
  return Math.min(Math.ceil(lastEnd / 30) * 30, 20 * 60 + 30);
}
