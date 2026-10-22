import "server-only";
import type { FeedSource } from "@prisma/client";
import { prisma } from "@/lib/db";

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
  vendor: { name: string; description: string | null } | null;
};

/** The client's feed: visible posts, newest first, client-safe vendor fields only. */
export async function loadClientFeed(take = 30): Promise<ClientFeedPost[]> {
  return prisma.feedPost.findMany({
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
      vendor: { select: { name: true, description: true } },
    },
  });
}
