import type { Metadata } from "next";
import { ArrowRight, Check, ChevronRight, FileText } from "lucide-react";
import { requireClientPage } from "@/lib/auth/guards";
import { AppLink as Link } from "@/components/ui/primitives";
import { ContactCard } from "@/components/portal/contact-card";
import { FeedCard } from "@/components/portal/feed-card";
import { KeralaScene } from "@/components/portal/kerala-scene";
import { TripSwitcher } from "@/components/portal/trip-switcher";
import { KindIcon, StatusPill, firstName, pill } from "@/components/portal/ui";
import { loadClientFeed } from "@/domain/feed/queries";
import { formatMoney } from "@/domain/itineraries/pricing";
import { JOURNEY_STEPS, capitalise, journeyStage, momentLabel, tripMoment } from "@/domain/trips/journey";
import { loadBuilderTrip } from "@/domain/trips/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import type { BuilderBlock, BuilderTrip } from "@/domain/trips/builder-view";
import { formatDateRange, parseDateInput, toDateInputValue, toUtcDay } from "@/domain/shared/dates";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { cn, param, pluralise } from "@/lib/utils";
import { talkToPersonAction } from "../actions";

export const metadata: Metadata = { title: "My trip" };

const dayLabel = (key: string) =>
  parseDateInput(key).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Home: answers, in this order, "is everything in order and what's next?",
 * "when are my appointments?", "who do I talk to?" — then a taste of Kerala.
 */
