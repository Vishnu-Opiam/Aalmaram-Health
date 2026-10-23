"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Newspaper, Route } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/trip", label: "Feed", icon: Newspaper, exact: true },
  { href: "/trip/itinerary", label: "Itinerary", icon: Route },
];

export function PortalNav() {
  const pathname = usePathname();
  // Keep the chosen trip when moving between sections.
  const trip = useSearchParams().get("trip");
  return (
    <nav aria-label="Your trip" className="border-b border-sand-200 bg-white">
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 sm:px-5">
        {SECTIONS.map((section) => {
          const active = section.exact ? pathname === section.href : pathname.startsWith(section.href);
          const Icon = section.icon;
          return (
            <li key={section.href}>
              <Link
                href={trip ? `${section.href}?trip=${encodeURIComponent(trip)}` : section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[16px] font-medium transition-colors sm:px-4",
                  active ? "border-teal-600 text-teal-700" : "border-transparent text-ink-600 hover:text-ink-900",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
