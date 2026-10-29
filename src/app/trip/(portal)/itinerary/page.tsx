import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { requireClientPage } from "@/lib/auth/guards";
import { AppLink as Link } from "@/components/ui/primitives";
import { TripDays } from "@/components/portal/trip-days";
import { TripSwitcher } from "@/components/portal/trip-switcher";
import { firstName, pill } from "@/components/portal/ui";
import { formatMoney } from "@/domain/itineraries/pricing";
import { loadBuilderTrip, loadLibrary } from "@/domain/trips/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { formatDateRange, parseDateInput } from "@/domain/shared/dates";
import { prisma } from "@/lib/db";
import { param, pluralise } from "@/lib/utils";
import {
  addClientBlockAction,
  buildMyItineraryAction,
  moveClientBlockAction,
  removeClientBlockAction,
  suggestForClientSlot,
} from "../../actions";

export const metadata: Metadata = { title: "Day by day" };

export default async function ItineraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const params = await searchParams;
  const trips = await loadPortalTrips(client.id);
  const current = pickTrip(trips, param(params, "trip") || undefined);

  if (!current) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-[40px] font-semibold text-ink-900">Day by day</h1>
        <p className="mt-4 text-[19px] leading-relaxed text-ink-700">
          Your relationship manager is setting up your trip. Your days will appear here as soon as your dates are agreed.
        </p>
      </div>
    );
  }

  const [trip, library, manager] = await Promise.all([
    loadBuilderTrip(current.id, { kind: "client", clientId: client.id }),
    loadLibrary(),
    prisma.client.findUnique({ where: { id: client.id }, select: { relationshipManager: { select: { name: true } } } }),
  ]);
  if (!trip) return null;
  const contact = manager?.relationshipManager ? firstName(manager.relationshipManager.name) : "your team";
  const blocks = trip.days.flatMap((d) => d.blocks);
  const booked = blocks.filter((b) => b.progress === "booked").length;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <TripSwitcher trips={trips} currentId={trip.id} path="/trip/itinerary" />

      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[17px] font-semibold text-ink-600">Day by day</p>
          <h1 className="mt-1 font-display text-[34px] font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-[42px]">
            {trip.name}
          </h1>
          <p className="mt-3 text-[18px] text-ink-700">
            {formatDateRange(parseDateInput(trip.startDate), parseDateInput(trip.endDate))} ·{" "}
            {pluralise(trip.travellers, "traveller")}
          </p>
        </div>
        <section aria-label="Trip total" className="portal-card flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5">
          <div>
            <p className="text-[16px] text-ink-600">{pluralise(trip.blockCount, "activity", "activities")} · total</p>
            <p className="text-[28px] font-semibold tabular-nums leading-tight text-ink-900" aria-live="polite">
              {formatMoney(trip.total, trip.currency)}
            </p>
          </div>
          {trip.editable ? (
            trip.blockCount > 0 && (
              <Link href={`/trip/itinerary/confirm?trip=${trip.id}`} className={pill("primary")}>
                Review and confirm <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            )
          ) : (
            <p className="text-[17px] font-semibold text-ink-800" role="status">
              {booked === blocks.length && blocks.length > 0
                ? "Everything is booked"
                : trip.status === "AWAITING_PAYMENT" && booked === 0
                  ? "Confirmed · payment next"
                  : `${booked} of ${blocks.length} booked`}
            </p>
          )}
        </section>
      </header>

      <div className="mt-6">
        <TripDays
          trip={trip}
          library={library}
          contactName={contact}
          justId={param(params, "just") || null}
          justMoved={param(params, "moved") === "1"}
          actions={{
            add: addClientBlockAction,
            move: moveClientBlockAction,
            remove: removeClientBlockAction,
            build: buildMyItineraryAction,
            suggest: suggestForClientSlot,
          }}
        />
      </div>

      {trip.editable && trip.blockCount > 0 && (
        <div className="portal-card mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="max-w-lg text-[18px] leading-relaxed text-ink-800">
            Happy with your days? Review the whole trip and its price, then confirm. Nothing is booked until you do.
          </p>
          <Link href={`/trip/itinerary/confirm?trip=${trip.id}`} className={pill("primary")}>
            Review and confirm <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