export default async function MyTripPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const trips = await loadPortalTrips(client.id);
  const current = pickTrip(trips, param(await searchParams, "trip") || undefined);
  const [trip, record, extras, posts] = await Promise.all([
    current ? loadBuilderTrip(current.id, { kind: "client", clientId: client.id }) : null,
    prisma.client.findUnique({
      where: { id: client.id },
      select: { relationshipManager: { select: { name: true, email: true } } },
    }),
    current
      ? prisma.itinerary.findUnique({
          where: { tripId: current.id },
          select: { clientNotes: true, report: { select: { content: true, status: true } } },
        })
      : null,
    loadClientFeed(3),
  ]);
  const manager = record?.relationshipManager ?? null;
  const contact = manager ? firstName(manager.name) : "your team";
  const report = extras?.report?.status === "PUBLISHED" ? extras.report : null;
  const greeting = `Hello, ${firstName(client.name)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-2 sm:px-6">
      {trip && <TripSwitcher trips={trips} currentId={trip.id} path="/trip" />}

      {trip ? (
        <Hero trip={trip} greeting={greeting} />
      ) : (
        <section className="portal-rise relative overflow-hidden rounded-[2rem] bg-[#a3c6b9]">
          <KeralaScene className="absolute inset-x-0 top-0 h-60 w-full sm:inset-0 sm:h-full" />
          <div className="relative px-5 pb-6 pt-44 sm:p-10 sm:pt-56">
            <div className="max-w-xl rounded-[1.75rem] bg-white/85 p-6 ring-1 ring-white/60 backdrop-blur-md sm:p-8">
              <p className="text-[19px] font-semibold text-ink-700">{greeting}</p>
              <h1 className="mt-2 font-display text-[36px] font-semibold leading-tight text-ink-900">Welcome to Aalmaram Health</h1>
              <p className="mt-3 text-[18px] leading-relaxed text-ink-700">
                {manager ? contact : "Your team"} is preparing your trip. It will appear here as soon as your dates are agreed.
              </p>
            </div>
          </div>
        </section>
      )}

      {trip && <NextStep trip={trip} contact={contact} />}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {trip ? <Appointments trip={trip} contact={contact} /> : <div className="hidden lg:block" />}
        <div className="space-y-6">
          <ContactCard
            tripId={trip?.id ?? null}
            name={manager?.name ?? null}
            email={manager?.email ?? null}
            asked={false}
            action={talkToPersonAction}
          />
          {extras?.clientNotes && (
            <section aria-labelledby="note-heading" className="portal-card bg-marigold-50/60 p-6 sm:p-7">
              <h2 id="note-heading" className="text-[17px] font-semibold text-marigold-700">
                A note from {contact}
              </h2>
              <p className="mt-3 whitespace-pre-wrap font-display text-[20px] leading-relaxed text-ink-800">{extras.clientNotes}</p>
            </section>
          )}
        </div>
      </div>

      {report && (
        <details className="portal-card group mt-6 p-6 sm:p-8">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-lagoon-50 text-lagoon-700" aria-hidden="true">
              <FileText className="h-6 w-6" />
            </span>
            <span className="flex-1">
              <span className="block font-display text-[24px] font-semibold text-ink-900">Your travel guide</span>
              <span className="block text-[16px] text-ink-600">What to expect, day by day. Open to read.</span>
            </span>
            <ChevronRight className="h-6 w-6 text-ink-600 transition-transform group-open:rotate-90" aria-hidden="true" />
          </summary>
          <article
            className="prose-report portal-prose mt-6"
            // Server-side Markdown renderer escapes all HTML before applying a fixed tag whitelist.
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content, 2) }}
          />
        </details>
      )}

      {posts.length > 0 && (
        <section aria-labelledby="kerala-heading" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="kerala-heading" className="font-display text-[30px] font-semibold text-ink-900">
                Kerala this week
              </h2>
              <p className="mt-1 text-[18px] text-ink-700">From the providers we work with, Kerala Tourism and good news from the state.</p>
            </div>
            <Link href={trip ? `/trip/kerala?trip=${trip.id}` : "/trip/kerala"} className={pill("secondary")}>
              More from Kerala <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-6 grid gap-6 md:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                <FeedCard post={post} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Hero({ trip, greeting }: { trip: BuilderTrip; greeting: string }) {
  const start = parseDateInput(trip.startDate);
  const end = parseDateInput(trip.endDate);
  const facts = [
    { label: "Days", value: String(trip.days.length) },
    { label: trip.travellers === 1 ? "Traveller" : "Travellers", value: String(trip.travellers) },
    { label: trip.editable ? "Total so far" : "Total", value: formatMoney(trip.total, trip.currency) },
  ];
  return (
    <section aria-label="Your trip" className="portal-rise relative overflow-hidden rounded-[2rem] bg-[#a3c6b9]">
      <KeralaScene className="absolute inset-x-0 top-0 h-60 w-full sm:inset-0 sm:h-full" />
      <div className="relative px-4 pb-4 pt-40 sm:px-8 sm:pb-8 sm:pt-52 lg:pt-24">
        <div className="max-w-2xl rounded-[1.75rem] bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgb(11_31_26/0.6)] ring-1 ring-white/60 backdrop-blur-md sm:p-8">
          <p className="text-[19px] font-semibold text-ink-700">{greeting}</p>
          <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.08] tracking-tight text-ink-900 sm:text-[46px]">
            {trip.name}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-3 text-[18px] text-ink-700">
            <span className="rounded-full bg-forest-900 px-4 py-1.5 text-[17px] font-semibold text-white">
              {momentLabel(tripMoment(start, end, new Date()))}
            </span>
            {formatDateRange(start, end)}
          </p>
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-sand-200 pt-5">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-[15px] font-semibold text-ink-600">{f.label}</dt>
                <dd className="mt-0.5 text-[22px] font-semibold tabular-nums leading-tight text-ink-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function NextStep({ trip, contact }: { trip: BuilderTrip; contact: string }) {
  const blocks = trip.days.flatMap((d) => d.blocks);
  const stage = journeyStage(
    trip.status,
    { activities: blocks.length, booked: blocks.filter((b) => b.progress === "booked").length },
    contact,
  );
  const travelling = stage.step >= JOURNEY_STEPS.length;
  return (
    <section aria-labelledby="next-heading" className="portal-card portal-rise mt-6 p-6 sm:p-8" style={{ animationDelay: "80ms" }}>
      <h2 id="next-heading" className="text-[17px] font-semibold text-ink-600">
        {travelling ? "Your trip" : "What happens next"}
      </h2>
      {!travelling && (
        <>
          <p className="mt-2 text-[17px] font-semibold text-ink-800 sm:hidden">
            Step {stage.step + 1} of {JOURNEY_STEPS.length}: {JOURNEY_STEPS[stage.step]}
          </p>
          <div className="mt-3 flex gap-1.5 sm:hidden" aria-hidden="true">
            {JOURNEY_STEPS.map((s, i) => (
              <span key={s} className={cn("h-2 flex-1 rounded-full", i <= stage.step ? "bg-forest-900" : "bg-sand-200")} />
            ))}
          </div>
          <ol className="mt-5 hidden grid-cols-5 gap-3 sm:grid">
            {JOURNEY_STEPS.map((label, i) => {
              const done = i < stage.step;
              const now = i === stage.step;
              return (
                <li key={label} aria-current={now ? "step" : undefined} className="flex flex-col gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[17px] font-semibold",
                        done && "bg-success-600 text-white",
                        now && "bg-forest-900 text-white ring-4 ring-forest-900/15",
                        !done && !now && "border-2 border-sand-300 text-ink-600",
                      )}
                    >
                      {done ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> : i + 1}
                    </span>
                    {i < JOURNEY_STEPS.length - 1 && (
                      <span className={cn("h-0.5 flex-1 rounded-full", done ? "bg-success-600" : "bg-sand-200")} aria-hidden="true" />
                    )}
                  </span>
                  <span className={cn("text-[16px] font-semibold", now ? "text-ink-900" : "text-ink-600")}>
                    {label}
                    {done && <span className="sr-only"> (done)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <p className="mt-6 font-display text-[28px] font-semibold leading-tight text-ink-900">{stage.title}</p>
      <p className="mt-2 max-w-2xl text-[18px] leading-relaxed text-ink-700">{stage.text}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/trip/itinerary?trip=${trip.id}`} className={pill("primary")}>
          {trip.editable ? "Plan my days" : "See my days"} <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
        {trip.editable && trip.blockCount > 0 && (
          <Link href={`/trip/itinerary/confirm?trip=${trip.id}`} className={pill("secondary")}>
            Review and confirm
          </Link>
        )}
      </div>
    </section>
  );
}

