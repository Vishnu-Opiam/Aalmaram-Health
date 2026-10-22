import { z } from "zod";

/**
 * Conversation → trip requirements. The model (or the deterministic
 * fallback) returns this shape; module names are checked against the modules
 * we offered, and anything unknown is dropped rather than guessed.
 */
export const requirementsDraftSchema = z.object({
  summary: z.string().min(1).max(1200),
  moduleMix: z.array(z.object({ moduleName: z.string(), percent: z.number().min(0).max(100) })).max(10),
  budgetAmount: z.number().nonnegative().nullable(),
  budgetCurrency: z.string().length(3).nullable(),
  pace: z.enum(["RELAXED", "BALANCED", "PACKED"]).nullable(),
  mustHaves: z.array(z.string().min(1).max(80)).max(12),
  avoid: z.array(z.string().min(1).max(80)).max(12),
  brief: z.string().min(1).max(600),
});

export type RequirementsDraft = z.infer<typeof requirementsDraftSchema>;

/** Keywords the deterministic extractor recognises, per module family. */
const MODULE_KEYWORDS: { match: RegExp; words: RegExp }[] = [
  { match: /health|medical/i, words: /\b(check-?up|blood|scan|mri|doctor|physician|cardiac|heart|diagnostic|consultation|report|dermatolog|health)\w*/gi },
  { match: /wellness|spa/i, words: /\b(ayurveda|massage|yoga|spa|wellness|relax|retreat|steam|panchakarma|meditat)\w*/gi },
  { match: /culture|heritage/i, words: /\b(kathakali|culture|backwater|food|cook|dinner|walk|tour|temple|history|heritage|boat|canoe|art|music|market)\w*/gi },
];

const INTEREST_PATTERNS: Record<string, RegExp> = {
  Kathakali: /kathakali/i,
  Backwaters: /backwater|houseboat|canoe/i,
  Yoga: /\byoga\b/i,
  Ayurveda: /ayurved|panchakarma/i,
  Massage: /massage/i,
  Cooking: /\bcook/i,
  "Walking tour": /walking tour|\bwalk\b/i,
  "Check-up": /check-?up|baseline/i,
  "Blood tests": /blood/i,
  Scan: /\bscan\b|\bmri\b/i,
  "English-speaking doctor": /doctor.{0,40}english|english.{0,40}doctor/i,
  "Spice plantation": /spice|plantation/i,
  Seafood: /seafood|fish/i,
  "Vegetarian food": /vegetarian|vegan/i,
};

/**
 * Deterministic extraction, used by the fake provider: keyword counts for the
 * mix, plain cues for pace and budget. Says "unknown" (null) rather than
 * guessing.
 */
export function heuristicRequirements(transcript: string, moduleNames: string[]): RequirementsDraft {
  const counts = moduleNames.map((name) => {
    const family = MODULE_KEYWORDS.find((k) => k.match.test(name));
    return { moduleName: name, hits: family ? (transcript.match(family.words) ?? []).length : 0 };
  });
  const totalHits = counts.reduce((sum, c) => sum + c.hits, 0);
  const moduleMix =
    totalHits === 0 ? [] : counts.filter((c) => c.hits > 0).map((c) => ({ moduleName: c.moduleName, percent: (c.hits / totalHits) * 100 }));

  const pace = /\b(slow|slowly|relax|gentle|unhurried|free afternoons?|no early)/i.test(transcript)
    ? "RELAXED"
    : /\b(packed|busy|as much as possible|full days?)\b/i.test(transcript)
      ? "PACKED"
      : /\b(balanced|mix of)\b/i.test(transcript)
        ? "BALANCED"
        : null;

  const budgetAmount = parseBudget(transcript);
  const mustHaves = Object.keys(INTEREST_PATTERNS).filter((term) => INTEREST_PATTERNS[term].test(transcript));
  const avoid: string[] = [];
  if (/(no|don'?t want|avoid)[^.]{0,30}early/i.test(transcript)) avoid.push("Early starts");
  if (/(no|don'?t want|avoid)[^.]{0,30}(long drives?|travel)/i.test(transcript)) avoid.push("Long drives");

  const interests = mustHaves.length ? mustHaves.join(", ").toLowerCase() : "not yet clear";
  return {
    summary: `From the conversation: interested in ${interests}.${pace ? ` Prefers a ${pace.toLowerCase()} pace.` : ""}`,
    moduleMix,
    budgetAmount,
    budgetCurrency: budgetAmount ? "EUR" : null,
    pace,
    mustHaves,
    avoid,
    brief: mustHaves.length
      ? `Lead with ${mustHaves.slice(0, 3).join(", ")}; confirm budget and pace before the health core is fixed.`
      : "Interests unclear — a short call to understand what the client wants from the trip.",
  };
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** "€3,000", "3000 euros", "three thousand euros" → 3000; anything else → null. */
export function parseBudget(text: string): number | null {
  const words = /\b(\w+) thousand euros?\b/i.exec(text);
  if (words && NUMBER_WORDS[words[1].toLowerCase()]) return NUMBER_WORDS[words[1].toLowerCase()] * 1000;
  const digits = /€\s?(\d[\d,]*)|(\d[\d,]*)\s?(?:€|euros?\b|eur\b)/i.exec(text);
  if (!digits) return null;
  const value = Number((digits[1] ?? digits[2]).replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}
