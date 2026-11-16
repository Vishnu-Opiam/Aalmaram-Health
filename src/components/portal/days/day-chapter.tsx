"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { buttonClass } from "@/components/portal/kit/button";
import { ModuleDot } from "@/components/portal/kit/module";
import { Pass } from "@/components/portal/kit/pass";
import { Photo } from "@/components/portal/kit/photo";
import { StatusMark } from "@/components/portal/kit/status";
import { Tabular } from "@/components/portal/kit/tabular";
import { PROGRESS_LABELS } from "@/components/portal/progress-tick";
import { AppLink } from "@/components/ui/primitives";
import { formatDuration } from "@/domain/vendors/profile";
import type { BuilderBlock, BuilderDay, LibraryComponent } from "@/domain/trips/builder-view";
import { cn } from "@/lib/utils";
import { ActionButton } from "./action-button";
import {
  cardPhotos,
  coveringBlocks,
  dayPhoto,
  dayRuns,
  dayState,
  dayTimeline,
  dayTowns,
  daysLabel,
  euros,
  fits,
  forParty,
  freeDayPhoto,
  libraryPriceLine,
  longDay,
  overlapPartner,
  toMin,
  toSource,
  toTime,
  weekday,
  DAY_END,
  type FreeSlot,
} from "./plan";
import type { DaysCtx, Suggestion } from "./types";

/**
 * One day as a chapter: its photograph with the day's number, the towns it
 * takes you to, then Morning / Afternoon / Evening with each activity as a
 * photo card and the free time between them as "+ Add something here". A
 * free day shows ideas instead of an empty box; booked things are passes.
 */
