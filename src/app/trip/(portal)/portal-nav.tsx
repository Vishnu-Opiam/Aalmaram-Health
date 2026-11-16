"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, Compass, House, MessageCircle, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/trip", label: "My trip", icon: House, exact: true },
  { href: "/trip/itinerary", label: "Day by day", icon: CalendarDays },
  { href: "/trip/explore", label: "Explore", icon: Compass },
  { href: "/trip/chat", label: "Ask us", icon: MessageCircle },
  { href: "/trip/kerala", label: "Kerala", icon: Palmtree },
];

/** The five sections with the current one marked, each keeping the chosen `?trip=`. */
function useSections() {
  const pathname = usePathname();
  const trip = useSearchParams().get("trip");
  const withTrip = (href: string) => (trip ? `${href}?trip=${encodeURIComponent(trip)}` : href);
  return {
    home: withTrip("/trip"),
    items: SECTIONS.map((section) => ({
      ...section,
      active: section.exact ? pathname === section.href : pathname.startsWith(section.href),
      url: withTrip(section.href),
    })),
  };
}

/**
 * The night header. On wide screens: wordmark, the five sections as text links
 * (brass underline on the current one, as on the public site) and Sign out; it
 * stays put while scrolling. On phones it is a slim strip with the wordmark and
 * Sign out; the sections are in the bottom tab bar. A page that opens with a
 * full-bleed photo marks it `data-portal-hero`, and the header then sits on the
 * photo, turning solid after 24 px of scroll.
 *
 * Plain links (full page loads): a tab must never sit on a tap that didn't
 * take, which Next's client router occasionally does just after a page load.
 */
export function PortalHeader({ signOut }: { signOut: React.ReactNode }) {
  const { home, items } = useSections();
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header data-solid={solid || undefined} className="portal-header pk-night">
      <div className="pk-frame flex h-14 items-center gap-8 md:h-18 lg:gap-12">
        <a href={home} className="pk-wordmark inline-flex min-h-12 shrink-0 items-center" aria-label="Aalmaram Health — my trip">
          Aalmaram
        </a>
        <nav aria-label="Your trip" className="hidden md:block">
          <ul className="flex items-center gap-1 lg:gap-3">
            {items.map(({ href, label, active, url }) => (
              <li key={href}>
                <a
                  href={url}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-12 items-center whitespace-nowrap px-2.5 text-[17px] font-medium decoration-2 underline-offset-[6px] transition-[text-decoration-color] duration-200",
                    active ? "underline decoration-brass" : "decoration-transparent hover:underline hover:decoration-night-muted",
                  )}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto">{signOut}</div>
      </div>
    </header>
  );
}

/**
 * Phones: five labelled tabs on night, always visible, where older clients
 * know them from their messaging apps. 64 px plus the safe area; the current
 * tab is brass with a bar on its top edge (no pill). Wide screens use the
 * header links instead.
 */
export function PortalTabBar() {
  const { items } = useSections();
  return (
    <nav
      aria-label="Your trip"
      className="portal-tabbar pk-night fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] shadow-float md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, active, url }) => (
          <li key={href}>
            <a
              href={url}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-16 flex-col items-center justify-center gap-1 px-0.5 text-center text-[15px] font-medium leading-none",
                active ? "text-brass" : "text-night-muted",
              )}
            >
              {active && <span className="absolute inset-x-3 top-0 h-[3px] bg-brass" aria-hidden="true" />}
              <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
