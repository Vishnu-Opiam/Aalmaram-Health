import { ArrowUpRight } from "lucide-react";
import { AppLink } from "@/components/ui/primitives";
import { FEED_SOURCE_LABELS, type ClientFeedPost } from "@/domain/feed/queries";
import { Photo, type PhotoSource } from "./kit";
import { cn } from "@/lib/utils";

export const FEED_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** The post's own picture, else its place's lead photo; null makes a typographic postcard. */
export function feedPhoto(post: ClientFeedPost): PhotoSource | null {
  const source = post.vendor?.name ?? FEED_SOURCE_LABELS[post.source];
  if (post.mediaUrl) return { src: post.mediaUrl, alt: `A photo shared by ${source}` };
  const hero = post.vendor?.heroPhoto;
  return hero ? { src: hero.url, alt: hero.alt, credit: hero.credit, w: hero.width, h: hero.height } : null;
}

/**
 * One postcard from Kerala: a square photo (or the caption set large when
 * there is none), then source, date, words and one quiet link out.
 */
export function FeedCard({
  post,
  ratio = "4/5",
  sizes = "(min-width:1024px) 33vw, 100vw",
  lead,
  priority,
}: {
  post: ClientFeedPost;
  ratio?: string;
  sizes?: string;
  lead?: boolean;
  priority?: boolean;
}) {
  const photo = feedPhoto(post);
  const name = post.vendor?.name ?? FEED_SOURCE_LABELS[post.source];
  const source = post.vendor ? (
    <AppLink href={`/trip/explore/${post.vendor.slug}`} className="font-medium underline decoration-mist-muted/40 underline-offset-4 hover:decoration-mist-ink">
      {name}
    </AppLink>
  ) : (
    <span className="font-medium">{name}</span>
  );
  const meta = (
    <p className="pk-label flex flex-wrap items-baseline gap-x-2 text-mist-ink">
      {source}
      <span className="whitespace-nowrap font-normal text-mist-muted">
        <span aria-hidden="true">· </span>
        <time dateTime={post.publishedAt.toISOString()}>{FEED_DATE.format(post.publishedAt)}</time>
      </span>
    </p>
  );
  const original = (
    <a
      href={post.link}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-flex min-h-12 items-center gap-1 self-start text-[16px] text-mist-muted underline decoration-mist-muted/40 underline-offset-4 hover:text-mist-ink hover:decoration-mist-ink"
    >
      See the original <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );

  if (!photo) {
    return (
      <article className="flex h-full flex-col border border-paper-line border-t-[3px] border-t-gold-500 bg-paper-raised px-6 pb-4 pt-8 md:px-8">
        <p className={cn("flex-1 font-display leading-[1.12] tracking-[-0.01em] text-mist-ink text-pretty", lead ? "text-[34px] md:text-[44px]" : "text-[26px] md:text-[30px]")}>
          {post.caption}
        </p>
        <div className="mt-6 border-t border-paper-line pt-4">
          {meta}
          {original}
        </div>
      </article>
    );
  }

  return (
    <article className={cn("flex h-full flex-col", lead && "lg:flex-row lg:gap-10")}>
      <div className={cn("-mx-4 min-[390px]:-mx-5 md:mx-0", lead && "lg:mx-0 lg:w-[62%] lg:shrink-0")}>
        <Photo photo={photo} ratio={lead ? "16/9" : ratio} sizes={lead ? "(min-width:1024px) 60vw, 100vw" : sizes} priority={priority} reveal={!priority} />
      </div>
      <div className={cn("mt-4 flex flex-1 flex-col", lead && "lg:mt-0 lg:justify-end lg:pb-1")}>
        {meta}
        <p className={cn("mt-2 text-mist-ink", lead ? "font-display text-[28px] leading-[1.15] md:text-[34px]" : "pk-body")}>{post.caption}</p>
        {original}
      </div>
    </article>
  );
}
