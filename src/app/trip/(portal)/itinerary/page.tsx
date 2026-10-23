import type { Metadata } from "next";
import { Check, CheckCheck, FileText, Lock, NotebookPen } from "lucide-react";
import { requireClientPage } from "@/lib/auth/guards";
import { AppLink as Link } from "@/components/ui/primitives";
import { TripBoard } from "@/components/portal/trip-board";
import { CHAT_GREETING } from "@/domain/ai/chat";
import { formatMoney } from "@/domain/itineraries/pricing";
import { loadBuilderTrip, loadLibrary } from "@/domain/trips/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { formatDateRange, parseDateInput } from "@/domain/shared/dates";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { boardIdeas, loadChat } from "@/lib/services/ai-planning";
import { cn, param } from "@/lib/utils";
import {
  addClientBlockAction,
  buildMyItineraryAction,
  confirmItineraryAction,
  moveClientBlockAction,
  placeClientIdeaAction,
  removeClientBlockAction,
  sendChatMessageAction,
  suggestForClientSlot,
  talkToPersonAction,
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

  const [trip, library, extras, chat] = await Promise.all([
    loadBuilderTrip(current.id, { kind: "client", clientId: client.id }),
    loadLibrary(),
    prisma.itinerary.findUnique({
      where: { tripId: current.id },
      select: { clientNotes: true, report: { select: { title: true, content: true, status: true } } },
    }),
    loadChat(current.id, client.id),
  ]);
  if (!trip) return null;
  const ideas = trip.editable ? await boardIdeas(trip.id, client.id) : [];
  const report = extras?.report?.status === "PUBLISHED" ? extras.report : null;
  const blocks = trip.days.flatMap((d) => d.blocks);
  const booked = blocks.filter((b) => b.progress === "booked").length;

  return (
    // Room at the bottom for the docked chat.
    <div className="mx-auto max-w-[1400px] px-3 pb-40 pt-6 sm:px-5 sm:pt-8">
      {trips.length > 1 && (
        <nav aria-label="Your trips" className="mb-4 flex flex-wrap gap-2">
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

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-serif text-[1.8rem] leading-tight tracking-tight text-ink-900 sm:text-[2.2rem]">{trip.name}</h1>
          <p className="mt-1 text-[16px] text-ink-600">
            {formatDateRange(parseDateInput(trip.startDate), parseDateInput(trip.endDate))} · {trip.travellers}{" "}
            {trip.travellers === 1 ? "traveller" : "travellers"} ·{" "}
            <span className="font-semibold tabular-nums text-ink-900" aria-live="polite">
              {formatMoney(trip.total, trip.currency)}
            </span>
          </p>
        </div>
        {trip.editable ? (
          <ConfirmPanel
            tripId={trip.id}
            total={trip.total}
            currency={trip.currency}
            blockCount={trip.blockCount}
            action={confirmItineraryAction}
          />
        ) : (
          <StatusBanner booked={booked} total={blocks.length} awaitingPayment={trip.status === "AWAITING_PAYMENT"} />
        )}
      </header>

      <p className="mb-4 mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-500">
        {trip.editable ? (
          <>
            <span>Tap anything to see more.</span>
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" /> arranged by your team
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1">
              <CheckCheck className="h-4 w-4 text-teal-600" aria-hidden="true" /> confirmed
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-success-600 text-white">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
              booked and ready
            </span>
          </>
        )}
      </p>

      <TripBoard
        trip={trip}
        library={library}
        ideas={ideas}
        actions={{
          add: addClientBlockAction,
          move: moveClientBlockAction,
          remove: removeClientBlockAction,
          place: placeClientIdeaAction,
          suggest: suggestForClientSlot,
        }}
        chat={{
          tripId: trip.id,
          greeting: CHAT_GREETING,
          initial: chat,
          send: sendChatMessageAction,
          build: buildMyItineraryAction,
          person: talkToPersonAction,
        }}
      />

      {(extras?.clientNotes || report) && (
        <div className="mt-8 space-y-3">
          {extras?.clientNotes && (
            <details className="rounded-xl border border-sand-200 bg-white px-5 py-4">
              <summary className="flex cursor-pointer items-center gap-2 text-[16px] font-medium text-ink-800">
                <NotebookPen className="h-5 w-5 text-brass-500" aria-hidden="true" /> A note from your relationship manager
              </summary>
              <p className="mt-3 whitespace-pre-wrap font-serif text-[18px] leading-relaxed text-ink-700">{extras.clientNotes}</p>
            </details>
          )}
          {report && (
            <details className="rounded-xl border border-sand-200 bg-white px-5 py-4">
              <summary className="flex cursor-pointer items-center gap-2 text-[16px] font-medium text-ink-800">
                <FileText className="h-5 w-5 text-brass-500" aria-hidden="true" /> What to expect
              </summary>
              <article
                className="prose-report mt-4"
                // Server-side Markdown renderer escapes all HTML before applying a fixed tag whitelist.
                dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content, 2) }}
              />
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBanner({ booked, total, awaitingPayment }: { booked: number; total: number; awaitingPayment: boolean }) {
  const all = total > 0 && booked === total;
  return (
    <section
      aria-label="Trip status"
      className={cn(
        "flex min-w-[260px] items-center gap-3 rounded-xl border px-4 py-3",
        all ? "border-success-200 bg-success-50" : "border-teal-200 bg-teal-50",
      )}
    >
      {all ? (
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-600 text-white">
          <Check className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
        </span>
      ) : (
        <CheckCheck className="h-8 w-8 shrink-0 text-teal-600" aria-hidden="true" />
      )}
      <div className="flex-1">
        <p className="text-[17px] font-semibold text-ink-900">{all ? "Everything is booked" : "Confirmed"}</p>
        <p className="text-[15px] text-ink-600">
          {all
            ? "You’re ready to go."
            : awaitingPayment && booked === 0
              ? "We’ll be in touch about payment, then book each activity."
              : `${booked} of ${total} booked`}
        </p>
        {!all && total > 0 && (
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-white" aria-hidden="true">
            <div className="h-1.5 rounded-full bg-success-600" style={{ width: `${(booked / total) * 100}%` }} />
          </div>
        )}
      </div>
    </section>
  );
}
