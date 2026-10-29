import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { requireClientPage } from "@/lib/auth/guards";
import { AppLink as Link } from "@/components/ui/primitives";
import { firstName, pill } from "@/components/portal/ui";
import { formatMoney } from "@/domain/itineraries/pricing";
import { loadBuilderTrip } from "@/domain/trips/queries";
import { capitalise } from "@/domain/trips/journey";
import type { BuilderDay } from "@/domain/trips/builder-view";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { formatDateRange, parseDateInput } from "@/domain/shared/dates";
import { prisma } from "@/lib/db";
import { param, pluralise } from "@/lib/utils";
import { confirmItineraryAction } from "../../../actions";
import { ConfirmPanel } from "../confirm-panel";

export const metadata: Metadata = { title: "Review and confirm" };

const dayLabel = (key: string) =>
  parseDateInput(key).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Days with activities stand alone; runs of free days collapse into one line. */
function dayRuns(days: BuilderDay[]): { free: boolean; days: BuilderDay[] }[] {
  const runs: { free: boolean; days: BuilderDay[] }[] = [];
  for (const day of days) {
    const free = day.blocks.length === 0;
    const last = runs.at(-1);
    if (free && last?.free) last.days.push(day);
    else runs.push({ free, days: [day] });
  }
  return runs;
}

/**
 * The whole trip on one page before the one decision that matters: what is in
 * it, what it costs, and exactly what happens after "Yes".
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const current = pickTrip(await loadPortalTrips(client.id), param(await searchParams, "trip") || undefined);
  if (!current) redirect("/trip");
  const [trip, manager] = await Promise.all([
    loadBuilderTrip(current.id, { kind: "client", clientId: client.id }),
    prisma.client.findUnique({ where: { id: client.id }, select: { relationshipManager: { select: { name: true } } } }),
  ]);
  if (!trip || !trip.editable || trip.blockCount === 0) redirect(`/trip/itinerary?trip=${current.id}`);
  const contact = manager?.relationshipManager ? firstName(manager.relationshipManager.name) : "your relationship manager";
  const overlaps = trip.days.filter((d) => d.blocks.some((b) => b.overlaps));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <Link href={`/trip/itinerary?trip=${trip.id}`} className={pill("quiet", "-ml-4")}>
        <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to my days
      </Link>
      <h1 className="mt-3 font-display text-[38px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[44px]">
        Review your trip
      </h1>
      <p className="mt-3 text-[19px] leading-relaxed text-ink-700">
        {trip.name} · {formatDateRange(parseDateInput(trip.startDate), parseDateInput(trip.endDate))} ·{" "}
        {pluralise(trip.travellers, "traveller")}
      </p>

      {overlaps.length > 0 && (
        <p className="mt-6 flex items-start gap-3 rounded-3xl bg-warning-50 px-5 py-4 text-[17px] text-ink-800" role="note">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-600" aria-hidden="true" />
          Two activities overlap on {overlaps.map((d) => `Day ${d.dayNumber}`).join(", ")}. You may want to change the time of one first.
        </p>
      )}

      <section aria-label="Everything in your trip" className="portal-card mt-6 p-5 sm:p-7">
        <ol className="space-y-6">
          {dayRuns(trip.days).map((run) =>
            run.free ? (
              <li key={run.days[0].key}>
                <h2 className="text-[18px] font-semibold text-ink-900">
                  {run.days.length === 1 ? `Day ${run.days[0].dayNumber}` : `Days ${run.days[0].dayNumber} – ${run.days.at(-1)!.dayNumber}`}
                </h2>
                <p className="mt-1 text-[17px] text-ink-600">{run.days.length === 1 ? "A free day" : "Free days"}</p>
              </li>
            ) : (
              <li key={run.days[0].key}>
                <h2 className="text-[18px] font-semibold text-ink-900">
                  Day {run.days[0].dayNumber} · <span className="font-normal text-ink-700">{dayLabel(run.days[0].key)}</span>
                </h2>
                <ul className="mt-2 divide-y divide-sand-100">
                  {run.days[0].blocks.map((b) => (
                    <li key={b.id} className="flex items-baseline gap-4 py-2.5 text-[17px]">
                      <span className="w-14 shrink-0 tabular-nums font-semibold text-ink-800">{b.time}</span>
                      <span className="min-w-0 flex-1 text-ink-900">{b.title}</span>
                      <span className="shrink-0 tabular-nums text-ink-800">{formatMoney(b.price, b.currency)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ),
          )}
        </ol>
        <p className="mt-6 flex items-baseline justify-between gap-4 border-t-2 border-sand-200 pt-5">
          <span className="text-[19px] font-semibold text-ink-900">
            Total for {pluralise(trip.blockCount, "activity", "activities")}
            {trip.travellers > 1 && `, ${trip.travellers} travellers`}
          </span>
          <span className="text-[28px] font-semibold tabular-nums text-ink-900">{formatMoney(trip.total, trip.currency)}</span>
        </p>
      </section>

      <section aria-labelledby="next-heading" className="mt-8">
        <h2 id="next-heading" className="font-display text-[26px] font-semibold text-ink-900">
          What happens when you confirm
        </h2>
        <ol className="mt-4 space-y-4">
          {[
            "We keep your plan exactly as it is, at these prices.",
            `${capitalise(contact)} contacts you about payment.`,
            "We book each activity with its provider. Each one gets a green tick when it is confirmed.",
            `After this, changes go through ${contact}, who is happy to help.`,
          ].map((text, i) => (
            <li key={text} className="flex items-start gap-4 text-[18px] leading-relaxed text-ink-800">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-900 text-[17px] font-semibold text-white">
                {i + 1}
              </span>
              <span className="pt-1">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10">
        <ConfirmPanel tripId={trip.id} action={confirmItineraryAction} />
      </div>
    </div>
  );
}
