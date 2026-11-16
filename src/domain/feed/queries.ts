import "server-only";
import type { FeedSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { PlacePhoto } from "@/domain/trips/builder-view";

export const FEED_SOURCE_LABELS: Record<FeedSource, string> = {
  VENDOR_INSTAGRAM: "From our providers",
  KERALA_TOURISM: "Kerala Tourism",
  NEWS: "Good news from Kerala",
};

export type ClientFeedPost = {
  id: string;
  source: FeedSource;
  caption: string;
  mediaUrl: string | null;
  link: string;
  publishedAt: Date;
  /** `slug` links the post to its place; `heroPhoto` stands in when the post has no `mediaUrl`. */
  vendor: { name: string; description: string | null; slug: string; heroPhoto: PlacePhoto | null } | null;
};

/** The client's feed: visible posts, newest first, client-safe vendor fields only. */
export async function loadClientFeed(take = 30): Promise<ClientFeedPost[]> {
  const posts = await prisma.feedPost.findMany({
    where: { hiddenAt: null },
    orderBy: { publishedAt: "desc" },
    take,
    select: {
      id: true,
      source: true,
      caption: true,
      mediaUrl: true,
      link: true,
      publishedAt: true,
      vendor: {
        select: {
          name: true,
          description: true,
          slug: true,
          photos: {
            orderBy: [{ isHero: "desc" }, { sortOrder: "asc" }],
            take: 1,
            select: { url: true, alt: true, width: true, height: true, isHero: true, credit: true },
          },
        },
      },
    },
  });
  return posts.map(({ vendor, ...post }) => ({
    ...post,
    vendor: vendor
      ? { name: vendor.name, description: vendor.description, slug: vendor.slug, heroPhoto: vendor.photos[0] ?? null }
      : null,
  }));
}