export function DayChapter({ ctx, day }: { ctx: DaysCtx; day: BuilderDay }) {
  const { trip } = ctx;
  const state = dayState(trip, day);
  const free = state === "free";
  const covering = coveringBlocks(trip, day.key);
  const photo = dayPhoto(trip, day) ?? (free ? freeDayPhoto(day.dayNumber) : null);
  const towns = dayTowns([...day.blocks, ...covering.map((c) => c.block)]);
  const run = free ? dayRuns(trip).find((r) => r.free && r.days.some((d) => d.key === day.key))!.days : [day];
  const timeline = dayTimeline(day.blocks);
  const timed = day.blocks.filter((b) => b.spanDays === 1);
  const firstFree = timeline.flatMap((t) => t.entries).find((e): e is FreeSlot => e.kind === "free");

  return (
    <section id={`day-${day.key}`} aria-labelledby={`day-${day.key}-title`} className="days-chapter">
      <Photo
        photo={photo}
        sizes="(min-width: 1024px) 820px, (min-width: 768px) 60vw, 100vw"
        priority
        scrim={photo ? "bottom" : undefined}
        className={cn("-mx-4 min-[390px]:-mx-5 md:mx-0", photo ? "aspect-[4/3] md:aspect-[16/9]" : "aspect-[2/1] md:aspect-[3/1]")}
        overlayClassName="items-end p-5 md:p-8"
      >
        <h2 id={`day-${day.key}-title`} tabIndex={-1} className="flex items-end gap-4 outline-none md:gap-6">
          <span className="sr-only">Day </span>
          <span className="pk-numeral pk-numeral-day">{day.dayNumber}</span>
          <span className="pb-1 text-[19px] leading-snug md:pb-2 md:text-[22px]">
            <span className="sr-only">, </span>
            {weekday(day.key)}
            <br />
            {longDay(day.key).replace(/^\S+\s/, "")}
          </span>
        </h2>
      </Photo>
      {photo?.credit && <p className="mt-2 text-right text-[14px] text-mist-muted">Photo: {photo.credit}</p>}

      <div className="mt-6 md:mt-8">
        {free ? (
          <>
            <p className="pk-h2">Nothing planned yet</p>
            <p className="pk-body mt-3 max-w-[40rem] text-mist-muted">
              {run.length > 1 ? `${daysLabel(run)} are open. ` : "A free day. "}
              {trip.editable ? "Rest, wander, or add something." : `Rest and wander. If you would like something arranged, ${ctx.contact} can help.`}
            </p>
          </>
        ) : (
          <>
            {towns.length > 0 && <p className="pk-h2">{towns.join(" · ")}</p>}
            <p className="pk-label mt-3">{summary(day, firstFree)}</p>
          </>
        )}
      </div>

      {covering.map((c) => (
        <Banner key={c.block.id} ctx={ctx} block={c.block} first={c.first} last={c.last} />
      ))}

      {free && trip.editable && <FreeDayIdeas ctx={ctx} day={day} />}
      {free && !trip.editable && (
        <ActionButton
          action={ctx.actions.ask}
          fields={{ tripId: trip.id, dayKey: day.key, returnTo: ctx.back(day.key) }}
          className={buttonClass("secondary", "mt-6")}
          pendingLabel="Sending…"
        >
          Ask {ctx.contact} to arrange something
        </ActionButton>
      )}

      {free && trip.editable && (
        <div role="group" aria-label="Or choose a time" className="mt-10">
          <p className="pk-label mb-4">Or start from a time</p>
          <div className="flex flex-wrap gap-2">
            {timeline.flatMap(({ part, entries }) =>
              entries.flatMap((e) =>
                e.kind === "free"
                  ? [
                      <button
                        key={part.key}
                        type="button"
                        onClick={() => ctx.openAdd(day.key, e.at)}
                        aria-label={`Add something to Day ${day.dayNumber}, ${part.label.toLowerCase()}, from ${e.at}`}
                        className="inline-flex min-h-14 items-center gap-2.5 rounded-full border border-dashed border-paper-perf bg-paper px-5 text-[17px] hover:border-mist-ink hover:bg-paper-raised"
                      >
                        <Plus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                        {part.label} <span className="text-mist-muted"><Tabular>{e.at}</Tabular></span>
                      </button>,
                    ]
                  : [],
              ),
            )}
          </div>
        </div>
      )}

      {!free && (timed.length > 0 || trip.editable) && covering.length === 0 && (
        <div className="mt-10 space-y-8">
          {timeline.map(({ part, entries }) =>
            entries.length === 0 || (!trip.editable && entries.every((e) => e.kind === "free")) ? null : (
              <div key={part.key} role="group" aria-label={part.label}>
                <p className="pk-label mb-4 flex items-center gap-3">
                  {part.label}
                  <span aria-hidden="true" className="h-px flex-1 bg-paper-line" />
                </p>
                <ol className="space-y-0">
                  {entries.map((entry) =>
                    entry.kind === "block" ? (
                      <TimelineItem key={entry.block.id} ctx={ctx} day={day} block={entry.block} />
                    ) : trip.editable ? (
                      <FreeRow key={`free-${entry.at}`} ctx={ctx} day={day} slot={entry} part={part.label.toLowerCase()} />
                    ) : null,
                  )}
                </ol>
              </div>
            ),
          )}
        </div>
      )}
      {covering.length > 0 && timed.length > 0 && (
        <ol className="mt-10">
          {timed.map((b) => (
            <TimelineItem key={b.id} ctx={ctx} day={day} block={b} />
          ))}
        </ol>
      )}

      {trip.editable && (
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-paper-line pt-6">
          {(!firstFree || covering.length > 0) && <button
            type="button"
            onClick={() => ctx.openAdd(day.key, firstFree?.at)}
            aria-label={`Add something to Day ${day.dayNumber}`}
            className={buttonClass("secondary")}
          >
            <Plus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /> Add to {weekday(day.key)}
          </button>}
          <AppLink href={ctx.explore(day.key, firstFree?.at)} className={buttonClass("quiet")}>
            Browse everything for {weekday(day.key)}
          </AppLink>
        </div>
      )}
    </section>
  );
}

function summary(day: BuilderDay, firstFree: FreeSlot | undefined): string {
  const n = day.blocks.length;
  const count = n === 1 ? "1 activity" : `${n} activities`;
  return firstFree ? `${count} · free from ${firstFree.at}` : count;
}

