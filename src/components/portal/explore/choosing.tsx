import { buttonClass } from "@/components/portal/kit";
import { AppLink } from "@/components/ui/primitives";
import { PARTS, shortDate, type ExploreContext } from "./model";

/**
 * "Choosing for Day 4": shown while the client browses from a day on Day by
 * day (`?for=<day>&slot=<HH:mm>`). It stays at the top while scrolling;
 * every Add pre-selects that day and time and goes back to the day after.
 */
export function ChoosingBanner({ context }: { context: ExploreContext }) {
  const { choosing, trip } = context;
  if (!choosing || !trip) return null;
  const day = trip.days.find((d) => d.key === choosing.dayKey);
  if (!day) return null;
  const part = PARTS.find((p) => p.time === choosing.slot);
  const back = `/trip/itinerary?trip=${encodeURIComponent(trip.id)}&day=${day.key}`;
  return (
    <div className="pk-paper sticky top-0 z-30 border-b border-paper-line bg-paper-raised shadow-float md:top-18" role="region" aria-label="Choosing for a day">
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-gold-500" />
      <div className="pk-frame flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
        <p className="text-[17px] leading-snug">
          <span className="font-medium">Choosing for Day {day.dayNumber}</span>
          <span className="text-mist-muted">
            {" "}
            · {shortDate(day.key)}
            {choosing.slot && ` · ${part ? part.label.toLowerCase() : choosing.slot}`}
          </span>
        </p>
        <AppLink href={back} className={buttonClass("quiet")}>
          Back to Day {day.dayNumber}
        </AppLink>
      </div>
    </div>
  );
}
