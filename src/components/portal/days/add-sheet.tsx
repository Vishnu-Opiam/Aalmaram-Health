"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { buttonClass } from "@/components/portal/kit/button";
import { Chip } from "@/components/portal/kit/controls";
import { ModuleDot, kindOf, type Kind } from "@/components/portal/kit/module";
import { Photo } from "@/components/portal/kit/photo";
import { Tabular } from "@/components/portal/kit/tabular";
import { useActionRedirect } from "@/components/ui/form-status";
import { AppLink } from "@/components/ui/primitives";
import { formatDuration } from "@/domain/vendors/profile";
import type { BuilderDay, LibraryComponent } from "@/domain/trips/builder-view";
import { idleState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { Sheet } from "../sheet";
import { cardPhotos, euros, fits, freeUntil, kindOrder, libraryPriceLine, longDay, toSource, toTime, tripPrice, weekday, DAY_END } from "./plan";
import type { DaysCtx } from "./types";
import { WhenPicker } from "./when-picker";

const KINDS: Kind[] = ["health", "wellness", "culture"];

/**
 * Add to a day in three taps: the slot's ideas (only what fits the free
 * time, with search and a module filter) → pick → "Add to Monday". The day
 * as it stands is shown at the top, so nothing is chosen blind.
 */
export function AddSheet({
  ctx,
  day,
  at,
  preselect,
  onClose,
}: {
  ctx: DaysCtx;
  day: BuilderDay;
  /** Start of the free slot that was tapped ("14:00"). */
  at: string;
  preselect: string | null;
  onClose: () => void;
}) {
  const { trip } = ctx;
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | null>(null);
  const [showLonger, setShowLonger] = useState(false);
  const [chosen, setChosen] = useState<LibraryComponent | null>(preselect ? (ctx.byId.get(preselect) ?? null) : null);
  const [time, setTime] = useState(at);
  const until = freeUntil(day.blocks, at);
  const inTrip = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const d of trip.days) for (const b of d.blocks) map.set(b.componentId, [...(map.get(b.componentId) ?? []), d.dayNumber]);
    return map;
  }, [trip]);

  const all = useMemo(() => [...ctx.byId.values()], [ctx.byId]);
  const q = query.trim().toLowerCase();
  const matching = all.filter(
    (c) =>
      (!kind || kindOf(c.moduleName) === kind) &&
      (!q || [c.name, c.place.name, c.place.city, c.description, ...c.tags].some((t) => t?.toLowerCase().includes(q))),
  );
  // What suits the hour first (dinner in the evening, check-ups in the morning), then what isn't in the trip yet.
  const order = kindOrder(at);
  const rank = (c: LibraryComponent) => order.indexOf(kindOf(c.moduleName)) * 2 + (inTrip.has(c.id) ? 1 : 0);
  const fitting = matching.filter((c) => fits(trip, day.key, at, c)).sort((a, z) => rank(a) - rank(z));
  const longer = matching.filter((c) => !fits(trip, day.key, at, c));
  const heading = `Add to ${weekday(day.key)}`;

  return (
    <Sheet
      label={`${heading}, Day ${day.dayNumber}`}
      onClose={onClose}
      footer={chosen ? <AddFooter ctx={ctx} day={day} item={chosen} time={time} /> : undefined}
    >
      <div role="region" aria-label="Add to this day">
        <p className="pk-label">
          Day {day.dayNumber} · {longDay(day.key)}
        </p>
        <h2 className="pk-h2 mt-2">{heading}</h2>
        <DayAtAGlance day={day} at={at} until={until} />

        {chosen ? (
          <Chosen ctx={ctx} day={day} at={at} time={time} onTime={setTime} item={chosen} onBack={() => setChosen(null)} />
        ) : (
          <div className="mt-8">
            <label className="relative block">
              <span className="sr-only">Search what we can arrange</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mist-muted" strokeWidth={1.75} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Massage, boat, temple, dinner…"
                className="h-14 w-full rounded-full border-2 border-paper-line bg-paper-raised pl-12 pr-5 text-[18px] placeholder:text-mist-muted focus:border-mist-ink"
              />
            </label>
            <div role="group" aria-label="Show" className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
              <Chip pressed={kind === null} onClick={() => setKind(null)}>
                Everything
              </Chip>
              {KINDS.map((k) => (
                <Chip key={k} pressed={kind === k} kind={k} onClick={() => setKind(kind === k ? null : k)} />
              ))}
            </div>

            <p className="pk-label mt-8" aria-live="polite">
              {fitting.length === 0
                ? q || kind
                  ? "Nothing that fits this time matches."
                  : "Nothing fits this time."
                : until >= DAY_END
                  ? `${fitting.length} that fit from ${at}`
                  : `${fitting.length} that fit between ${at} and ${toTime(until)}`}
            </p>
            <IdeaList ctx={ctx} items={fitting} inTrip={inTrip} onPick={setChosen} />

            {longer.length > 0 && (
              <div className="mt-8 border-t border-paper-line pt-6">
                <button type="button" aria-expanded={showLonger} onClick={() => setShowLonger((v) => !v)} className={buttonClass("quiet")}>
                  {showLonger ? "Hide" : "Show"} {longer.length} that need more time
                </button>
                {showLonger && <IdeaList ctx={ctx} items={longer} inTrip={inTrip} onPick={setChosen} longer />}
              </div>
            )}

            <div className="mt-10 border-t border-paper-line pt-6">
              <p className="text-[17px] text-mist-muted">Looking for something else?</p>
              <div className="mt-2 flex flex-wrap gap-x-6">
                <AppLink href={ctx.explore(day.key, at)} className={buttonClass("quiet")}>
                  Browse everything in Explore
                </AppLink>
                <AppLink href={`/trip/chat?trip=${encodeURIComponent(trip.id)}`} className={buttonClass("quiet")}>
                  Ask {ctx.contact}
                </AppLink>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** The day as it stands, with the tapped slot marked: no choosing blind. */
function DayAtAGlance({ day, at, until }: { day: BuilderDay; at: string; until: number }) {
  if (day.blocks.length === 0)
    return <p className="mt-3 text-[17px] text-mist-muted">Nothing else on this day yet{at ? `. Starting from ${at}` : ""}.</p>;
  const rows = [
    ...day.blocks.map((b) => ({ key: b.id, time: b.time, text: b.title, slot: false })),
    { key: "slot", time: at, text: until >= DAY_END ? "Free from here" : `Free until ${toTime(until)}`, slot: true },
  ].sort((a, z) => a.time.localeCompare(z.time) || (a.slot ? 1 : -1));
  return (
    <ol aria-label="Already on this day" className="mt-5 border-l border-gold-500 pl-4">
      {rows.map((r) => (
        <li key={r.key} className={cn("flex gap-4 py-1 text-[17px] leading-snug", r.slot ? "font-medium text-gold-700" : "text-mist-muted")}>
          <span className="w-14 shrink-0">
            <Tabular>{r.time}</Tabular>
          </span>
          <span>{r.slot ? `← ${r.text}` : r.text}</span>
        </li>
      ))}
    </ol>
  );
}

function IdeaList({
  ctx,
  items,
  inTrip,
  onPick,
  longer,
}: {
  ctx: DaysCtx;
  items: LibraryComponent[];
  inTrip: Map<string, number[]>;
  onPick: (c: LibraryComponent) => void;
  longer?: boolean;
}) {
  const photos = cardPhotos(items);
  return (
    <ul className="mt-4 grid gap-x-5 gap-y-7 min-[480px]:grid-cols-2">
      {items.map((c, i) => {
        const days = inTrip.get(c.id);
        return (
          <li key={c.id}>
            <button type="button" onClick={() => onPick(c)} className={cn("group flex w-full flex-col text-left", longer && "opacity-80")}>
              <span className="block text-[19px] font-medium leading-snug group-hover:underline">{c.name}</span>
              <Photo
                photo={photos[i]}
                ratio="3/2"
                sizes="(min-width: 768px) 290px, 90vw"
                zoom
                fallback={{ title: c.place.name, kind: kindOf(c.moduleName) }}
                className="order-first mb-3 [&_p]:text-[22px]"
              />
              <span className="mt-1 block text-[16px] text-mist-muted">
                <ModuleDot moduleName={c.moduleName} className="text-mist-ink" /> · {[c.place.city, c.place.name].filter(Boolean).join(" · ")}
              </span>
              <span className="mt-1 block text-[16px] text-mist-muted">
                {formatDuration(c.durationMinutes)} · {libraryPriceLine(c, ctx.trip.travellers)}
              </span>
              {days && <span className="mt-1.5 block text-[16px] font-medium text-gold-700">In your trip · Day {days.join(", ")}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The chosen experience: photo, what it is, when, where. "Add" sits in the sheet's footer. */
function Chosen({
  ctx,
  day,
  at,
  time,
  onTime,
  item,
  onBack,
}: {
  ctx: DaysCtx;
  day: BuilderDay;
  at: string;
  time: string;
  onTime: (t: string) => void;
  item: LibraryComponent;
  onBack: () => void;
}) {
  const lead = item.place.photos[0];
  // The fields here belong to the form in the sheet's footer (form="add-submit"), so "Add" never scrolls away.
  return (
    <div className="mt-6">
      <button type="button" onClick={onBack} className={buttonClass("secondary", "min-h-12 pl-3 pr-5")}>
        <ChevronLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /> Back to ideas
      </button>
      <div className="mt-6">
        <Photo
          photo={lead ? toSource(lead) : null}
          ratio="16/9"
          sizes="(min-width: 768px) 600px, 100vw"
          fallback={{ title: item.place.name, kind: kindOf(item.moduleName) }}
          className="-mx-5 md:mx-0"
        />
        <p className="pk-h3 mt-5">{item.name}</p>
        <p className="mt-1 text-[17px] text-mist-muted">
          <ModuleDot moduleName={item.moduleName} className="text-mist-ink" /> ·{" "}
          <AppLink href={`/trip/explore/${item.place.slug}`} className="underline decoration-mist-ink/35 underline-offset-4 hover:decoration-mist-ink">
            {item.place.name}
          </AppLink>
          {item.place.city ? ` · ${item.place.city}` : ""}
        </p>
        <p className="mt-1 text-[17px] text-mist-muted">
          {formatDuration(item.durationMinutes)} · {libraryPriceLine(item, ctx.trip.travellers)}
        </p>
        <p className="pk-body mt-4 line-clamp-4">{item.description}</p>
      </div>
      <div className="mt-8 space-y-8">
        <WhenPicker trip={ctx.trip} dayKey={day.key} time={time} onTime={onTime} item={item} slot={at} form="add-submit" />
        {item.branches.length > 1 ? (
          <fieldset>
            <legend className="text-[19px] font-medium">Where?</legend>
            <p className="mt-1 text-[16px] text-mist-muted">Choose the one nearest to where you are staying.</p>
            <div className="mt-3 space-y-2">
              {item.branches.map((b, i) => (
                <label key={b.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[6px] border-2 border-paper-line bg-paper-raised px-4 has-checked:border-mist-ink">
                  <input type="radio" name="branchId" value={b.id} defaultChecked={i === 0} required className="h-5 w-5 accent-mist-ink" form="add-submit" />
                  <span className="text-[17px]">{b.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>
      <p className="mt-6 text-[16px] text-mist-muted">Nothing is booked until you confirm your trip.</p>
    </div>
  );
}

/** Price for this trip and "Add to Monday", always in view. */
function AddFooter({ ctx, day, item, time }: { ctx: DaysCtx; day: BuilderDay; item: LibraryComponent; time: string }) {
  const [state, dispatch, pending] = useActionState(ctx.actions.add, idleState);
  useActionRedirect(state);
  return (
    <form id="add-submit" action={dispatch} aria-label={`Add ${item.name} to Day ${day.dayNumber} at ${time}`}>
      <input type="hidden" name="tripId" value={ctx.trip.id} />
      <input type="hidden" name="componentId" value={item.id} />
      <input type="hidden" name="day" value={day.key} />
      <input type="hidden" name="returnTo" value={ctx.back(day.key)} />
      {item.branches.length === 1 && <input type="hidden" name="branchId" value={item.branches[0].id} />}
      {state.status === "error" && state.message && (
        <p role="alert" className="mb-2 text-[16px] text-danger-600">
          {state.message}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 leading-tight">
          <span className="pk-numeral block text-[30px]">{euros(tripPrice(item, ctx.trip.travellers), item.currency)}</span>
          <span className="mt-1 block text-[15px] text-mist-muted">{ctx.trip.travellers > 1 ? `for ${ctx.trip.travellers} travellers` : "for you"}</span>
        </p>
        <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary", "px-6")}>
          {pending ? "Adding…" : `Add to ${weekday(day.key)}`}
        </button>
      </div>
    </form>
  );
}
