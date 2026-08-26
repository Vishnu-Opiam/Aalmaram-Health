"use client";

import { AppLink as Link } from "@/components/ui/primitives";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Building2,
  CalendarRange,
  LayoutDashboard,
  Layers,
  Package,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/itineraries", label: "Itineraries", icon: CalendarRange },
  { href: "/admin/vendors", label: "Vendors", icon: Building2 },
  { href: "/admin/modules", label: "Modules", icon: Layers },
  { href: "/admin/catalogues", label: "Catalogues", icon: Boxes },
  { href: "/admin/components", label: "Components", icon: Package },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="px-3 py-4">
      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                // Every admin route runs several database queries. Prefetching all
                // seven on render put a needless burst of load on the database
                // for navigation the user may never make.
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-ink-600 hover:bg-sand-100 hover:text-ink-900",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
