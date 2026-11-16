/**
 * Feed seed: FICTIONAL posts in the voice of the demo vendors, a tourism
 * board and local news. Links point at example.com; no real accounts.
 */
import type { FeedSource, PrismaClient } from "@prisma/client";
import { PHOTOS, type Photo } from "../src/app/(site)/content";

// The feed card renders a plain <img>, so ask Unsplash for a sensibly sized file.
const media = (photo: Photo) => `${photo.src}?auto=format&fit=crop&w=1200&q=70`;

// Posts without mediaUrl show their vendor's hero photo (or nothing) instead.
const POSTS: { externalId: string; source: FeedSource; vendor?: string; caption: string; daysAgo: number; mediaUrl?: string }[] = [
  {
    externalId: "demo-feed-1",
    source: "VENDOR_INSTAGRAM",
    vendor: "Kalari Heritage Collective (demo)",
    caption: "Two hours of make-up before every Kathakali performance. Come early and watch the faces take shape.",
    daysAgo: 1,
    mediaUrl: media(PHOTOS.kathakali),
  },
  {
    externalId: "demo-feed-2",
    source: "KERALA_TOURISM",
    caption: "The northeast monsoon has passed: clear mornings on the backwaters and green hills inland.",
    daysAgo: 2,
    mediaUrl: media(PHOTOS.lake),
  },
  {
    externalId: "demo-feed-3",
    source: "VENDOR_INSTAGRAM",
    vendor: "Kaumudi Ayurveda Retreat (demo)",
    caption: "Sunrise yoga on the cliff this morning. Beginners always welcome.",
    daysAgo: 3,
  },
  {
    externalId: "demo-feed-4",
    source: "NEWS",
    caption: "Fort Kochi's restored spice warehouses reopen as a gallery and café quarter.",
    daysAgo: 4,
    mediaUrl: media(PHOTOS.kochi),
  },
  {
    externalId: "demo-feed-5",
    source: "VENDOR_INSTAGRAM",
    vendor: "Malabar Spice Table (demo)",
    caption: "This week's catch: pearl spot fried in banana leaf. Vegetarian thali every day.",
    daysAgo: 5,
  },
  {
    externalId: "demo-feed-6",
    source: "VENDOR_INSTAGRAM",
    vendor: "Backwater Diagnostics Centre (demo)",
    caption: "Our new Varkala collection centre is open — reports in English, usually within 48 hours.",
    daysAgo: 6,
  },
  {
    externalId: "demo-feed-7",
    source: "NEWS",
    caption: "Alappuzha's lake villages win a regional award for clean waterways.",
    daysAgo: 8,
    mediaUrl: media(PHOTOS.canal),
  },
];

export async function seedFeed(prisma: PrismaClient) {
  const vendors = Object.fromEntries(
    (await prisma.vendor.findMany({ select: { id: true, name: true } })).map((v) => [v.name, v.id]),
  );
  for (const post of POSTS) {
    const data = {
      source: post.source,
      vendorId: post.vendor ? vendors[post.vendor] : null,
      caption: post.caption,
      mediaUrl: post.mediaUrl ?? null,
      link: `https://example.com/feed/${post.externalId}`,
      publishedAt: new Date(Date.now() - post.daysAgo * 86_400_000),
    };
    await prisma.feedPost.upsert({ where: { externalId: post.externalId }, create: { ...data, externalId: post.externalId }, update: data });
  }
  console.log(`  feed posts: ${POSTS.length}`);
}
