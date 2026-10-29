import type { Metadata } from "next";
import { requireClientPage } from "@/lib/auth/guards";
import { FeedCard } from "@/components/portal/feed-card";
import { loadClientFeed } from "@/domain/feed/queries";

export const metadata: Metadata = { title: "Kerala" };

/** The Feed: what Kerala looks like right now. Inspiration, after the essentials on My trip. */
export default async function KeralaPage() {
  await requireClientPage();
  const posts = await loadClientFeed();
  return (
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
      <h1 className="font-display text-[38px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[46px]">Kerala this week</h1>
      <p className="mt-3 max-w-2xl text-[19px] leading-relaxed text-ink-700">
        A glimpse of Kerala right now — from the providers we work with, Kerala Tourism and good news from the state.
      </p>
      {posts.length === 0 ? (
        <p className="mt-10 text-[18px] text-ink-700">Nothing new from Kerala yet — please check back soon.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <li key={post.id} className="portal-rise" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
              <FeedCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