const origin = (b: BuilderBlock) => (b.addedBy === "TEAM" ? ", arranged for you" : b.addedBy === "AI" ? ", a suggestion" : "");

/** An activity on the timeline: time on the left, a gold thread, the photo card. */
function TimelineItem({ ctx, day, block }: { ctx: DaysCtx; day: BuilderDay; block: BuilderBlock }) {
  const partner = overlapPartner(day, block);
  // Said once, before the later of the two.
  const showOverlap = partner && (toMin(partner.time) < toMin(block.time) || (partner.time === block.time && partner.id < block.id));
  return (
    <>
      {showOverlap && <OverlapBand ctx={ctx} day={day} earlier={partner} later={block} />}
      <li id={`block-${block.id}`} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[5rem_minmax(0,1fr)] md:gap-x-6">
        <p className="pt-1 text-right leading-tight">
          <span className="pk-time block text-[19px] md:text-[22px]">
            <Tabular>{block.time}</Tabular>
          </span>
          <span className="mt-1 block text-[16px] text-mist-muted">
            <Tabular>{block.endTime}</Tabular>
          </span>
        </p>
        <div className={cn("relative border-l border-gold-500 pb-8 pl-4 md:pl-6", ctx.highlight?.id === block.id && "pk-thread-flash")}>
          <span aria-hidden="true" className={cn("absolute -left-[5px] top-3 h-[9px] w-[9px] rounded-full ring-3 ring-paper", dotClass(block.moduleName))} />
          <ItemCard ctx={ctx} block={block} />
        </div>
      </li>
    </>
  );
}

const dotClass = (moduleName: string) =>
  /health|medical/i.test(moduleName) ? "bg-lagoon-600" : /wellness|spa/i.test(moduleName) ? "bg-leaf-600" : "bg-laterite-600";

/** The card itself: a photo, then title, place and town, length, price and state. Booked → a pass. */
export function ItemCard({ ctx, block }: { ctx: DaysCtx; block: BuilderBlock }) {
  const { trip } = ctx;
  const just = ctx.highlight?.id === block.id ? ctx.highlight.label : null;
  const lead = block.place.photos[0];
  const pass = block.progress !== "planned";
  const body = (
    <button
      type="button"
      onClick={() => ctx.openItem(block.id)}
      aria-label={`${block.time}, ${block.title}${origin(block)}. ${PROGRESS_LABELS[block.progress]}. Open details`}
      className={cn("group grid w-full gap-4 text-left md:grid-cols-[10rem_minmax(0,1fr)] md:gap-6", just && "portal-just-added rounded-[2px]")}
    >
      <Photo
        photo={lead ? toSource(lead) : null}
        sizes="(min-width: 768px) 160px, 80vw"
        zoom
        fallback={{ title: block.place.name }}
        className="aspect-[16/9] md:aspect-square [&_p]:text-[22px]"
      />
      <span className="min-w-0">
        <span className="block text-[21px] font-medium leading-snug text-mist-ink underline decoration-transparent decoration-1 underline-offset-4 group-hover:decoration-mist-ink/40 md:text-[22px]">
          {block.title}
        </span>
        <span className="mt-1.5 block text-[17px] leading-snug text-mist-muted">
          <ModuleDot moduleName={block.moduleName} className="text-mist-ink" />
          {" · "}
          {[block.place.city ?? block.branchLabel, block.place.name].filter(Boolean).join(" · ")}
        </span>
        <span className="mt-1.5 block text-[17px] text-mist-muted">
          {formatDuration(block.durationMinutes)} · {euros(block.price, block.currency)} {forParty(trip.travellers)}
        </span>
        {!pass && <StatusMark progress={block.progress} addedBy={block.addedBy} className="mt-3" />}
        {just && (
          <span className="mt-3 flex items-center gap-2 text-[16px] font-medium text-gold-700">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold-500" />
            {just}
          </span>
        )}
      </span>
    </button>
  );
  if (!pass) return body;
  return (
    <Pass
      state={block.progress === "booked" ? "booked" : "pending"}
      kasavu={false}
      mainClassName="p-4 md:p-5"
      stubClassName="flex items-center justify-between gap-4 md:flex-col md:items-start md:justify-center md:w-44"
      stub={
        <>
          <StatusMark progress={block.progress} />
          <span className="text-[16px] text-mist-muted">{trip.travellers > 1 ? `${trip.travellers} travellers` : "1 traveller"}</span>
        </>
      }
    >
      {body}
    </Pass>
  );
}

