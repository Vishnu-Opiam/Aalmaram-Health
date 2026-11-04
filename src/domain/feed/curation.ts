import { z } from "zod";

/**
 * Choosing which of a vendor's Instagram posts appear on the client Feed.
 * Pure: the model call lives in src/lib/services/feed-ingest.ts.
 */

export type CandidatePost = {
  externalId: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
};

export type Decision = { show: boolean; reason: string };

export const curationSchema = z.object({
  decisions: z
    .array(
      z.object({
        id: z.string(),
        show: z.boolean(),
        reason: z.string().max(200),
      }),
    )
    .max(50),
});
export type Curation = z.infer<typeof curationSchema>;

/** "https://www.instagram.com/kalari_heritage/" → "kalari_heritage"; null for anything else. */
export function instagramHandle(links: string[]): string | null {
  for (const link of links) {
    const match = /^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:[?#].*)?$/i.exec(link.trim());
    // Profile links only: /p/…, /reel/… and the like are posts, not accounts.
    if (match && !["p", "reel", "reels", "stories", "explore"].includes(match[1].toLowerCase())) return match[1];
  }
  return null;
}

const SALESY = /(\d+\s?%|\bdiscount|\boffer\b|\bsale\b|giveaway|contest|link in bio|\bdm\b|whatsapp|call now)/i;
const CLAIMS = /(\bcure|guarantee|miracle|before and after|heal(s|ing)? (your|all)|detox your|lose \d+)/i;

/**
 * The fake provider's stand-in for the model, and a readable statement of the
 * policy: show calm, specific posts about places, people and experiences; hide
 * selling, health claims and anything too thin to mean something to a visitor.
 */
export function heuristicCuration(posts: CandidatePost[]): Curation {
  return {
    decisions: posts.map((p) => {
      const caption = p.caption.trim();
      if (caption.length < 25) return { id: p.externalId, show: false, reason: "Too little to go on." };
      if (CLAIMS.test(caption)) return { id: p.externalId, show: false, reason: "Makes a health claim." };
      if (SALESY.test(caption)) return { id: p.externalId, show: false, reason: "Reads as a promotion." };
      return { id: p.externalId, show: true, reason: "Shows the place and what a visitor would experience." };
    }),
  };
}

/**
 * Model output → one decision per post we asked about. Ids the model made up
 * are dropped; posts it skipped stay hidden until staff look at them.
 */
export function applyCuration(posts: CandidatePost[], curation: Curation): Map<string, Decision> {
  const asked = new Set(posts.map((p) => p.externalId));
  const result = new Map<string, Decision>(
    posts.map((p) => [p.externalId, { show: false, reason: "Not reviewed by the assistant." }]),
  );
  for (const d of curation.decisions) {
    if (asked.has(d.id)) result.set(d.id, { show: d.show, reason: d.reason.trim() || (d.show ? "Featured." : "Hidden.") });
  }
  return result;
}
