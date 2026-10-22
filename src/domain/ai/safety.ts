/**
 * Guardrails for AI text shown to clients or staff.
 *
 * The product never gives medical advice, interprets results or promises
 * health outcomes (CLAUDE.md §4). Prompts say so; this is the check after the
 * fact, applied to every model sentence before it is stored or shown.
 */

const MEDICAL_CLAIM_PATTERNS: RegExp[] = [
  /\bdiagnos(e|is|es|ed|ing)\b/i,
  /\b(cure|cures|cured|curing)\b/i,
  /\bheal(s|ed|ing)? (you|your)\b/i,
  /\btreat(s|ed|ing)? (your|the) (condition|disease|illness|symptoms?)\b/i,
  /\b(guarantee|guaranteed|guarantees)\b/i,
  /\bwill (improve|reduce|reverse|fix|lower|boost) (your )?(health|blood|cholesterol|pressure|sugar|symptoms?|condition)\b/i,
  /\byour (results?|report|scan|levels?) (show|shows|mean|means|indicate|indicates|suggest|suggests)\b/i,
  /\b(you should|you need to) (take|stop taking|start taking) \w+/i,
  /\b(dosage|prescri(be|ption))\b/i,
];

export function findMedicalClaims(text: string): string[] {
  return MEDICAL_CLAIM_PATTERNS.filter((pattern) => pattern.test(text)).map((p) => p.source);
}

/** Returns the text, or the fallback if it reads like medical advice or a health promise. */
export function safeText(text: string, fallback: string): string {
  return findMedicalClaims(text).length === 0 ? text : fallback;
}

/** Did the client ask for something only a clinician can answer? */
export function isMedicalQuestion(text: string): boolean {
  return /\b(should i (take|stop|start)|is it safe|what does my (result|report|scan)|my (result|report|scan|levels?) (show|mean)|diagnos|dosage|medication|symptom)/i.test(
    text,
  );
}

export const MEDICAL_DEFLECTION =
  "I can't give medical advice or interpret results — the doctors you'll see can, and your relationship manager will make sure your questions reach them.";
