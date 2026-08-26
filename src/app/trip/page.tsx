import type { Metadata } from "next";
import { CalendarDays, FileText, MapPin } from "lucide-react";
import { requireClientPage } from "@/lib/auth/guards";
import { Alert, Badge } from "@/components/ui/primitives";
import {
  formatDateRange,
  formatLongDate,
  formatShortDate,
} from "@/domain/shared/dates";
import { clientFacingStatus } from "@/domain/itineraries/status";
import {
  SHOW_PRICES_TO_CLIENT,
  loadClientItinerary,
} from "@/domain/itineraries/client-view";
import { formatMoney } from "@/domain/itineraries/pricing";
import { renderMarkdown } from "@/lib/markdown";
import { pluralise } from "@/lib/utils";
import { DecisionPanel } from "./decision-panel";
import { signOutClientAction } from "./actions";

export const metadata: Metadata = { title: "Your journey" };

export default async function TripPage() {
  const client = await requireClientPage();
  const itinerary = await loadClientItinerary(client.id);

  // No published proposal yet: a warm holding page rather than an error.
  if (!itinerary) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-400">
          Your journey
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-ink-900">
          Welcome, {client.name.split(" ")[0]}
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-600">
          Your Aalmaram coordinator is putting your journey together. As soon as
          your proposal is ready you will receive an email, and it will appear
          here.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
          Nothing is required from you in the meantime.
        </p>
        <SignOutLink />
      </div>
    );
  }

  const state = clientFacingStatus(itinerary.status);
  const decisionItems = itinerary.days.flatMap((day) =>
    day.items.map((item) => ({
      id: item.id,
      title: item.title,
      dayLabel: day.date
        ? `${day.dayNumber ? `Day ${day.dayNumber}, ` : ""}${formatShortDate(day.date)}`
        : "Not yet scheduled",
    })),
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      {/* ---------------------------------------------------- trip overview */}
      <header>
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-400">
          Prepared for {client.name}
        </p>
        <h1 className="mt-3 font-serif text-[2.1rem] leading-[1.15] tracking-tight text-ink-900 sm:text-[2.6rem]">
          {itinerary.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-ink-600">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brass-500" aria-hidden="true" />
            {formatDateRange(itinerary.startDate, itinerary.endDate)}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brass-500" aria-hidden="true" />
            Kerala, India
          </span>
          <span>{pluralise(itinerary.itemCount, "arrangement")}</span>
        </div>

        <div className="mt-6 rounded-lg border border-sand-200 bg-white p-5">
          <Badge
            tone={
              state.tone === "neutral"
                ? "neutral"
                : state.tone === "success"
                  ? "success"
                  : state.tone === "warning"
                    ? "warning"
                    : "info"
            }
          >
            {state.label}
          </Badge>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
            {state.description}
          </p>
        </div>

        {itinerary.welcomeNote && (
          <div className="mt-6 border-l-2 border-brass-300 pl-5">
            <p className="whitespace-pre-wrap font-serif text-[17px] leading-relaxed text-ink-700">
              {itinerary.welcomeNote}
            </p>
            <p className="mt-3 text-[13px] text-ink-400">
              Your Aalmaram coordinator
            </p>
          </div>
        )}
      </header>

      {/* -------------------------------------------------------- itinerary */}
      <section aria-labelledby="itinerary-heading" className="mt-14">
        <h2
          id="itinerary-heading"
          className="font-serif text-2xl tracking-tight text-ink-900"
        >
          Your day by day
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Dates below are what we have proposed. Your coordinator confirms the
          exact times with each provider before you travel.
        </p>

        <ol className="mt-8 space-y-10">
          {itinerary.days.map((day) => (
            <li key={day.key}>
              <div className="flex items-baseline gap-3 border-b border-sand-200 pb-2">
                {day.dayNumber !== null && day.dayNumber > 0 && (
                  <span className="font-serif text-[15px] text-brass-500">
                    Day {day.dayNumber}
                  </span>
                )}
                <h3 className="text-[15px] font-medium text-ink-900">
                  {day.date ? formatLongDate(day.date) : "Still being scheduled"}
                </h3>
              </div>

              <ul className="mt-5 space-y-7">
                {day.items.map((item) => (
                  <li key={item.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="font-serif text-[19px] leading-snug text-ink-900">
                        {item.title}
                      </h4>
                      {SHOW_PRICES_TO_CLIENT && item.price && (
                        <span className="text-[13px] tabular-nums text-ink-500">
                          {formatMoney(item.price, item.currency)} {item.unit}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[13px] text-ink-400">
                      {item.moduleName} · {item.vendorName}
                      {item.vendorLocation && `, ${item.vendorLocation}`}
                    </p>

                    <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
                      {item.description}
                    </p>

                    {(item.whatsIncluded || item.clientDeliverable) && (
                      <dl className="mt-4 grid gap-4 rounded-lg bg-white p-4 sm:grid-cols-2">
                        {item.whatsIncluded && (
                          <div>
                            <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">
                              What is included
                            </dt>
                            <dd className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-600">
                              {item.whatsIncluded}
                            </dd>
                          </div>
                        )}
                        {item.clientDeliverable && (
                          <div>
                            <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">
                              What you receive
                            </dt>
                            <dd className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-600">
                              {item.clientDeliverable}
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}

                    {item.note && (
                      <p className="mt-3 border-l-2 border-teal-200 pl-4 text-[14px] italic leading-relaxed text-ink-500">
                        {item.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------- what to expect */}
      <section aria-labelledby="report-heading" className="mt-16">
        <h2
          id="report-heading"
          className="flex items-center gap-2.5 font-serif text-2xl tracking-tight text-ink-900"
        >
          <FileText className="h-5 w-5 text-brass-500" aria-hidden="true" />
          What to expect
        </h2>

        {itinerary.report ? (
          <div className="mt-6 rounded-lg border border-sand-200 bg-white px-6 py-7 sm:px-10 sm:py-10">
            <article
              className="prose-report"
              // Rendered by the server-side Markdown renderer, which escapes
              // all HTML before re-introducing a fixed tag whitelist.
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(itinerary.report.content, 2),
              }}
            />
          </div>
        ) : (
          <Alert tone="info" className="mt-5">
            Your What-to-Expect report is being prepared and will appear here
            shortly.
          </Alert>
        )}
      </section>

      {/* --------------------------------------------------------- decision */}
      <section
        aria-labelledby="decision-heading"
        className="mt-16 rounded-lg border border-sand-200 bg-white p-6 sm:p-8"
      >
        <h2
          id="decision-heading"
          className="font-serif text-2xl tracking-tight text-ink-900"
        >
          {itinerary.status === "APPROVED"
            ? "Your decision"
            : "Ready to decide?"}
        </h2>
        <p className="mt-2 mb-6 text-[15px] leading-relaxed text-ink-500">
          Take as long as you need. Nothing is booked until you approve.
        </p>

        <DecisionPanel
          itineraryId={itinerary.id}
          status={itinerary.status}
          items={decisionItems}
          hasOpenRequest={itinerary.openChangeRequests.length > 0}
        />
      </section>

      <SignOutLink />
    </div>
  );
}

function SignOutLink() {
  return (
    <form action={signOutClientAction} className="mt-12">
      <button
        type="submit"
        className="text-[13px] text-ink-400 underline underline-offset-4 hover:text-ink-600"
      >
        Sign out of this device
      </button>
    </form>
  );
}
