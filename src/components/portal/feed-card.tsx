import { ExternalLink, Newspaper, Palmtree, Store } from "lucide-react";
import { FEED_SOURCE_LABELS, type ClientFeedPost } from "@/domain/feed/queries";
import { formatShortDate } from "@/domain/shared/dates";

const SOURCE_LOOK = {
  VENDOR_INSTAGRAM: { Icon: Store, tint: "from-lagoon-100 via-sand-100 to-lagoon-50 text-lagoon-700" },
  KERALA_TOURISM: { Icon: Palmtree, tint: "from-leaf-100 via-sand-100 to-leaf-50 text-leaf-700" },
  NEWS: { Icon: Newspaper, tint: "from-marigold-100 via-sand-100 to-marigold-50 text-marigold-700" },
} as const;

/** One post from Kerala: a picture (or a calm placeholder), who it is from, the words. */
export function FeedCard({ post }: { post: ClientFeedPost }) {
  const { Icon, tint } = SOURCE_LOOK[post.source];
  return (
    <article className="portal-card flex h-full flex-col overflow-hidden">
      {post.mediaUrl ? (
        // External social images: next/image would need every host allow-listed.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.mediaUrl} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
      ) : (
        <div className={`flex h-32 items-center justify-center bg-gradient-to-br ${tint}`}>
          <Icon className="h-12 w-12 opacity-70" aria-hidden="true" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <p className="flex items-center gap-2 text-[16px] font-semibold text-ink-600">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          {post.vendor?.name ?? FEED_SOURCE_LABELS[post.source]} · {formatShortDate(post.publishedAt)}
        </p>
        <p className="mt-3 flex-1 text-[18px] leading-relaxed text-ink-900">{post.caption}</p>
        {post.vendor?.description && (
          <details className="mt-4 text-[16px] text-ink-700">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold text-forest-800">About this provider</summary>
            <p className="leading-relaxed">{post.vendor.description}</p>
          </details>
        )}
        <a
          href={post.link}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-[17px] font-semibold text-forest-800 underline-offset-4 hover:underline"
        >
          See the original post <ExternalLink className="h-4.5 w-4.5" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </article>
  );
}
