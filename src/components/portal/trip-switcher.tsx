import { AppLink as Link } from "@/components/ui/primitives";
import type { PortalTrip } from "@/domain/trips/portal";
import { cn } from "@/lib/utils";

/** Only for clients with more than one trip; the choice follows them across tabs via `?trip=`. */
export function TripSwitcher({ trips, currentId, path }: { trips: PortalTrip[]; currentId: string; path: string }) {
  if (trips.length < 2) return null;
  return (
    <nav aria-label="Your trips" className="mb-6 flex flex-wrap gap-2">
      {trips.map((t) => (
        <Link
          key={t.id}
          href={`${path}?trip=${t.id}`}
          aria-current={t.id === currentId ? "page" : undefined}
          className={cn(
            "flex min-h-12 items-center rounded-full border-2 px-5 text-[16px] font-semibold",
            t.id === currentId ? "border-forest-900 bg-forest-900 text-white" : "border-sand-200 bg-white text-ink-800 hover:border-forest-800",
          )}
        >
          {t.name}
        </Link>
      ))}
    </nav>
  );
}
