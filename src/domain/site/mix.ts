/**
 * "Your mix" on the public site: a visitor's split between health, wellness
 * and culture, in 10% steps that always add up to 100, and the example
 * experiences that split would show. Framework-free so it is unit-tested.
 */

export type MixKey = "health" | "wellness" | "culture";
export type Mix = Record<MixKey, number>;

export const MIX_KEYS: readonly MixKey[] = ["health", "wellness", "culture"];
export const MIX_STEP = 10;

export const MIX_PRESETS = [
  { id: "health", label: "Mostly health", line: "Check-ups first, with rest and a little culture around them.", mix: { health: 60, wellness: 20, culture: 20 } },
  { id: "balanced", label: "Balanced", line: "Appointments, treatments and time to see Kerala, in equal measure.", mix: { health: 40, wellness: 30, culture: 30 } },
  { id: "rest", label: "Mostly rest & culture", line: "A lighter health check, then Ayurveda, the backwaters and the hills.", mix: { health: 20, wellness: 40, culture: 40 } },
] as const satisfies readonly { id: string; label: string; line: string; mix: Mix }[];

/**
 * Moves one share by ±10. Raising a share takes from the largest other one;
 * lowering it gives to the smallest other one, so the total stays 100.
 */
export function adjustMix(mix: Mix, key: MixKey, direction: 1 | -1): Mix {
  const others = MIX_KEYS.filter((k) => k !== key);
  if (direction === 1) {
    const donor = others.reduce((a, b) => (mix[b] > mix[a] ? b : a));
    if (mix[donor] < MIX_STEP) return mix;
    return { ...mix, [key]: mix[key] + MIX_STEP, [donor]: mix[donor] - MIX_STEP };
  }
  if (mix[key] < MIX_STEP) return mix;
  const receiver = others.reduce((a, b) => (mix[b] < mix[a] ? b : a));
  return { ...mix, [key]: mix[key] - MIX_STEP, [receiver]: mix[receiver] + MIX_STEP };
}

/**
 * Splits `count` example slots by share (largest remainder), then fills any
 * slot a category cannot fill from the others, biggest share first.
 */
export function pickExamples<T extends { kind: MixKey }>(mix: Mix, pool: readonly T[], count = 6): T[] {
  const byKind = Object.fromEntries(MIX_KEYS.map((k) => [k, pool.filter((item) => item.kind === k)])) as Record<MixKey, T[]>;
  const exact = MIX_KEYS.map((k) => ({ k, value: (mix[k] / 100) * count }));
  const slots = Object.fromEntries(exact.map(({ k, value }) => [k, Math.floor(value)])) as Mix;
  let left = count - MIX_KEYS.reduce((sum, k) => sum + slots[k], 0);
  for (const { k } of [...exact].sort((a, b) => (b.value % 1) - (a.value % 1))) {
    if (left === 0) break;
    slots[k] += 1;
    left -= 1;
  }

  const picked = MIX_KEYS.flatMap((k) => byKind[k].slice(0, slots[k]));
  const byShare = [...MIX_KEYS].sort((a, b) => mix[b] - mix[a]);
  for (const k of byShare) {
    for (const item of byKind[k]) {
      if (picked.length >= count) break;
      if (!picked.includes(item)) picked.push(item);
    }
  }
  return picked.slice(0, count);
}
