/**
 * Module mix: how a trip divides between Health, Wellness and Culture,
 * e.g. 40 / 30 / 30. Percentages over the modules in a mix sum to exactly 100.
 */

export type ModuleShare = { moduleId: string; percent: number };

export function moduleMixProblems(shares: ModuleShare[]): string[] {
  if (shares.length === 0) return [];
  const problems: string[] = [];
  if (shares.some((s) => !Number.isInteger(s.percent) || s.percent < 0 || s.percent > 100)) {
    problems.push("Each share must be a whole number between 0 and 100.");
  }
  const total = shares.reduce((sum, s) => sum + s.percent, 0);
  if (total !== 100) problems.push(`The shares add up to ${total}%; they must add up to 100%.`);
  return problems;
}

/**
 * Scales arbitrary non-negative weights to whole percentages summing to 100
 * (largest remainder method). All-zero weights split evenly.
 */
export function normaliseMix(weights: ModuleShare[]): ModuleShare[] {
  if (weights.length === 0) return [];
  const total = weights.reduce((sum, w) => sum + Math.max(0, w.percent), 0);
  const raw = weights.map((w) => ({
    moduleId: w.moduleId,
    exact: total === 0 ? 100 / weights.length : (Math.max(0, w.percent) / total) * 100,
  }));
  const floored = raw.map((r) => ({ moduleId: r.moduleId, percent: Math.floor(r.exact), rest: r.exact % 1 }));
  let remaining = 100 - floored.reduce((sum, f) => sum + f.percent, 0);
  for (const f of [...floored].sort((a, b) => b.rest - a.rest)) {
    if (remaining <= 0) break;
    f.percent += 1;
    remaining -= 1;
  }
  return floored.map(({ moduleId, percent }) => ({ moduleId, percent }));
}

/** The mix an itinerary actually has, by time spent per module. */
export function actualMix(blocks: { moduleId: string; durationMinutes: number }[]): ModuleShare[] {
  const byModule = new Map<string, number>();
  for (const b of blocks) byModule.set(b.moduleId, (byModule.get(b.moduleId) ?? 0) + b.durationMinutes);
  return normaliseMix([...byModule.entries()].map(([moduleId, minutes]) => ({ moduleId, percent: minutes })));
}