/** "+ Add something here": free time on the timeline, its start pre-filled. */
function FreeRow({ ctx, day, slot, part }: { ctx: DaysCtx; day: BuilderDay; slot: FreeSlot; part: string }) {
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[5rem_minmax(0,1fr)] md:gap-x-6">
      <p className="pt-4 text-right text-[16px] leading-tight text-mist-muted">
        <Tabular>{slot.at}</Tabular>
      </p>
      <div className="border-l border-dashed border-paper-perf pb-8 pl-4 md:pl-6">
        <button
          type="button"
          onClick={() => ctx.openAdd(day.key, slot.at)}
          aria-label={`Add something to Day ${day.dayNumber}, ${part}, from ${slot.at}`}
          className="flex min-h-16 w-full items-center gap-4 rounded-[6px] border border-dashed border-paper-perf px-4 py-3 text-left transition-colors hover:border-mist-ink hover:bg-paper-raised md:px-5"
        >
          <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mist-ink/40">
            <Plus className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span>
            <span className="block text-[18px] font-medium">Add something here</span>
            <span className="block text-[16px] text-mist-muted">
              Free {slot.until >= DAY_END ? `from ${slot.at}` : `${slot.at} – ${toTime(slot.until)}`}
            </span>
          </span>
        </button>
      </div>
    </li>
  );
}

/** A programme of several days, across each day it covers. */
function Banner({ ctx, block, first, last }: { ctx: DaysCtx; block: BuilderBlock; first: number; last: number }) {
  return (
    <div className="mt-8 border-y border-gold-500 py-5">
      <button type="button" onClick={() => ctx.openItem(block.id)} className="group flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-left">
        <span>
          <span className="pk-label block">
            Days {first}–{last} · <ModuleDot moduleName={block.moduleName} />
          </span>
          <span className="mt-1 block text-[21px] font-medium leading-snug group-hover:underline">{block.title}</span>
          <span className="mt-1 block text-[17px] text-mist-muted">
            {[block.place.city, block.place.name].filter(Boolean).join(" · ")} · from {block.time} on Day {first}
          </span>
        </span>
        <StatusMark progress={block.progress} addedBy={block.addedBy} />
      </button>
    </div>
  );
}

/** Two activities at once, said plainly, with the fix one tap away. */
function OverlapBand({ ctx, day, earlier, later }: { ctx: DaysCtx; day: BuilderDay; earlier: BuilderBlock; later: BuilderBlock }) {
  const after = Math.ceil((toMin(earlier.time) + earlier.durationMinutes) / 15) * 15;
  const target = later.canEdit ? later : earlier.canEdit ? earlier : null;
  const oneTap = target === later && after + later.durationMinutes <= DAY_END + 60 && fits(ctx.trip, day.key, toTime(after), later, later.id);
  return (
    <li className="mb-6 ml-[4.25rem] border-l-2 border-gold-500 bg-paper-raised px-4 py-4 md:ml-[6.5rem] md:px-5" role="note">
      <p className="text-[17px] leading-snug">
        <span className="font-medium">These two overlap.</span> {earlier.title} runs until {earlier.endTime}, and {later.title} starts at {later.time}.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {oneTap ? (
          <ActionButton
            action={ctx.actions.move}
            fields={{ blockId: later.id, day: day.key, time: toTime(after), branchId: later.branchId }}
            className={buttonClass("secondary", "min-h-12")}
            pendingLabel="Moving…"
          >
            Move {later.title} to {toTime(after)}
          </ActionButton>
        ) : null}
        {target ? (
          <button type="button" onClick={() => ctx.openItem(target.id, true)} className={buttonClass("quiet")}>
            Choose another time
          </button>
        ) : (
          <ActionButton
            action={ctx.actions.ask}
            fields={{ tripId: ctx.trip.id, blockId: later.id, returnTo: ctx.back(day.key) }}
            className={buttonClass("quiet")}
            pendingLabel="Sending…"
          >
            Ask {ctx.contact} to look at this
          </ActionButton>
        )}
      </div>
    </li>
  );
}

