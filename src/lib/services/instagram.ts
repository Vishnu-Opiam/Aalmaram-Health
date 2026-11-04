import "server-only";
import { z } from "zod";
import { env, isProduction } from "@/lib/env";
import { conflict } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { CandidatePost } from "@/domain/feed/curation";

/**
 * Recent posts from a vendor's public Instagram account.
 *
 * Uses the Instagram Graph API's business discovery (our own Instagram
 * business account reads another business or creator account's public posts)
 * rather than scraping, which Instagram's terms forbid and which breaks
 * without warning. Vendors on a personal account are not visible this way.
 */

// Graph API versions live about two years; bump when Meta deprecates this one.
const GRAPH = "https://graph.facebook.com/v23.0";

export type InstagramPost = CandidatePost & {
  mediaUrl: string | null;
  link: string;
  publishedAt: Date;
};

const mediaSchema = z.object({
  id: z.string(),
  caption: z.string().optional(),
  media_type: z.enum(["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]),
  media_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  permalink: z.string().url(),
  timestamp: z.string(),
});

const responseSchema = z.object({
  business_discovery: z.object({ media: z.object({ data: z.array(mediaSchema) }).optional() }),
});

export function instagramConnected() {
  return Boolean(env().INSTAGRAM_ACCESS_TOKEN && env().INSTAGRAM_BUSINESS_ACCOUNT_ID);
}

export async function fetchRecentPosts(handle: string, limit = 12): Promise<InstagramPost[]> {
  if (!instagramConnected()) {
    if (isProduction()) throw conflict("Instagram is not connected yet: INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID are not set.");
    return demoPosts(handle);
  }

  const fields = `business_discovery.username(${handle}){media.limit(${limit}){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp}}`;
  const url = `${GRAPH}/${env().INSTAGRAM_BUSINESS_ACCOUNT_ID}?fields=${encodeURIComponent(fields)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env().INSTAGRAM_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    // Meta's error text can echo the request; log only the status and code.
    const code = (body as { error?: { code?: number } } | null)?.error?.code;
    logger.warn("instagram fetch failed", { status: response.status, code });
    throw conflict(`Instagram did not return @${handle}'s posts (status ${response.status}). Is it a business or creator account?`);
  }

  return responseSchema.parse(body).business_discovery.media?.data.map((m) => ({
    externalId: `ig:${m.id}`,
    caption: m.caption ?? "",
    mediaType: m.media_type,
    // A video's media_url is the video itself; the feed shows its cover image.
    mediaUrl: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ?? null,
    link: m.permalink,
    publishedAt: new Date(m.timestamp),
  })) ?? [];
}

/** Development stand-in: fictional posts, one of each kind the curator must handle. */
function demoPosts(handle: string): InstagramPost[] {
  const captions = [
    "Morning light over the treatment garden. Our therapists start each day with twenty minutes of quiet before the first guest arrives.",
    "50% OFF all packages this week only! DM us or tap the link in bio to book.",
    "Our new herbal oils are pressed here every Thursday — come and watch how it's done.",
    "This treatment cures back pain in 3 days, guaranteed.",
  ];
  return captions.map((caption, i) => ({
    externalId: `demo-ig:${handle}:${i + 1}`,
    caption,
    mediaType: "IMAGE" as const,
    mediaUrl: null,
    link: `https://example.com/instagram/${handle}/${i + 1}`,
    publishedAt: new Date(Date.now() - (i + 1) * 36 * 3_600_000),
  }));
}
