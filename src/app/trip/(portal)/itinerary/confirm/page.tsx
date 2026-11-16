import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { requireClientPage } from "@/lib/auth/guards";
import { buttonClass } from "@/components/portal/kit/button";
import { Pass, PassStrip } from "@/components/portal/kit/pass";
import { StatusMark } from "@/components/portal/kit/status";
import { Tabular } from "@/components/portal/kit/tabular";
import {
  dayRuns,
  dayTowns,
  daysLabel,
  euros,
  shortDay,
} from "@/components/portal/days/plan";
import { firstName } from "@/components/portal/ui";
import { AppLink as Link } from "@/components/ui/primitives";
import { loadBuilderTrip } from "@/domain/trips/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { formatDateRange, parseDateInput } from "@/domain/shared/dates";
import { prisma } from "@/lib/db";
import { param } from "@/lib/utils";
import { confirmItineraryAction } from "../../../actions";
import { ConfirmPanel } from "../confirm-panel";

export const metadata: Metadata = { title: "Review and confirm" };

const WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
  "twenty-one",
];
const inWords = (n: number) => WORDS[n - 1] ?? String(n);

/**
 * The one decision that matters, set out like a letter: the trip as a pass
 * (every day, every price), then exactly what happens after "Yes". Nothing is
 * booked until the client confirms, and nothing here sells.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const current = pickTrip(
    await loadPortalTrips(client.id),
    param(await searchParams, "trip") || undefined,
  );
  if (!current) redirect("/trip");
  const [trip, manager] = await Promise.all([
    loadBuilderTrip(current.id, { kind: "client", clientId: client.id }),
    prisma.client.findUnique({
      where: { id: client.id },
      select: { relationshipManager: { select: { name: true } } },
    }),
  ]);
  if (!trip || !trip.editable || trip.blockCount === 0)
    redirect(`/trip/itinerary?trip=${current.id}`);
  const contact = manager?.relationshipManager
    ? firstName(manager.relationshipManager.name)
    : null;
  const overlaps = trip.days.filter((d) => d.blocks.some((b) => b.overlaps));
  const dayUrl = (key: string, item?: string) =>
    `/trip/itinerary?trip=${trip.id}&day=${key}${item ? `&item=${item}` : ""}`;

  return (
    <>
      <section className="pk-night">
        <div className="pk-frame pb-9 pt-4 md:pb-12 md:pt-8">
          <Link
            href={`/trip/itinerary?trip=${trip.id}`}
            className={buttonClass(
              "quiet",
              "-ml-1 gap-1 no-underline hover:underline",
            )}
          >
            <ChevronLeft
              className="h-5 w-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />{" "}
            Back to my days
          </Link>
          <p className="pk-label mt-4">Review and confirm</p>
          <h1 className="pk-h2 mt-2 md:text-[48px]">
            Your {inWords(trip.days.length)} days, in full
          </h1>
          <p className="mt-3 max-w-[60ch] text-[17px] text-night-muted md:text-[18px]">
            {trip.name} ·{" "}
            {formatDateRange(
              parseDateInput(trip.startDate),
              parseDateInput(trip.endDate),
            )}
          </p>
        </div>
      </section>

      <div className="pk-frame mt-8 md:mt-12">
        <div className="max-w-[52rem]">
          {overlaps.length > 0 && (
            <div
              role="note"
              className="mb-8 flex items-start gap-3 border-l-2 border-gold-500 bg-paper-raised px-5 py-4 text-[17px] leading-snug"
            >
              <TriangleAlert
                className="mt-0.5 h-5 w-5 shrink-0 text-gold-700"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <p>
                Two activities overlap on{" "}
                {overlaps.map((d, i) => (
                  <span key={d.key}>
                    {i > 0 && ", "}
                    <Link
                      href={dayUrl(d.key)}
                      className="font-medium underline underline-offset-4"
                    >
                      Day {d.dayNumber}
                    </Link>
                  </span>
                ))}
                . You may want to change the time of one first.
              </p>
            </div>
          )}

          <Pass>
            <PassStrip
              cells={[
                {
                  value: trip.travellers,
                  label: trip.travellers === 1 ? "Traveller" : "Travellers",
                },
                { value: trip.days.length, label: "Days" },
                { value: euros(trip.total, trip.currency), label: "Total" },
              ]}
            />
            <section
              aria-label="Everything in your trip"
              className="mt-8 border-t border-paper-line"
            >
              <ol>
                {dayRuns(trip).map((run) => {
                  const first = run.days[0];
                  return (
                    <li
                      key={first.key}
                      className="border-b border-paper-line py-5"
                    >
                      <h2 className="flex flex-wrap items-baseline gap-x-3 text-[19px] font-medium">
                        <Link
                          href={dayUrl(first.key)}
                          className="hover:underline"
                        >
                          {run.free
                            ? daysLabel(run.days)
                            : `Day ${first.dayNumber} · ${shortDay(first.key)}`}
                        </Link>
                        <span className="text-[17px] font-normal text-mist-muted">
                          {run.free
                            ? run.days.length === 1
                              ? "A free day"
                              : "Free days"
                            : dayTowns(first.blocks).join(" · ")}
                        </span>
                      </h2>
                      {!run.free && first.blocks.length > 0 && (
                        <ul className="mt-2">
                          {first.blocks.map((b) => (
                            <li key={b.id}>
                              <Link
                                href={dayUrl(first.key, b.id)}
                                className="grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-1.5 text-[17px] hover:underline md:gap-x-5"
                              >
                                <span className="text-mist-muted">
                                  <Tabular>{b.time}</Tabular>
                                </span>
                                <span>
                                  {b.title}
                                  {b.addedBy === "TEAM" && (
                                    <StatusMark
                                      progress="planned"
                                      addedBy="TEAM"
                                      className="ml-3 align-baseline text-[15px]"
                                    />
                                  )}
                                </span>
                                <span className="text-mist-muted">
                                  {euros(b.price, b.currency)}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p className="flex items-baseline justify-between gap-4 pt-6">
                <span className="text-[19px] font-medium">
                  Total for your trip
                  {trip.travellers > 1 && (
                    <span className="block text-[16px] font-normal text-mist-muted">
                      for {trip.travellers} travellers
                    </span>
                  )}
                </span>
                <span className="pk-numeral text-[44px]">
                  {euros(trip.total, trip.currency)}
                </span>
              </p>
            </section>
          </Pass>

          <section
            aria-labelledby="next-heading"
            className="pk-read mt-14 md:mt-20"
          >
            <h2 id="next-heading" className="pk-h2">
              What happens when you confirm
            </h2>
            <p className="mt-6 font-display text-[22px] leading-[1.45] md:text-[24px]">
              Dear {firstName(client.name)},
            </p>
            <p className="mt-3 font-display text-[22px] leading-[1.45] md:text-[24px]">
              Nothing is booked until you confirm. When you do, this is what
              follows:
            </p>
            <ol className="mt-6 space-y-4">
              {[
                "We keep your plan exactly as it is, at these prices.",
                `${contact ?? "Your coordinator"} contacts you about payment.`,
                "We book each activity with the people hosting you. Each one turns green here when it is confirmed.",
                `After this, changes go through ${contact ?? "your coordinator"}, who is happy to help.`,
              ].map((text, i) => (
                <li
                  key={text}
                  className="grid grid-cols-[2.5rem_1fr] items-baseline text-[18px] leading-relaxed"
                >
                  <span className="pk-numeral text-[32px] text-gold-700">
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-[17px] text-mist-muted">Aalmaram Health</p>
            <div className="mt-10">
              <ConfirmPanel tripId={trip.id} action={confirmItineraryAction} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
