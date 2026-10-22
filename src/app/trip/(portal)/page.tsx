import type { Metadata } from "next";
import { ArrowRight, ExternalLink, Newspaper, Palmtree, Store } from "lucide-react";
import { requireClientPage } from "@/lib/auth/guards";
import { AppLink as Link, buttonClasses } from "@/components/ui/primitives";
import { FEED_SOURCE_LABELS, loadClientFeed } from "@/domain/feed/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { daysBetweenInclusive, formatDateRange, formatShortDate, toUtcDay } from "@/domain/shared/dates";
import { signOutClientAction } from "../actions";

export const metadata: Metadata = { title: "Feed" };

const SOURCE_ICONS = { VENDOR_INSTAGRAM: Store, KERALA_TOURISM: Palmtree, NEWS: Newspaper } as const;

/** Landing page: what Kerala looks like right now, before planning. */
export default async function FeedPage() {
  const client = await requireClientPage();
  const [trips, posts] = await Promise.all([loadPortalTrips(client.id), loadClientFeed()]);
  const trip = pickTrip(trips, undefined);
  const daysToGo = trip ? daysBetweenInclusive(toUtcDay(new Date()), trip.startDate) - 1 : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[13px] uppercase tracking-[0.14em] text-ink-400">Welcome</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink-900">{client.name.split(" ")[0]}</h1>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-ink-600">
            A glimpse of Kerala right now — from the providers we work with, Kerala Tourism and good news from the state.
          </p>
        </div>
        {trip && (
          <div className="rounded-lg border border-sand-200 bg-white p-5">
            <p className="text-[13px] text-ink-500">Your trip</p>
            <p className="font-serif text-xl text-ink-900">{trip.name}</p>
            <p className="text-[15px] text-ink-600">
              {formatDateRange(trip.startDate, trip.endDate)}
              {daysToGo !== null && daysToGo > 0 && ` · in ${daysToGo} days`}
            </p>
            <Link href={`/trip/itinerary?trip=${trip.id}`} className={buttonClasses("primary", "lg", "mt-4")}>
              Plan my itinerary <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </header>

      <section aria-label="Feed" className="mt-10">
        {posts.length === 0 ? (
          <p className="text-[17px] text-ink-500">Nothing new from Kerala yet — check back soon.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const Icon = SOURCE_ICONS[post.source];
              return (
                <li key={post.id} className="flex flex-col overflow-hidden rounded-lg border border-sand-200 bg-white">
                  {post.mediaUrl ? (
                    // External social images: next/image would need every host allow-listed.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.mediaUrl} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-teal-100 via-sand-100 to-brass-100">
                      <Icon className="h-12 w-12 text-teal-600/60" aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <p className="flex items-center gap-2 text-[13px] text-ink-500">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {post.vendor?.name ?? FEED_SOURCE_LABELS[post.source]} · {formatShortDate(post.publishedAt)}
                    </p>
                    <p className="mt-2 flex-1 text-[16px] leading-relaxed text-ink-800">{post.caption}</p>
                    {post.vendor?.description && (
                      <details className="mt-3 text-[14px] text-ink-600">
                        <summary className="cursor-pointer font-medium text-teal-700">About this provider</summary>
                        <p className="mt-1">{post.vendor.description}</p>
                      </details>
                    )}
                    <a
                      href={post.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-medium text-teal-700 hover:underline"
                    >
                      See the original <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form action={signOutClientAction} className="mt-12">
        <button type="submit" className="text-[14px] text-ink-500 underline underline-offset-4 hover:text-ink-700">
          Sign out of this device
        </button>
      </form>
    </div>
  );
}
