import type { Metadata } from "next";
import { requireClientPage } from "@/lib/auth/guards";
import { FeedCard, feedPhoto } from "@/components/portal/feed-card";
import { SectionHeading } from "@/components/portal/kit";
import { loadClientFeed } from "@/domain/feed/queries";

export const metadata: Metadata = { title: "Kerala" };

// A calm editorial rhythm instead of 17 identical cards: photos change shape, text postcards sit between them.
const RATIOS = ["4/5", "1/1", "4/3", "4/5"];

/** The Feed: what Kerala looks like right now. Inspiration, after the essentials on My trip. */
export default async function KeralaPage() {
  await requireClientPage();
  const posts = await loadClientFeed();
  const leadIndex = Math.max(0, posts.findIndex((p) => feedPhoto(p)));
  const lead = posts[leadIndex];
  const rest = posts.filter((_, i) => i !== leadIndex);
  return (
    <>
      <header className="pk-night py-12 md:py-16">
        <div className="pk-frame">
          <SectionHeading
            as="h1"
            size="h1"
            title="Kerala this week"
            lead="Notes from the places we work with, Kerala Tourism and good news from the state."
          />
        </div>
      </header>
      <div className="pk-paper pb-16 pt-10 md:pb-24 md:pt-14">
        <div className="pk-frame">
          {posts.length === 0 ? (
            <div className="pk-read py-10">
              <p className="pk-h2">Quiet this week.</p>
              <p className="pk-body mt-4 text-mist-muted">New notes from Kerala appear here.</p>
            </div>
          ) : (
            <>
              {lead && <FeedCard post={lead} lead priority />}
              {rest.length > 0 && (
                <ul className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-y-16">
                  {rest.map((post, i) => (
                    <li key={post.id} className="min-w-0">
                      <FeedCard post={post} ratio={RATIOS[i % RATIOS.length]} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
