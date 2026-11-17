import { ChevronRight } from "lucide-react";
import { ButtonLink, ModuleDot, Photo, SectionHeading, kindOf, type PhotoSource } from "@/components/portal/kit";
import { AppLink } from "@/components/ui/primitives";
import { FEED_SOURCE_LABELS, type ClientFeedPost } from "@/domain/feed/queries";
import { FEED_DATE } from "@/components/portal/feed-card";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { STEPS, toPhoto, type tripPlaces } from "./moment";

/**
 * "Where we are": the five steps as a gold thread, filled up to today's,
 * then the current step in words. Quiet on purpose: context, not a wizard.
 */
export function WhereWeAre({ step, title, text }: { step: number; title: string; text: string }) {
  return (
    <section id="where-we-are" aria-labelledby="where-heading" className="pk-frame pk-section scroll-mt-24">
      <h2 id="where-heading" className="pk-label">
        Where we are
      </h2>
      <ol className="mt-5 grid grid-cols-5 gap-2 md:gap-3">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className="min-w-0">
            <span aria-hidden="true" className={cn("block h-[3px]", i <= step ? "bg-gold-500" : "bg-paper-line")} />
            <span className={cn("mt-3 block text-[16px] leading-snug max-md:sr-only", i === step ? "font-medium text-mist-ink" : "text-mist-muted")}>
              {label}
              {i < step && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[16px] text-mist-muted md:hidden" aria-hidden="true">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      <p className="pk-h2 mt-8 md:mt-10">{title}</p>
      <p className="pk-body pk-read mt-4 text-mist-muted">{text}</p>
    </section>
  );
}

/** The travel guide, once the team publishes it: one quiet row that opens in place. */
export function TravelGuide({ content }: { content: string }) {
  return (
    <details className="group pk-frame pk-section border-y border-paper-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-6 py-6">
        <span className="flex-1">
          <span className="pk-h2 block">Your travel guide</span>
          <span className="pk-body mt-2 block text-mist-muted">What to expect, day by day. Open to read.</span>
        </span>
        <ChevronRight className="h-7 w-7 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none" strokeWidth={1.75} aria-hidden="true" />
      </summary>
      <article
        className="prose-report portal-prose pk-read pb-10"
        // Server-side Markdown renderer escapes all HTML before applying a fixed tag whitelist.
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content, 2) }}
      />
    </details>
  );
}

/** The places on this itinerary, each linking to its place page. Typographic card when a place has no photos. */
export function TripPictures({ places, after }: { places: ReturnType<typeof tripPlaces>; after: boolean }) {
  return (
    <section aria-labelledby="pictures-heading" className="pk-frame pk-section">
      <SectionHeading
        id="pictures-heading"
        label={after ? "Where you've been" : "Where you're going"}
        title="Your trip in pictures"
      />
      <ul className={cn("mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:mt-12 md:gap-x-6", places.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4")}>
        {places.slice(0, 8).map(({ place, moduleName, dayNumber }) => (
          <li key={place.slug}>
            <AppLink href={`/trip/explore/${place.slug}`} className="group block">
              <Photo
                photo={place.photos[0] ? toPhoto(place.photos[0]) : null}
                ratio="4/5"
                sizes="(min-width: 768px) 25vw, 50vw"
                zoom
                reveal
                fallback={{ title: place.name, kind: kindOf(moduleName) }}
              />
              <span className="mt-3 block text-[17px] font-medium leading-snug underline-offset-4 group-hover:underline md:text-[19px]">{place.name}</span>
              <ModuleDot moduleName={moduleName} label={`Day ${dayNumber}${place.city ? ` · ${place.city}` : ""}`} className="mt-1 text-[15px] text-mist-muted md:text-[16px]" />
            </AppLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

const postPhoto = (post: ClientFeedPost): PhotoSource | null =>
  post.mediaUrl ? { src: post.mediaUrl, alt: "" } : post.vendor?.heroPhoto ? { ...toPhoto(post.vendor.heroPhoto), alt: "" } : null;

/** A taste of the Kerala tab: two or three postcards, each opening the feed. */
export function KeralaTeaser({ posts, href }: { posts: ClientFeedPost[]; href: string }) {
  return (
    <section aria-labelledby="kerala-heading" className="pk-frame pk-section">
      <SectionHeading
        id="kerala-heading"
        title="Kerala, this week"
        lead="From the places you'll visit, and from around Kerala."
        action={
          <ButtonLink href={href} variant="secondary">
            More from Kerala
          </ButtonLink>
        }
      />
      <ul className="mt-8 grid gap-8 md:mt-12 md:grid-cols-3 md:gap-6">
        {posts.map((post, i) => {
          const photo = postPhoto(post);
          return (
            <li key={post.id} className={cn(i > 1 && "max-md:hidden")}>
              <AppLink href={href} className="group flex h-full flex-col">
                {photo ? (
                  // w-full: in a flex column an aspect-ratio box can take its width from the row's height instead.
                  <Photo photo={photo} ratio="3/2" className="w-full" sizes="(min-width: 768px) 33vw, 100vw" zoom reveal />
                ) : (
                  <span aria-hidden="true" className="block h-[3px] bg-gold-500" />
                )}
                <span className="mt-4 block text-[15px] font-medium text-mist-muted md:text-[16px]">
                  {post.vendor?.name ?? FEED_SOURCE_LABELS[post.source]} · {FEED_DATE.format(post.publishedAt)}
                </span>
                <span className={cn("mt-2 block underline-offset-4 group-hover:underline", photo ? "line-clamp-3 text-[18px] leading-relaxed" : "line-clamp-6 font-display text-[26px] leading-[1.25]")}>
                  {post.caption}
                </span>
              </AppLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
