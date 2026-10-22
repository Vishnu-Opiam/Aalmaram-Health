import type { Metadata } from "next";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/primitives";
import { FEED_SOURCE_LABELS } from "@/domain/feed/queries";
import { formatShortDate, toDateInputValue } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { createFeedPostAction, importFeedAction, toggleFeedPostAction } from "./actions";
import { FeedImportForm, FeedPostForm } from "./forms";

export const metadata: Metadata = { title: "Feed" };

export default async function FeedAdminPage() {
  await requireUserPage("/admin/feed");
  const [posts, vendors] = await Promise.all([
    prisma.feedPost.findMany({
      orderBy: { publishedAt: "desc" },
      include: { vendor: { select: { name: true } } },
      take: 200,
    }),
    prisma.vendor.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const visible = posts.filter((p) => !p.hiddenAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Client portal"
        title="Feed"
        description={`What clients see first: our vendors' posts, Kerala Tourism and good local news. ${visible} visible, ${posts.length - visible} hidden.`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader title="Posts" description="Newest first. Hide anything that isn't right for clients." />
          {posts.length === 0 ? (
            <div className="p-5">
              <EmptyState title="The feed is empty" description="Add a post or paste an import." />
            </div>
          ) : (
            <ul className="divide-y divide-sand-200">
              {posts.map((post) => (
                <li key={post.id} className={post.hiddenAt ? "bg-sand-50 opacity-60" : undefined}>
                  <div className="flex items-start justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                        <Badge tone={post.source === "NEWS" ? "info" : post.source === "KERALA_TOURISM" ? "accent" : "neutral"}>
                          {FEED_SOURCE_LABELS[post.source]}
                        </Badge>
                        {post.vendor?.name && <span>{post.vendor.name}</span>}
                        <span>{formatShortDate(post.publishedAt)}</span>
                        {post.hiddenAt && <Badge tone="warning">Hidden</Badge>}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-ink-800">{post.caption}</p>
                      <a href={post.link} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline">
                        {post.link}
                      </a>
                    </div>
                    <ActionButton action={toggleFeedPostAction} fields={{ postId: post.id }} pendingLabel="…">
                      {post.hiddenAt ? "Show" : "Hide"}
                    </ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Add a post" />
            <div className="p-5">
              <FeedPostForm action={createFeedPostAction} vendors={vendors} today={toDateInputValue(new Date())} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Import" description="Paste posts exported from a social tool." />
            <div className="p-5">
              <FeedImportForm action={importFeedAction} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