/** While planning: what the team arranged. Afterwards: what's coming up, with its booking status. */
function Appointments({ trip, contact }: { trip: BuilderTrip; contact: string }) {
  const blocks = trip.days.flatMap((d) => d.blocks);
  const today = toDateInputValue(toUtcDay(new Date()));
  const shown: BuilderBlock[] = trip.editable
    ? blocks.filter((b) => b.addedBy === "TEAM")
    : blocks.filter((b) => b.day >= today).slice(0, 5);
  const title = trip.editable ? "Arranged for you" : "Coming up";
  return (
    <section aria-labelledby="appointments-heading" className="portal-card portal-rise p-6 sm:p-7" style={{ animationDelay: "160ms" }}>
      <h2 id="appointments-heading" className="font-display text-[26px] font-semibold text-ink-900">
        {title}
      </h2>
      <p className="mt-1 text-[17px] text-ink-700">
        {trip.editable
          ? "Your health appointments, and what your team has planned around them."
          : `${pluralise(blocks.length, "activity", "activities")} in your trip.`}
      </p>
      {shown.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-sand-100/70 px-5 py-4 text-[17px] leading-relaxed text-ink-700">
          {trip.editable
            ? `${capitalise(contact)} is arranging these with the clinics. They will appear here.`
            : "Nothing more to come — welcome home."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-sand-100">
          {shown.map((b) => (
            <li key={b.id}>
              <Link
                href={`/trip/itinerary?trip=${trip.id}&item=${b.id}#day-${b.day}`}
                className="-mx-3 flex items-center gap-4 rounded-3xl px-3 py-4 hover:bg-sand-50"
              >
                <KindIcon moduleName={b.moduleName} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold tabular-nums text-ink-700">
                    {dayLabel(b.day)} · {b.time}
                  </span>
                  <span className="block text-[19px] font-semibold leading-snug text-ink-900">{b.title}</span>
                  <span className="block text-[16px] text-ink-600">
                    {[b.branchLabel, b.provider.name].filter(Boolean).join(" · ")}
                  </span>
                  {!trip.editable && <StatusPill block={b} className="mt-2" />}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-600" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
