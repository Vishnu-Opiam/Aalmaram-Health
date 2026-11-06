import localFont from "next/font/local";
import { AppLink as Link } from "@/components/ui/primitives";
import { frame, telHref } from "@/components/site/blocks";
import { SITE_MENU } from "@/components/site/nav";
import { SiteHeader } from "@/components/site/site-header";
import { SiteMotion } from "@/components/site/motion";
import { contactEmail, contactPhone } from "@/lib/env";
import { cn } from "@/lib/utils";
import { MODULES, PHOTOS } from "./content";
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

      {/*
        Footer: no photograph (the last section above already ends on one), the
        three modules, the pages, a way to a person, and the small print.
      */}
      <footer className={cn(frame, "bg-night-raised pb-10 pt-20 md:pt-28")}>
        <div className="grid gap-14 md:grid-cols-12 md:gap-x-6">
          <div className="md:col-span-4">
            <Link href="/" className="site-display text-[clamp(2.25rem,1.6rem+2vw,3.5rem)] leading-none">Aalmaram Health</Link>
            <p className="mt-5 max-w-[24rem] leading-relaxed text-night-muted">
              Aalmaram is Malayalam for the banyan, the tree a village gathers under. We plan health, wellness and
              culture journeys in Kerala.
            </p>
          </div>

          <FooterColumn title="What we arrange" className="md:col-span-2 md:col-start-6">
            {MODULES.map((m) => (
              <FooterLink key={m.href} href={m.href}>{m.word}</FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="About" className="md:col-span-2">
            {SITE_MENU.map((item) => (
              <FooterLink key={item.href} href={item.href}>{item.label}</FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Talk to us" className="md:col-span-3">
            <FooterLink href="/talk">Book a free conversation</FooterLink>
            {phone && <FooterLink href={telHref(phone)}>{phone}</FooterLink>}
            {email && <FooterLink href={`mailto:${email}`}>{email}</FooterLink>}
            <FooterLink href="/trip/sign-in">My trip</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-20 grid gap-6 border-t border-night-ink/15 pt-8 text-[15px] leading-relaxed text-night-muted md:grid-cols-12 md:gap-x-6">
          <p className="md:col-span-5">
            Aalmaram Health coordinates trips with independent, licensed providers in Kerala. We do not provide medical
            advice, diagnosis or treatment; clinical decisions rest with the providers who care for you.
          </p>
          <p className="md:col-span-5 md:col-start-7">
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
          <Link href="/login" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-night-ink md:col-span-2 md:justify-self-end">
            Staff sign-in
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title} className={className}>
      <h2 className="text-[16px] font-medium text-night-muted">{title}</h2>
      <ul data-rise="left" className="mt-3 space-y-1">{children}</ul>
    </nav>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a href={href} className="inline-flex min-h-12 items-center text-[19px] [overflow-wrap:anywhere] transition-opacity hover:opacity-75">{children}</a>
    </li>
  );
}