// Ideas per day, kept for the visit so stepping back and forth doesn't ask again.
const ideasCache = new Map<string, Suggestion[]>();

/** Three photo ideas for an open day (each opens the add sheet with it chosen), plus the AI's "suggest" for all open days. */
function FreeDayIdeas({ ctx, day }: { ctx: DaysCtx; day: BuilderDay }) {
  const { trip, actions } = ctx;
  const cacheKey = `${trip.id}:${day.key}`;
  const [ideas, setIdeas] = useState<Suggestion[] | null>(ideasCache.get(cacheKey) ?? (actions.suggest ? null : []));
  const suggest = actions.suggest;

  useEffect(() => {
    if (!suggest || ideasCache.has(cacheKey)) return setIdeas(ideasCache.get(cacheKey) ?? []);
    let live = true;
    setIdeas(null);
    suggest(trip.id, day.key, "09:00")
      .then((r) => {
        ideasCache.set(cacheKey, r);
        if (live) setIdeas(r);
      })
      .catch(() => live && setIdeas([]));
    return () => {
      live = false;
    };
  }, [suggest, trip.id, day.key, cacheKey]);

  const items = (ideas ?? [])
    .map((s) => ({ s, c: ctx.byId.get(s.componentId) }))
    .filter((x): x is { s: Suggestion; c: LibraryComponent } => Boolean(x.c))
    .slice(0, 3);
  const photos = cardPhotos(items.map((x) => x.c));
  const open = trip.days.filter((d) => dayState(trip, d) === "free").length;

  return (
    <div className="mt-10">
      <p className="pk-label mb-4">Ideas for {weekday(day.key)}</p>
      {ideas === null ? (
        <ul aria-busy="true" aria-label="Finding ideas" className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="aspect-[3/2] bg-paper-line/50 motion-safe:animate-pulse" />
          ))}
        </ul>
      ) : items.length > 0 ? (
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 min-[390px]:-mx-5 min-[390px]:scroll-px-5 min-[390px]:px-5 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
          {items.map(({ s, c }, i) => (
            <li key={c.id} className="w-[78%] shrink-0 snap-start md:w-auto">
              <button type="button" onClick={() => ctx.openAdd(day.key, "09:00", c.id)} className="group block w-full text-left">
                <Photo
                  photo={photos[i]}
                  ratio="3/2"
                  sizes="(min-width: 768px) 260px, 78vw"
                  zoom
                  fallback={{ title: c.place.name }}
                />
                <span className="mt-3 block text-[19px] font-medium leading-snug group-hover:underline">{c.name}</span>
                <span className="mt-1 block text-[16px] text-mist-muted">
                  <ModuleDot moduleName={c.moduleName} className="text-mist-ink" /> · {[c.place.city, c.place.name].filter(Boolean).join(" · ")}
                </span>
                <span className="mt-1 block text-[16px] text-mist-muted">
                  {formatDuration(c.durationMinutes)} · {libraryPriceLine(c, trip.travellers)}
                </span>
                <span className="mt-2 block text-[16px] italic text-mist-muted">{s.reason}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pk-body text-mist-muted">Browse what we can arrange, or ask {ctx.contact} for a few ideas.</p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        {open > 0 && (
          <ActionButton action={actions.build} fields={{ tripId: trip.id }} className={buttonClass("secondary")} pendingLabel="Finding ideas…">
            Suggest ideas for my open days
          </ActionButton>
        )}
      </div>
      {open > 0 && (
        <p className="mt-3 max-w-[40rem] text-[16px] text-mist-muted">
          We place a few suggestions on your open days, around what is already planned. Keep the ones you like and remove the rest.
        </p>
      )}
    </div>
  );
}
