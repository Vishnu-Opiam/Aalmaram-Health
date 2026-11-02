import { Figtree, Fraunces } from "next/font/google";
import { AppLink as Link } from "@/components/ui/primitives";
import { PortalBrand, pill } from "@/components/portal/ui";
import { cn } from "@/lib/utils";

// Same type as the client portal, so the site and the trip page feel like one place.
const body = Figtree({ subsets: ["latin"], variable: "--font-portal-body", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-portal-display", display: "swap", axes: ["opsz"] });

const MENU = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#explore", label: "Explore" },
  { href: "/#safety", label: "Is it safe?" },
  { href: "/#pricing", label: "Pricing" },
];

/**
 * Public website shell: a slim menu and one dominant call to action (a free
 * call with a person). Visitors are mostly 50+, so 18 px body text as in /trip.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(body.variable, display.variable, "flex min-h-screen flex-col bg-sand-50 font-body text-[18px] text-ink-800")}>
      <a
        href="#site-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-[17px] focus:shadow"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Aalmaram Health — home" className="shrink-0">
            <PortalBrand />
          </Link>
          <nav aria-label="Main" className="flex items-center sm:gap-2">
            <ul className="hidden items-center gap-1 lg:flex">
              {MENU.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="rounded-full px-3 py-2 text-[16px] font-medium text-ink-700 hover:bg-sand-100 hover:text-ink-900">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <Link href="/trip/sign-in" className="whitespace-nowrap rounded-full px-2 py-2 sm:px-3 text-[16px] font-medium text-ink-700 hover:bg-sand-100 hover:text-ink-900">
              My trip
            </Link>
            <a href="/#talk" className={pill("primary", "min-h-11 whitespace-nowrap px-4 text-[16px] sm:px-5")}>
              Free call
            </a>
          </nav>
        </div>
      </header>

      <main id="site-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-sand-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl text-[16px] leading-relaxed text-ink-600">
            Aalmaram Health coordinates trips with independent, licensed providers in Kerala. We do not provide medical
            advice, diagnosis or treatment; clinical decisions rest with the providers who care for you.
          </p>
          <Link href="/login" className="shrink-0 text-[15px] text-ink-600 underline underline-offset-4 hover:text-ink-900">
            Staff sign-in
          </Link>
        </div>
      </footer>
    </div>
  );
}
