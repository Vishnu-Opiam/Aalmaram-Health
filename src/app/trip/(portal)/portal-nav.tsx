"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, House, MessageCircle, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/trip", label: "My trip", icon: House, exact: true },
  { href: "/trip/itinerary", label: "Day by day", icon: CalendarDays },
  { href: "/trip/chat", label: "Ask us", icon: MessageCircle },
  { href: "/trip/kerala", label: "Kerala", icon: Palmtree },
];

/**
 * Four labelled places, always visible: a pill bar beside the logo on wide
 * screens, a bottom tab bar on phones (where older clients know it from their
 * messaging apps). No menu to open. Plain links (full page loads): a tab
 * must never sit on a tap that didn't take, which Next's client router
 * occasionally does here just after a page has loaded.
 */
export function PortalNav({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();
  // Keep the chosen trip when moving between sections.
  const trip = useSearchParams().get("trip");
  const items = SECTIONS.map((section) => ({
    ...section,
    active: section.exact ? pathname === section.href : pathname.startsWith(section.href),
    url: trip ? `${section.href}?trip=${encodeURIComponent(trip)}` : section.href,
  }));

  if (variant === "top") {
    return (
      <nav aria-label="Your trip" className="hidden md:block">
        <ul className="flex gap-1 rounded-full border border-sand-200 bg-white p-1.5 shadow-[0_8px_24px_-18px_rgb(18_48_42/0.4)]">
          {items.map(({ href, label, icon: Icon, active, url }) => (
            <li key={href}>
              <a
                href={url}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-2 rounded-full px-5 text-[17px] font-semibold transition-colors",
                  active ? "bg-forest-900 text-white" : "text-ink-700 hover:bg-sand-100 hover:text-ink-900",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Your trip"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon, active, url }) => (
          <li key={href}>
            <a
              href={url}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-17 flex-col items-center justify-center gap-1 text-[15px] font-semibold",
                active ? "text-forest-900" : "text-ink-600",
              )}
            >
              <span className={cn("flex h-8 w-14 items-center justify-center rounded-full", active && "bg-forest-900 text-white")}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
