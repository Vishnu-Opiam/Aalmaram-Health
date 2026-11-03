import "server-only";
import { prisma } from "@/lib/db";
import { generateStructured } from "@/lib/ai";
import * as curationPrompt from "@/lib/ai/prompts/feed-curation";
import { applyCuration, curationSchema, heuristicCuration, instagramHandle } from "@/domain/feed/curation";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import { logger } from "@/lib/logger";
import { fetchRecentPosts } from "./instagram";

export type IngestSummary = { vendors: number; added: number; featured: number; refreshed: number; failed: string[] };

/**
 * Vendors' Instagram → the client Feed (P3.2). For every active vendor with an
 * Instagram profile in socialLinks: fetch recent posts, let the fast model
 * (Haiku) decide which new ones to feature, and store all of them, the rest
 * hidden, so staff can see each decision with its reason and overrule it on
 * /admin/feed. Posts already stored are never re-judged, so a staff decision
 * sticks. One vendor failing does not stop the others.
 */
export async function ingestVendorInstagram(actor: { userId: string | null; label: string }): Promise<IngestSummary> {
  const vendors = await prisma.vendor.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      socialLinks: true,
      components: { where: { status: "ACTIVE" }, select: { catalogue: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
  });

  const summary: IngestSummary = { vendors: 0, added: 0, featured: 0, refreshed: 0, failed: [] };
  for (const vendor of vendors) {
    const handle = instagramHandle(vendor.socialLinks);
    if (!handle) continue;
    summary.vendors += 1;
    try {
      const posts = await fetchRecentPosts(handle);
      const known = new Set(
        (
          await prisma.feedPost.findMany({
            where: { externalId: { in: posts.map((p) => p.externalId) } },
            select: { externalId: true },
          })
        ).map((p) => p.externalId),
      );

      // shortcut: Instagram's image URLs expire after a few days, so each run
      // re-points stored posts at fresh ones. Copy images to Blob storage if
      // the feed must survive the ingest stopping.
      for (const post of posts.filter((p) => known.has(p.externalId))) {
        await prisma.feedPost.update({
          where: { externalId: post.externalId },
          data: { mediaUrl: post.mediaUrl, link: post.link },
        });
        summary.refreshed += 1;
      }

      const fresh = posts.filter((p) => !known.has(p.externalId));
      if (fresh.length === 0) continue;

      const { data } = await generateStructured({
        task: "FEED_CURATION",
        schema: curationSchema,
        system: curationPrompt.SYSTEM,
        prompt: curationPrompt.buildPrompt({
          vendorName: vendor.name,
          offers: [...new Set(vendor.components.map((c) => c.catalogue.name))],
          posts: fresh,
        }),
        promptVersion: curationPrompt.PROMPT_VERSION,
        model: "fast",
        fake: () => heuristicCuration(fresh),
        logOutput: (d) => ({ posts: fresh.length, shown: d.decisions.filter((x) => x.show).length }),
        entity: { type: "Vendor", id: vendor.id },
        actorUserId: actor.userId ?? undefined,
      });

      const decisions = applyCuration(fresh, data);
      const now = new Date();
      await prisma.feedPost.createMany({
        data: fresh.map((post) => {
          const decision = decisions.get(post.externalId)!;
          return {
            source: "VENDOR_INSTAGRAM" as const,
            vendorId: vendor.id,
            caption: post.caption,
            mediaUrl: post.mediaUrl,
            link: post.link,
            publishedAt: post.publishedAt,
            externalId: post.externalId,
            hiddenAt: decision.show ? null : now,
            aiReason: decision.reason,
          };
        }),
        skipDuplicates: true,
      });
      summary.added += fresh.length;
      summary.featured += [...decisions.values()].filter((d) => d.show).length;
    } catch (error) {
      logger.warn("feed ingest failed for a vendor", { vendorId: vendor.id, code: (error as { code?: string })?.code });
      summary.failed.push(vendor.name);
    }
  }

  await logActivity({
    action: ACTIVITY_ACTIONS.FEED_INGESTED,
    entityType: "FeedPost",
    entityId: "instagram",
    actorUserId: actor.userId,
    actorLabel: actor.label,
    metadata: { vendors: summary.vendors, added: summary.added, featured: summary.featured, failed: summary.failed.length },
  });
  return summary;
}
