import localFont from "next/font/local";
import { AppLink as Link } from "@/components/ui/primitives";
import { frame, Photo, telHref } from "@/components/site/blocks";
import { SITE_MENU } from "@/components/site/nav";
import { SiteHeader } from "@/components/site/site-header";
import { SiteMotion } from "@/components/site/motion";
import { contactEmail, contactPhone } from "@/lib/env";
import { cn } from "@/lib/utils";
import { PHOTOS } from "./content";
import "./site.css";

// A narrow, sharp serif for the few big words and a plain sans for everything read.
// Both from Fontshare (ITF Free Font License, free for commercial use), self-hosted.
const gambarino = localFont({ src: "./fonts/gambarino-400.woff2", weight: "400", variable: "--font-site-serif", display: "swap" });
const generalSans = localFont({
  src: [
    { path: "./fonts/general-sans-400.woff2", weight: "400" },
    { path: "./fonts/general-sans-500.woff2", weight: "500" },
  ],
  variable: "--font-site-sans",
  display: "swap",
});

/**
 * Public website shell. Visitors are mostly 50+: body text is 18–19 px, every
 * control is at least 48 px tall, and the way to a person (the free
 * conversation, the phone number) is in the same place on every page.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const email = contactEmail();
  const phone = contactPhone();

  return (
    <div className={cn(gambarino.variable, generalSans.variable, "site-shell flex min-h-svh flex-col bg-night text-[18px] leading-[1.6] text-night-ink md:text-[19px]")}>
      <a
        href="#site-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-mist focus:px-5 focus:py-3 focus:text-mist-ink"
      >
        Skip to content
      </a>

      <SiteHeader phone={phone} />

      <main id="site-content" className="flex-1">
        {children}
      </main>
      <SiteMotion />

      {/* Footer: the place, larger than anywhere above, beside the whole menu. */}
      <footer className="grid bg-night-raised md:min-h-svh md:grid-cols-2">
        <Photo photo={PHOTOS.canal} sizes="(min-width: 768px) 50vw, 100vw" decorative className="h-[50svh] md:h-auto" />
        <div className={cn(frame, "flex flex-col py-14 md:py-20 md:pl-[6vw]")}>
          <Link href="/" className="site-display text-[28px]">Aalmaram Health</Link>
          <nav aria-label="Footer" className="mt-10">
            <ul data-rise="left" className="space-y-2">
              {[...SITE_MENU, { href: "/talk", label: "Book a free conversation" }, { href: "/trip/sign-in", label: "My trip" }].map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="site-display inline-flex min-h-12 items-center text-[clamp(1.9rem,2.6vw,2.75rem)] transition-[opacity,transform] duration-300 hover:translate-x-3 hover:opacity-80">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-14 grid gap-8 text-[16px] sm:grid-cols-2">
            <div>
              <h2 className="font-medium">Talk to us</h2>
              <ul className="mt-2 space-y-1 text-night-muted">
                {phone && (
                  <li>
                    <a href={telHref(phone)} className="inline-flex min-h-11 items-center hover:text-night-ink">{phone}</a>
                  </li>
                )}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} className="inline-flex min-h-11 items-center break-all hover:text-night-ink">{email}</a>
                  </li>
                )}
                <li>
                  <Link href="/talk" className="inline-flex min-h-11 items-center hover:text-night-ink">Ask for a free conversation</Link>
                </li>
              </ul>
            </div>
            <p className="leading-relaxed text-night-muted">
              Aalmaram is Malayalam for the banyan, the tree a village gathers under. We plan health, wellness and
              culture journeys in Kerala.
            </p>
          </div>

          <div className="mt-auto space-y-3 pt-14 text-[15px] leading-relaxed text-night-muted">
            <p>
              Aalmaram Health coordinates trips with independent, licensed providers in Kerala. We do not provide medical
              advice, diagnosis or treatment; clinical decisions rest with the providers who care for you.
            </p>
            <p>
              Photographs from Unsplash by{" "}
              {Object.values(PHOTOS).map((photo, i, all) => (
                <span key={photo.src}>
                  <a href={photo.href} className="underline underline-offset-2 hover:text-night-ink" rel="noopener noreferrer">
                    {photo.credit}
                  </a>
                  {i < all.length - 1 ? ", " : "."}
                </span>
              ))}
            </p>
            <Link href="/login" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-night-ink">
              Staff sign-in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
