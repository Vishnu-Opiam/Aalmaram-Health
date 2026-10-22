import type { Metadata } from "next";
import { requireClientPage } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/primitives";
import { loadBuilderTrip } from "@/domain/trips/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { formatLongDate, parseDateInput } from "@/domain/shared/dates";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };

/**
 * Appointment status at a glance. Until booking exists (Phase 6) every
 * activity reads "Not booked yet"; the green tick arrives with Booking.status.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const current = pickTrip(await loadPortalTrips(client.id), param(await searchParams, "trip") || undefined);
  const trip = current ? await loadBuilderTrip(current.id, { kind: "client", clientId: client.id }) : null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <h1 className="font-serif text-4xl tracking-tight text-ink-900">Calendar</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-600">
        Each activity shows whether the provider has confirmed it. We book after your itinerary is confirmed and paid.
      </p>
      {!trip ? (
        <p className="mt-8 text-[17px] text-ink-500">Nothing planned yet.</p>
      ) : (
        <ol className="mt-8 space-y-6">
          {trip.days
            .filter((day) => day.blocks.length > 0)
            .map((day) => (
              <li key={day.key}>
                <h2 className="text-[16px] font-semibold text-ink-900">
                  Day {day.dayNumber} · {formatLongDate(parseDateInput(day.key))}
                </h2>
                <ul className="mt-2 divide-y divide-sand-200 rounded-lg border border-sand-200 bg-white">
                  {day.blocks.map((block) => (
                    <li key={block.id} className="flex items-center justify-between gap-4 px-4 py-3 text-[16px]">
                      <span>
                        <span className="tabular-nums text-ink-500">{block.time}</span>{" "}
                        <span className="text-ink-900">{block.title}</span>
                      </span>
                      <Badge tone="neutral">Not booked yet</Badge>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}
