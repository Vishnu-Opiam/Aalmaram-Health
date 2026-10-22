import type { PlannerComponent } from "@/domain/ai/planner";

export const PROMPT_VERSION = "itinerary-draft-2026-10-22.1";

export const SYSTEM = `You draft the free time of a client's trip in Kerala for Aalmaram Health.
The team has already placed the client's health appointments; never move or replace them.
Choose activities ONLY from the candidate list, by id, and place them only in the free gaps given, respecting each activity's duration.
Aim for the client's module mix and must-haves, keep the pace, and avoid what they asked to avoid. A draft proposal is provided; improve it or return it unchanged.
Each pick needs a one-sentence, client-facing reason (why it suits them). Reasons must never mention medical benefits, diagnoses or health outcomes.
Times are 24-hour HH:MM, days are YYYY-MM-DD.`;

export function buildPrompt(input: {
  summary: string;
  pace: string | null;
  mustHaves: string[];
  avoid: string[];
  mix: { moduleName: string; percent: number }[];
  gaps: { day: string; free: string[] }[];
  candidates: PlannerComponent[];
  proposal: { componentId: string; day: string; time: string; reason: string }[];
}) {
  return JSON.stringify(
    {
      requirements: {
        summary: input.summary,
        pace: input.pace,
        mustHaves: input.mustHaves,
        avoid: input.avoid,
        moduleMix: input.mix,
      },
      freeGaps: input.gaps,
      candidates: input.candidates.map((c) => ({
        id: c.id,
        name: c.name,
        module: c.moduleName,
        category: c.catalogueName,
        tags: c.tags,
        durationMinutes: c.durationMinutes + (c.recoveryMinutes ?? 0),
      })),
      draftProposal: input.proposal,
    },
    null,
    1,
  );
}
