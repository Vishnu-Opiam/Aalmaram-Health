import type { Metadata } from "next";
import { FileText, Lock } from "lucide-react";
import { requireClientPage } from "@/lib/auth/guards";
import { AppLink as Link } from "@/components/ui/primitives";
import { ItineraryBuilder } from "@/components/builder/itinerary-builder";
import { loadBuilderTrip, loadLibrary } from "@/domain/trips/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { formatDateRange, parseDateInput } from "@/domain/shared/dates";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { cn, param } from "@/lib/utils";
import {
  addClientBlockAction,
  confirmItineraryAction,
  moveClientBlockAction,
  removeClientBlockAction,
} from "../../actions";
import { ConfirmPanel } from "./confirm-panel";

export const metadata: Metadata = { title: "Your itinerary" };

export default async function ItineraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const trips = await loadPortalTrips(client.id);
  const current = pickTrip(trips, param(await searchParams, "trip") || undefined);

  if (!current) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-serif text-4xl text-ink-900">Your itinerary</h1>
        <p className="mt-5 text-[17px] text-ink-600">
          Your relationship manager is setting up your trip. It will appear here as soon as your dates are agreed.
        </p>
      </div>
    );
  }

  const [trip, library, extras] = await Promise.all([
    loadBuilderTrip(current.id, { kind: "client", clientId: client.id }),
    loadLibrary(),
    prisma.itinerary.findUnique({
      where: { tripId: current.id },
      select: { clientNotes: true, report: { select: { title: true, content: true, status: true } } },
    }),
  ]);
  if (!trip) return null;
  const report = extras?.report?.status === "PUBLISHED" ? extras.report : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      {trips.length > 1 && (
        <nav aria-label="Your trips" className="mb-6 flex flex-wrap gap-2">
          {trips.map((t) => (
            <Link
              key={t.id}
              href={`/trip/itinerary?trip=${t.id}`}
              aria-current={t.id === trip.id ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-2 text-[15px]",
                t.id === trip.id ? "border-teal-600 bg-teal-600 text-white" : "border-sand-300 bg-white text-ink-700",
              )}
            >
              {t.name}
            </Link>
          ))}
        </nav>
      )}

      <header>
        <p className="text-[13px] uppercase tracking-[0.14em] text-ink-400">Your itinerary</p>
        <h1 className="mt-2 font-serif text-[2.1rem] leading-tight tracking-tight text-ink-900 sm:text-[2.5rem]">
          {trip.name}
        </h1>
        <p className="mt-2 text-[17px] text-ink-600">
          {formatDateRange(parseDateInput(trip.startDate), parseDateInput(trip.endDate))} · {trip.travellers}{" "}
          {trip.travellers === 1 ? "traveller" : "travellers"}
        </p>
        {extras?.clientNotes && (
          <div className="mt-6 border-l-2 border-brass-300 pl-5">
            <p className="whitespace-pre-wrap font-serif text-[18px] leading-relaxed text-ink-700">{extras.clientNotes}</p>
            <p className="mt-2 text-[14px] text-ink-400">Your relationship manager</p>
          </div>
        )}
      </header>

      <div className="mt-8">
        <ItineraryBuilder
          trip={trip}
          library={library}
          variant="client"
          actions={{ add: addClientBlockAction, move: moveClientBlockAction, remove: removeClientBlockAction }}
        />
      </div>

      <div className="mt-10">
        {trip.editable ? (
          <ConfirmPanel
            tripId={trip.id}
            total={trip.total}
            currency={trip.currency}
            blockCount={trip.blockCount}
            action={confirmItineraryAction}
          />
        ) : (
          <section className="rounded-lg border border-teal-200 bg-teal-50 p-6">
            <h2 className="flex items-center gap-2 font-serif text-2xl text-ink-900">
              <Lock className="h-5 w-5 text-teal-600" aria-hidden="true" /> Confirmed
            </h2>
            <p className="mt-2 text-[16px] leading-relaxed text-ink-700">
              {trip.status === "AWAITING_PAYMENT"
                ? "Thank you. Your relationship manager will be in touch about payment; once it is received we book each activity and you will see it confirmed here."
                : "Your itinerary is locked. For any change, please contact your relationship manager."}
            </p>
          </section>
        )}
      </div>

      {report && (
        <section aria-labelledby="report-heading" className="mt-12">
          <h2 id="report-heading" className="flex items-center gap-2 font-serif text-2xl text-ink-900">
            <FileText className="h-5 w-5 text-brass-500" aria-hidden="true" /> What to expect
          </h2>
          <div className="mt-5 rounded-lg border border-sand-200 bg-white px-6 py-7 sm:px-10">
            <article
              className="prose-report"
              // Server-side Markdown renderer escapes all HTML before applying a fixed tag whitelist.
              dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content, 2) }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
