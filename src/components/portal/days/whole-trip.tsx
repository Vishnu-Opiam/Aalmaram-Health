"use client";

import { Plus } from "lucide-react";
import { buttonClass } from "@/components/portal/kit/button";
import { DayThumb } from "@/components/portal/kit/day-thumb";
import { ModuleDot } from "@/components/portal/kit/module";
import { StatusMark } from "@/components/portal/kit/status";
import { Tabular } from "@/components/portal/kit/tabular";
import { PROGRESS_LABELS } from "@/components/portal/progress-tick";
import type { BuilderBlock } from "@/domain/trips/builder-view";
import { ActionButton } from "./action-button";
import { coveringBlocks, dayPhotos, dayRuns, dayState, dayTowns, daysLabel, euros, firstFreeSlot, longDay, shortDay } from "./plan";
import type { DaysCtx } from "./types";

const origin = (b: BuilderBlock) => (b.addedBy === "TEAM" ? ", arranged for you" : b.addedBy === "AI" ? ", a suggestion" : "");

/**
 * The whole trip on one page, for an overview or for printing: each day with
 * its activities as rows, runs of free days as one line ("Days 4–10 ·
 * Nothing planned yet") instead of seven empty boxes.
 */
export function WholeTrip({ ctx, onDay }: { ctx: DaysCtx; onDay: (key: string) => void }) {
  const { trip } = ctx;
  const photos = dayPhotos(trip);
  return (
    <section aria-labelledby="whole-trip-title">
      <h2 id="whole-trip-title" tabIndex={-1} className="pk-h2 outline-none">
        Your {trip.days.length} days at a glance
      </h2>
      <ol className="mt-8 border-t border-paper-line">
        {dayRuns(trip).map((run) => {
          const first = run.days[0];
          if (run.free)
            return (
              <li key={first.key} id={`day-${first.key}`} className="border-b border-paper-line py-6">
                <p className="text-[21px] font-medium">
                  {daysLabel(run.days)} · <span className="text-mist-muted">Nothing planned yet</span>
                </p>
                <p className="mt-1 text-[17px] text-mist-muted">
                  {run.days.length > 1 ? `${shortDay(first.key)} – ${shortDay(run.days.at(-1)!.key)}. ` : `${longDay(first.key)}. `}
                  {trip.editable ? "Rest, wander, or add something." : "Rest and wander."}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {run.days.map((d) => (
                    <li key={d.key}>
                      {trip.editable ? (
                        <button
                          type="button"
                          onClick={() => ctx.openAdd(d.key, firstFreeSlot(d.blocks)?.at)}
                          aria-label={`Add something to Day ${d.dayNumber}, ${longDay(d.key)}`}
                          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-dashed border-paper-perf px-4 text-[16px] hover:border-mist-ink"
                        >
                          <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                          {shortDay(d.key)}
                        </button>
                      ) : (
                        <a href={`?trip=${trip.id}&day=${d.key}`} onClick={(e) => (e.preventDefault(), onDay(d.key))} className="inline-flex min-h-12 items-center rounded-full border border-paper-line px-4 text-[16px] hover:border-mist-ink">
                          {shortDay(d.key)}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
                {!trip.editable && (
                  <ActionButton
                    action={ctx.actions.ask}
                    fields={{ tripId: trip.id, dayKey: first.key, returnTo: ctx.back(first.key) }}
                    className={buttonClass("quiet", "mt-3")}
                    pendingLabel="Sending…"
                  >
                    Ask {ctx.contact} to arrange something
                  </ActionButton>
                )}
              </li>
            );
          const covering = coveringBlocks(trip, first.key).filter((c) => c.block.day !== first.key);
          return (
            <li key={first.key} id={`day-${first.key}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 border-b border-paper-line py-6 md:grid-cols-[4.5rem_minmax(0,1fr)] md:gap-x-6">
              <DayThumb
                day={first.dayNumber}
                dateLabel={shortDay(first.key)}
                photo={photos[first.dayNumber - 1]}
                state={dayState(trip, first)}
                href={`?trip=${trip.id}&day=${first.key}`}
                className="mt-1"
              />
              <div className="min-w-0">
                <p className="text-[21px] font-medium leading-snug">
                  <a href={`?trip=${trip.id}&day=${first.key}`} onClick={(e) => (e.preventDefault(), onDay(first.key))} className="hover:underline">
                    Day {first.dayNumber} · {shortDay(first.key)}
                  </a>
                </p>
                {dayTowns([...first.blocks, ...covering.map((c) => c.block)]).length > 0 && (
                  <p className="mt-0.5 text-[17px] text-mist-muted">{dayTowns([...first.blocks, ...covering.map((c) => c.block)]).join(" · ")}</p>
                )}
                <ul className="mt-3">
                  {covering.map((c) => (
                    <li key={c.block.id} className="py-1 text-[17px] text-mist-muted">
                      Days {c.first}–{c.last} · {c.block.title}
                    </li>
                  ))}
                  {first.blocks.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => ctx.openItem(b.id)}
                        aria-label={`${b.time}, ${b.title}${origin(b)}. ${PROGRESS_LABELS[b.progress]}. Open details`}
                        className="grid min-h-12 w-full grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-2 text-left hover:bg-paper-raised md:grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] md:gap-x-5"
                      >
                        <span className="text-[17px] font-medium">
                          <Tabular>{b.time}</Tabular>
                        </span>
                        <span className="text-[18px] leading-snug">
                          {b.title} <ModuleDot moduleName={b.moduleName} label="" className="ml-1" />
                        </span>
                        <span className="col-start-2 md:col-start-auto">
                          <StatusMark progress={b.progress} addedBy={b.addedBy} />
                        </span>
                        <span className="col-start-2 text-[17px] text-mist-muted md:col-start-auto md:text-right">{euros(b.price, b.currency)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-[17px] text-mist-muted">Tap a day to open it, or an activity for its details.</p>
    </section>
  );
}
