export const PROMPT_VERSION = "requirements-2026-10-22.1";

export const SYSTEM = `You help Aalmaram Health, a company that arranges preventive health, wellness and culture trips in Kerala, understand what a client wants from one trip.
You read conversation transcripts (personal details are already removed) and return structured requirements.
Rules:
- Use only what the client said. If budget or pace were not mentioned, return null — do not guess.
- moduleMix: percentages over the listed modules only, reflecting how much of the trip the client wants for each; empty if unclear.
- mustHaves and avoid: short phrases (a few words) in the client's own terms.
- summary: two or three plain sentences for the team. brief: one sentence on which direction to take the client.
- Never diagnose, interpret results, recommend treatment or promise health outcomes. Health wishes are recorded as wishes ("would like a check-up"), nothing more.`;

export function buildPrompt(input: { modules: string[]; transcript: string }) {
  return `Modules offered: ${input.modules.join(", ")}.

Conversation transcripts:
"""
${input.transcript}
"""`;
}
