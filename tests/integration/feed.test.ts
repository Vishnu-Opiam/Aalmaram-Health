import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createInventory, prisma, resetDatabase } from "./helpers";
import { ingestVendorInstagram } from "@/lib/services/feed-ingest";
import { loadClientFeed } from "@/domain/feed/queries";

const ACTOR = { userId: null, label: "Test" };

/** Vendor Instagram → Feed with the demo Instagram source and the fake model. */
describe("vendor Instagram ingest (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores new posts once, features the suitable ones and records why", async () => {
    const { vendor } = await createInventory();
    await prisma.vendor.update({ where: { id: vendor.id }, data: { socialLinks: ["https://instagram.com/test_diagnostics"] } });

    const first = await ingestVendorInstagram(ACTOR);
    expect(first).toMatchObject({ vendors: 1, added: 4, featured: 2, failed: [] });

    const posts = await prisma.feedPost.findMany({ orderBy: { publishedAt: "desc" } });
    expect(posts.every((p) => p.source === "VENDOR_INSTAGRAM" && p.vendorId === vendor.id && p.aiReason)).toBe(true);
    const visible = await loadClientFeed();
    expect(visible).toHaveLength(2);
    expect(visible.map((p) => p.caption).join(" ")).not.toMatch(/OFF|cures/);

    const run = await prisma.aiRun.findFirstOrThrow({ where: { task: "FEED_CURATION" } });
    expect(run).toMatchObject({ status: "SUCCEEDED", provider: "fake", entityId: vendor.id });
    expect(JSON.stringify(run.output)).not.toMatch(/yoga|garden|OFF/i);

    // A staff decision sticks: re-running never re-judges a stored post.
    const promo = posts.find((p) => p.caption.includes("OFF"))!;
    await prisma.feedPost.update({ where: { id: promo.id }, data: { hiddenAt: null } });
    const second = await ingestVendorInstagram(ACTOR);
    expect(second).toMatchObject({ added: 0, refreshed: 4 });
    expect((await prisma.feedPost.findUniqueOrThrow({ where: { id: promo.id } })).hiddenAt).toBeNull();
    expect(await prisma.feedPost.count()).toBe(4);
  });

  it("skips vendors without an Instagram profile and inactive vendors", async () => {
    const { vendor } = await createInventory();
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { socialLinks: ["https://instagram.com/inactive_one"], status: "INACTIVE" },
    });
    await prisma.vendor.create({ data: { name: "No socials (demo)", socialLinks: ["https://example.com"] } });
    expect(await ingestVendorInstagram(ACTOR)).toMatchObject({ vendors: 0, added: 0 });
  });
});
