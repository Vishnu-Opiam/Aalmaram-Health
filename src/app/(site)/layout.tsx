import { Figtree, Fraunces } from "next/font/google";
import { Mail, Phone } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { PortalBrand } from "@/components/portal/ui";
import { SITE_MENU } from "@/components/site/nav";
import { SiteHeader } from "@/components/site/site-header";
import { contactEmail, contactPhone } from "@/lib/env";
import { cn } from "@/lib/utils";
import { PHOTOS } from "./content";
import "./site.css";

// Same type as the client portal, so the site and the trip page feel like one place.
const body = Figtree({ subsets: ["latin"], variable: "--font-portal-body", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-portal-display", display: "swap", axes: ["opsz"] });

/**
 * Public website shell: a slim menu, one dominant call to action (a free
 * conversation with a person) and contact details in the same place on every
 * page. Visitors are mostly 50+, so body text is 18–19 px.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const email = contactEmail();
  const phone = contactPhone();

  return (
    <div className={cn(body.variable, display.variable, "site-shell flex min-h-screen flex-col bg-kasavu-50 font-body text-[18px] leading-[1.6] text-ink-800 md:text-[19px]")}>
      <a
        href="#site-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-[17px] focus:shadow"
      >
        Skip to content
      </a>

      <SiteHeader phone={phone} />

      <main id="site-content" className="flex-1">
        {children}
      </main>

      <footer className="bg-banyan-950 text-kasavu-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <PortalBrand className="[&_span]:text-kasavu-50" />
            <p className="mt-5 max-w-md leading-relaxed text-kasavu-100">
              Aalmaram is the banyan tree: deep roots and wide shelter. We plan and look after health, wellness and
              cultural journeys in Kerala.
            </p>
            <Link href="/talk" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-gold-300 px-6 font-semibold text-banyan-950 hover:bg-kasavu-100">
              Book a free conversation
            </Link>
          </div>

          <div>
            <h2 className="text-[16px] font-semibold uppercase tracking-[0.18em] text-gold-300">Talk to us</h2>
            <ul className="mt-4 space-y-3">
              {phone && (
                <li>
                  <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center gap-3 underline-offset-4 hover:underline">
                    <Phone className="h-5 w-5 text-gold-300" aria-hidden="true" /> {phone}
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="inline-flex min-h-11 items-center gap-3 break-all underline-offset-4 hover:underline">
                    <Mail className="h-5 w-5 shrink-0 text-gold-300" aria-hidden="true" /> {email}
                  </a>
                </li>
              )}
              <li>
                <Link href="/talk" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Ask for a free conversation
                </Link>
              </li>
            </ul>
          </div>

          <nav aria-label="Footer">
            <h2 className="text-[16px] font-semibold uppercase tracking-[0.18em] text-gold-300">On this site</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-1">
              {[...SITE_MENU, { href: "/trip/sign-in", label: "My trip" }].map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-[16px] leading-relaxed text-kasavu-100 sm:px-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl space-y-3">
              <p>
                Aalmaram Health coordinates trips with independent, licensed providers in Kerala. We do not provide medical
                advice, diagnosis or treatment; clinical decisions rest with the providers who care for you.
              </p>
              <p className="text-[15px] text-kasavu-200">
                Photos from Unsplash by{" "}
                {Object.values(PHOTOS).map((photo, i, all) => (
                  <span key={photo.src}>
                    <a href={photo.href} className="underline underline-offset-2" rel="noopener noreferrer">
                      {photo.credit}
                    </a>
                    {i < all.length - 1 ? ", " : "."}
                  </span>
                ))}
              </p>
            </div>
            <Link href="/login" className="shrink-0 text-[15px] text-kasavu-100 underline underline-offset-4 hover:text-white">
              Staff sign-in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
