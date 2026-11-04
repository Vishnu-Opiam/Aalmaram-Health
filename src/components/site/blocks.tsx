import { ArrowRight } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import type { Photo as PhotoData } from "@/app/(site)/content";
import { contactPhone } from "@/lib/env";
import { cn } from "@/lib/utils";
import { ctaClass, textLinkClass } from "./nav";
import { SiteImage } from "./site-image";

/** Shared building blocks for the public site's pages (server components). */

export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;

/** One pair of outer margins for the whole site. */
export const frame = "px-5 sm:px-8 lg:px-[5vw]";

/**
 * First-guess `sizes` for a photograph filling the whole screen: on a screen
 * narrower than the photograph's shape it is the height that decides.
 */
export const fullScreen = (photo: PhotoData) => `(max-aspect-ratio: ${photo.w}/${photo.h}) ${Math.ceil((100 * photo.w) / photo.h)}vh, 100vw`;

/** A photograph that fills its box. The box decides the crop. */
export function Photo({
  photo,
  sizes,
  className,
  priority,
  drift,
  still,
  decorative,
}: {
  photo: PhotoData;
  sizes: string;
  className?: string;
  priority?: boolean;
  drift?: boolean;
  /** Skip the wipe-open and parallax, for photographs a scene animates itself. */
  still?: boolean;
  decorative?: boolean;
}) {
  return (
    <div data-photo={still || drift ? undefined : ""} className={cn("relative overflow-hidden bg-night-raised", className)}>
      <div data-drift={drift ? "" : undefined} className="absolute inset-0">
        <SiteImage photo={photo} alt={decorative ? "" : photo.alt} sizes={sizes} priority={priority} />
      </div>
    </div>
  );
}

export function BookButton({ className, children = "Book a free conversation" }: { className?: string; children?: React.ReactNode }) {
  return (
    <Link href="/talk" className={cn(ctaClass, "min-h-14 px-7 text-[18px]", className)}>
      {children}
    </Link>
  );
}

/** "Read more" from a homepage preview to its full page. */
export function MoreLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn(textLinkClass, className)}>
      {children} <ArrowRight className="h-5 w-5" aria-hidden="true" />
    </Link>
  );
}

/**
 * Top of every page: one photograph of where you would be, full screen, and the
 * page's title on a soft scrim along the bottom-left. The photograph opens on
 * arrival and drifts as you scroll on.
 */
export function PageHero({
  title,
  intro,
  photo,
  children,
  short,
}: {
  title: string;
  intro: string;
  photo: PhotoData;
  children?: React.ReactNode;
  short?: boolean;
}) {
  return (
    <section className={cn("relative isolate flex flex-col justify-end overflow-hidden bg-night text-night-ink", short ? "min-h-[78svh]" : "min-h-svh")}>
      <div data-shutter className="absolute inset-0 -z-10">
        <Photo photo={photo} sizes={fullScreen(photo)} priority drift className="h-full w-full" />
      </div>
      {/* Neutral scrims under the menu and the words only; the rest of the picture stays as taken. */}
      <div className="absolute inset-x-0 top-0 -z-10 h-44 bg-[linear-gradient(rgb(8_12_14/0.55),transparent)]" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_65%_at_10%_95%,rgb(8_12_14/0.78),transparent_72%)]" aria-hidden="true" />
      <div className={cn(frame, "pb-14 pt-40 sm:pb-20")}>
        <div data-rise className="max-w-[46rem]">
          <h1 className="site-head text-[clamp(2.4rem,1.4rem+3.6vw,4.75rem)]">{title}</h1>
          <p className="site-lead mt-6 max-w-[36rem] text-night-ink">{intro}</p>
          {children && <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">{children}</div>}
        </div>
      </div>
    </section>
  );
}

/**
 * The last thing on every page: a photograph across the screen with the
 * invitation in its right half, never crossing the middle.
 */
export function ClosingCta({ photo, title = "Talk to a person", text }: { photo: PhotoData; title?: string; text?: string }) {
  const phone = contactPhone();
  return (
    <section aria-labelledby="closing-title" className="bg-night text-night-ink">
      <div className="relative isolate md:min-h-[90svh]">
        <Photo photo={photo} sizes={fullScreen(photo)} decorative className="h-[70svh] w-full md:absolute md:inset-0 md:-z-10 md:h-full" />
        <div className="absolute inset-0 -z-10 hidden bg-[linear-gradient(90deg,transparent_30%,rgb(8_12_14/0.72)_75%)] md:block" aria-hidden="true" />
        <div className={cn(frame, "grid py-14 md:absolute md:inset-0 md:grid-cols-12 md:items-end md:py-20")}>
          <div data-rise className="md:col-span-5 md:col-start-8">
            <h2 id="closing-title" className="site-head">{title}</h2>
            <p className="mt-5 max-w-[30rem] leading-relaxed">
              {text ??
                "A free conversation with someone who knows Kerala and our providers. Tell us what you have in mind and ask anything; there is no obligation."}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              <BookButton />
              {phone && (
                <a href={telHref(phone)} className={textLinkClass}>
                  Or call {phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A section with its heading in the left third and its content in the right
 * two thirds, on one of the two grounds.
 */
export function Band({
  id,
  title,
  intro,
  tone = "night",
  children,
}: {
  id: string;
  title: string;
  intro?: React.ReactNode;
  tone?: "night" | "mist" | "raised";
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        frame,
        "grid scroll-mt-20 gap-x-6 gap-y-12 py-28 md:grid-cols-12 md:py-36",
        tone === "mist" && "bg-mist text-mist-ink",
        tone === "raised" && "bg-night-raised",
      )}
    >
      <h2 id={`${id}-title`} className="site-head max-w-[26ch] md:col-span-12">{title}</h2>
      {intro && <div className={cn("leading-relaxed md:col-span-4", tone === "mist" ? "text-mist-muted" : "text-night-muted")}>{intro}</div>}
      <div className={cn("md:col-span-7", intro ? "md:col-start-6" : "md:col-start-1 md:col-span-12 lg:col-span-10")}>{children}</div>
    </section>
  );
}

/** Titled points in two columns: the title in the display face, the text beneath. */
export function Points({ items, tone = "night" }: { items: { title: string; text: string }[]; tone?: "night" | "mist" }) {
  return (
    <ul data-rise className="grid gap-x-12 gap-y-12 sm:max-md:grid-cols-2 lg:grid-cols-2">
      {items.map((item) => (
        <li key={item.title}>
          <h3 className="site-display text-[clamp(1.75rem,1.3rem+1.2vw,2.4rem)] leading-tight">{item.title}</h3>
          <p className={cn("mt-3 leading-relaxed", tone === "mist" ? "text-mist-muted" : "text-night-muted")}>{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

/** Questions as an accordion with space between rows, no lines. */
export function Faq({ items, className, tone = "mist" }: { items: { q: string; a: string }[]; className?: string; tone?: "mist" | "night" }) {
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-3 text-[20px] font-medium leading-snug transition-opacity hover:opacity-75">
            {item.q}
            <span className="site-chevron" aria-hidden="true" />
          </summary>
          <p className={cn("max-w-[38rem] pb-5 pr-10 leading-relaxed", tone === "mist" ? "text-mist-muted" : "text-night-muted")}>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
