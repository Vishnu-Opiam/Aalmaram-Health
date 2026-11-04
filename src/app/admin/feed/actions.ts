"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { conflict, notFound, validation } from "@/lib/errors";
import { parseDateInput } from "@/domain/shared/dates";
import { feedImportItemSchema, feedPostSchema } from "@/lib/validation/schemas";
import { parseForm, runAction, successState, type FormState } from "@/lib/validation/form";
import { refreshUrl } from "@/lib/refresh-url";
import { ingestVendorInstagram } from "@/lib/services/feed-ingest";

/**
 * Staff curate the feed: add a post by hand, paste a JSON export, hide or show
 * anything. Vendors' Instagram posts arrive through ingestVendorInstagram
 * (daily cron, or the button here) already featured or hidden by the AI.
 */

export async function ingestInstagramAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("feed.ingest", formData, async () => {
    const user = await requireUser();
    const s = await ingestVendorInstagram({ userId: user.id, label: user.name });
    if (s.vendors === 0) {
      throw validation("No active vendor has an Instagram profile link. Add one to the vendor's social links.");
    }
    // The button only shows errors (success navigates), so partial failures surface as one.
    if (s.failed.length) {
      throw conflict(`${s.added} new posts added, but these accounts could not be read: ${s.failed.join(", ")}.`);
    }
    return successState(`${s.added} new posts, ${s.featured} featured.`, refreshUrl("/admin/feed"));
  });
}

export async function createFeedPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("feed.create", formData, async () => {
    await requireUser();
    const input = parseForm(feedPostSchema, formData);
    if (input.vendorId && !(await prisma.vendor.findUnique({ where: { id: input.vendorId }, select: { id: true } }))) {
      throw validation("Please choose a vendor.", { vendorId: ["That vendor no longer exists."] });
    }
    await prisma.feedPost.create({
      data: { ...input, publishedAt: parseDateInput(input.publishedAt) },
    });
    return successState("Post added to the feed.", refreshUrl("/admin/feed"));
  });
}

export async function toggleFeedPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("feed.toggle", formData, async () => {
    await requireUser();
    const post = await prisma.feedPost.findUnique({
      where: { id: String(formData.get("postId") ?? "") },
      select: { id: true, hiddenAt: true },
    });
    if (!post) throw notFound("That post");
    await prisma.feedPost.update({
      where: { id: post.id },
      data: { hiddenAt: post.hiddenAt ? null : new Date() },
    });
    return successState(post.hiddenAt ? "Post shown." : "Post hidden.", refreshUrl("/admin/feed"));
  });
}

export async function importFeedAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("feed.import", formData, async () => {
    await requireUser();
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("json") ?? ""));
    } catch {
      throw validation("That is not valid JSON.", { json: ["Paste a JSON array of posts."] });
    }
    const parsed = z.array(feedImportItemSchema).max(200).safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw validation("Some posts are not valid.", {
        json: [`Item ${String(issue.path[0] ?? "?")}: ${issue.message}`],
      });
    }

    const vendors = new Map(
      (await prisma.vendor.findMany({ select: { id: true, name: true } })).map((v) => [v.name, v.id]),
    );
    let created = 0;
    let updated = 0;
    for (const { vendorName, ...item } of parsed.data) {
      const data = {
        ...item,
        mediaUrl: item.mediaUrl ?? null,
        publishedAt: new Date(item.publishedAt),
        vendorId: vendorName ? (vendors.get(vendorName) ?? null) : null,
      };
      if (item.externalId) {
        const existing = await prisma.feedPost.findUnique({ where: { externalId: item.externalId }, select: { id: true } });
        await prisma.feedPost.upsert({ where: { externalId: item.externalId }, create: data, update: data });
        if (existing) updated += 1;
        else created += 1;
      } else {
        await prisma.feedPost.create({ data });
        created += 1;
      }
    }
    return successState(`Imported: ${created} new, ${updated} updated.`, refreshUrl("/admin/feed"));
  });
}
