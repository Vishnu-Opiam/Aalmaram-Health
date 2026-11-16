"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { addClientBlockAction } from "@/app/trip/actions";
import { AppLink } from "@/components/ui/primitives";
import { Lightbox, ModuleDot, Photo, Tabular, buttonClass } from "@/components/portal/kit";
import { useUrlPanel } from "@/components/portal/sheet";
import { useActionRedirect } from "@/components/ui/form-status";
import { formatDuration } from "@/domain/vendors/profile";
import type { LibraryComponent } from "@/domain/trips/builder-view";
import { idleState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { AskForm, FormError, Submit } from "./ask";
import { InTrip } from "./cards";
import {
  PARTS,
  carryQuery,
  clash,
  dayLoad,
  firstFit,
  isRender,
  money,
  placeKind,
  returnHere,
  shortDate,
  toPhoto,
  tripPrice,
  type ExploreContext,
  type ExploreTrip,
} from "./model";

/**
 * An experience in full, as a panel kept in the URL (`?item=<id>`, so Back
 * closes it): a right-hand drawer on desktop, a sheet from the bottom on
 * phones. The price and the one action stay in a footer that never scrolls
 * away. "Add to my trip" turns the same panel into the day and time choice,
 * so the client never leaves Explore to add something.
 */
export function ExperiencePanel({
  item,
  context,
  onClose,
}: {
  item: LibraryComponent;
  context: ExploreContext;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;
  const { trip, choosing, coordinator } = context;
  const canAdd = Boolean(trip?.editable);
  const [mode, setMode] = useState<"details" | "add">("details");

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // The lightbox is a dialog inside this one: let it handle its own keys.
      if (ref.current?.querySelector("[role=dialog]")) return;
      if (e.key === "Escape") close.current();
      else if (e.key === "Tab" && ref.current) trapTab(e, ref.current);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  const search = useSearchParams();
  const placeHref = `/trip/explore/${item.place.slug}${carryQuery(search)}`;
  const days = context.inTrip.byComponent[item.id];
  const firstDayKey = days && trip ? trip.days[days[0] - 1]?.key : undefined;
  const priceLine = `${money(item.price, item.currency)} ${item.priceUnitLabel}`;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={onClose} className="portal-fade absolute inset-0 bg-night/50" />
      <div
        ref={ref}
        className={cn(
          "pk-paper relative ml-auto mt-auto flex h-[calc(100%-16px)] w-full flex-col overflow-hidden rounded-t-[20px] shadow-float",
          "md:mt-0 md:h-full md:max-w-[680px] md:rounded-none",
          "pk-sheet-up",
        )}
      >
        {mode === "details" ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <PanelPhotos item={item} onClose={onClose} />
              <div className="px-5 pb-10 pt-6 md:px-10 md:pt-8">
                <AppLink
                  href={placeHref}
                  className="inline-flex min-h-12 items-center text-[16px] font-medium text-mist-muted underline-offset-[5px] hover:text-mist-ink hover:underline"
                >
                  <ModuleDot moduleName={item.moduleName} label={`${item.place.name}${item.place.city ? ` · ${item.place.city}` : ""}`} />
                </AppLink>
                <h2 id={titleId} ref={headingRef} tabIndex={-1} className="pk-h2 mt-1 outline-none!">
                  {item.name}
                </h2>
                <InTrip days={days} className="mt-3" />
                {trip && !trip.editable && (
                  <p className="mt-3 text-[17px] text-mist-muted">Your days are confirmed, so {coordinator} adds anything new for you.</p>
                )}
                {!trip && <p className="mt-3 text-[17px] text-mist-muted">Your days appear here once your dates are agreed.</p>}

                <dl className="mt-6 grid grid-cols-2 border-y border-paper-line">
                  <div className="border-r border-paper-line py-4 pr-4">
                    <dt className="pk-label">How long</dt>
                    <dd className="mt-1 font-display text-[30px] leading-tight md:text-[36px]">{formatDuration(item.durationMinutes)}</dd>
                  </div>
                  <div className="py-4 pl-5">
                    <dt className="pk-label">Price</dt>
                    <dd className="mt-1 font-display text-[30px] leading-tight md:text-[36px]">{money(item.price, item.currency)}</dd>
                    <dd className="text-[16px] text-mist-muted">{item.priceUnitLabel}</dd>
                  </div>
                </dl>
                {tripPrice(item, trip?.travellers ?? null) && <p className="mt-3 text-[17px] text-mist-muted">{tripPrice(item, trip!.travellers)}</p>}

                <p className="pk-body mt-6">{item.description}</p>

                {item.whatsIncluded && (
                  <section className="mt-8">
                    <h3 className="pk-h3">What is included</h3>
                    <ul className="mt-3 space-y-2">
                      {item.whatsIncluded
                        .split(/\n+|;\s*/)
                        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
                        .filter(Boolean)
                        .map((line) => (
                          <li key={line} className="flex gap-3 text-[18px] leading-relaxed">
                            <span aria-hidden="true" className="mt-[0.8em] h-px w-4 shrink-0 bg-gold-500" />
                            {line}
                          </li>
                        ))}
                    </ul>
                  </section>
                )}
                {item.deliverable && (
                  <section className="mt-8">
                    <h3 className="pk-h3">You receive</h3>
                    <p className="mt-2 text-[18px] leading-relaxed">{item.deliverable}</p>
                  </section>
                )}
                <section className="mt-8">
                  <h3 className="pk-h3">Where</h3>
                  <p className="mt-2 text-[18px] leading-relaxed">
                    {item.branches.length > 1
                      ? `${item.branches.length} locations: ${item.branches.map((b) => b.label).join("; ")}`
                      : (item.branches[0]?.label ?? item.place.city ?? item.place.name)}
                  </p>
                </section>

                <section className="mt-8 border-t border-paper-line pt-6">
                  <h3 className="pk-h3">About {item.provider.name}</h3>
                  {item.provider.description && <p className="mt-2 text-[18px] leading-relaxed text-mist-muted">{item.provider.description}</p>}
                  {(item.provider.yearEstablished || item.provider.languages.length > 0) && (
                    <p className="mt-2 text-[16px] text-mist-muted">
                      {[item.provider.yearEstablished && `Since ${item.provider.yearEstablished}`, item.provider.languages.length > 0 && `Speaks ${item.provider.languages.join(", ")}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <AppLink
                    href={placeHref}
                    className={buttonClass("quiet", "mt-2")}
                  >
                    See the place and its photos
                  </AppLink>
                </section>
              </div>
            </div>

            <footer className="flex-none border-t border-paper-line bg-paper-raised px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 md:px-10 md:pb-5 md:pt-4">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <p className="min-w-0 leading-tight">
                  <span className="block font-display text-[28px]">{money(item.price, item.currency)}</span>
                  <span className="text-[16px] text-mist-muted">
                    {item.priceUnitLabel} · {formatDuration(item.durationMinutes)}
                  </span>
                </p>
                {canAdd ? (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {firstDayKey && (
                      <AppLink href={`/trip/itinerary?trip=${encodeURIComponent(trip!.id)}&day=${firstDayKey}`} className={buttonClass("quiet")}>
                        See Day {days![0]}
                      </AppLink>
                    )}
                    <button type="button" onClick={() => setMode("add")} className={buttonClass("primary")}>
                      {choosing ? `Add to Day ${trip!.days.find((d) => d.key === choosing.dayKey)?.dayNumber}` : days ? "Add another time" : "Add to my trip"}
                    </button>
                  </div>
                ) : trip ? (
                  <AskForm tripId={trip.id} componentId={item.id}>
                    Ask {coordinator} to add this
                  </AskForm>
                ) : (
                  <AppLink href={`/trip/chat?about=${encodeURIComponent(item.name)}`} className={buttonClass("primary")}>
                    Ask us about this
                  </AppLink>
                )}
              </div>
            </footer>
          </>
        ) : (
          <AddForm item={item} trip={trip!} context={context} priceLine={priceLine} onBack={() => setMode("details")} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function trapTab(e: KeyboardEvent, root: HTMLElement) {
  const all = [...root.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([type=hidden]):not([disabled]), select, [tabindex='0']")].filter(
    (el) => el.getClientRects().length > 0 && el.tabIndex >= 0,
  );
  const first = all[0];
  const last = all[all.length - 1];
  const active = document.activeElement;
  const wrapTo = e.shiftKey ? (active === first || !root.contains(active) ? last : null) : active === last ? first : null;
  if (wrapTo) {
    e.preventDefault();
    wrapTo.focus();
  }
}

/** The place's photographs as the panel's header: one 3:2 photo, the rest in the lightbox. */
function PanelPhotos({ item, onClose }: { item: LibraryComponent; onClose: () => void }) {
  const photos = item.place.photos.map(toPhoto);
  const [open, setOpen, closePhoto] = useUrlPanel("pphoto");
  const lead = item.place.photos.findIndex((p) => !isRender(p));
  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className="inline-flex min-h-12 items-center gap-2 rounded-full bg-night/70 px-4 text-[17px] font-medium text-night-ink hover:bg-night"
    >
      <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /> Close
    </button>
  );
  if (lead < 0) {
    return (
      <div className="pk-night relative flex min-h-[132px] items-end justify-between gap-4 px-5 pb-5 pt-16 md:px-10">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gold-500" />
        <ModuleDot moduleName={item.moduleName} label={item.place.name} className="text-[17px] text-night-muted" />
        <div className="absolute right-4 top-4">{closeButton}</div>
      </div>
    );
  }
  const index = open === null ? null : Math.min(Math.max(Number(open) || 0, 0), photos.length - 1);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(String(lead))} className="block w-full" aria-label={`Open the photos of ${item.place.name}`}>
        <Photo photo={photos[lead]} ratio="3/2" sizes="(min-width: 768px) 680px, 100vw" scrim="top" />
      </button>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        {photos.length > 1 ? (
          <button
            type="button"
            onClick={() => setOpen(String(lead))}
            className="pointer-events-auto inline-flex min-h-12 items-center rounded-full bg-night/70 px-4 text-[16px] font-medium text-night-ink hover:bg-night"
          >
            See all {photos.length} photos
          </button>
        ) : (
          <span />
        )}
        <span className="pointer-events-auto">{closeButton}</span>
      </div>
      {index !== null && (
        <Lightbox photos={photos} index={index} onIndex={(i) => setOpen(String(i))} onClose={closePhoto} label={`Photos of ${item.place.name}`} />
      )}
    </div>
  );
}

/**
 * Which day, what time, which location: in place, with what is already on
 * each day. A day or time that doesn't fit says why in plain words and can't
 * be sent. Comes back to this page (`returnTo`) with a toast, or to the day
 * on Day by day when the client came from there.
 */
function AddForm({
  item,
  trip,
  context,
  priceLine,
  onBack,
  onClose,
}: {
  item: LibraryComponent;
  trip: ExploreTrip;
  context: ExploreContext;
  priceLine: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const [state, action] = useActionState(addClientBlockAction, idleState);
  useActionRedirect(state);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { choosing } = context;

  const initialDay = Math.max(
    0,
    choosing
      ? trip.days.findIndex((d) => d.key === choosing.dayKey)
      : // A free day first, so a new thing doesn't crowd a full one; else the first day it fits.
        [trip.days.findIndex((d, i) => d.blocks.length === 0 && dayLoad(d, trip) === "Free" && firstFit(trip, i, item.durationMinutes) !== null)]
          .concat(trip.days.findIndex((_, i) => firstFit(trip, i, item.durationMinutes) !== null))
          .find((i) => i >= 0) ?? 0,
  );
  const [dayIndex, setDayIndex] = useState(initialDay);
  const [time, setTime] = useState(() => firstFit(trip, initialDay, item.durationMinutes, choosing?.slot) ?? choosing?.slot ?? "09:00");
  const [branchId, setBranchId] = useState(item.branches.length === 1 ? item.branches[0].id : "");
  const day = trip.days[dayIndex];
  const problem = clash(trip, dayIndex, time, item.durationMinutes);
  const needsBranch = item.branches.length > 1 && !branchId;

  useEffect(() => headingRef.current?.focus(), []);

  const pickDay = (i: number) => {
    setDayIndex(i);
    // Keep the chosen time if it still fits on the new day, else the first that does.
    if (clash(trip, i, time, item.durationMinutes)) setTime(firstFit(trip, i, item.durationMinutes, choosing?.slot) ?? time);
  };

  const back = choosing
    ? `/trip/itinerary?trip=${encodeURIComponent(trip.id)}&day=${day.key}`
    : typeof window === "undefined"
      ? ""
      : returnHere();

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="tripId" value={trip.id} />
      <input type="hidden" name="componentId" value={item.id} />
      <input type="hidden" name="day" value={day.key} />
      <input type="hidden" name="time" value={time} />
      {item.branches.length > 1 && <input type="hidden" name="branchId" value={branchId} />}
      <input type="hidden" name="returnTo" value={back} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4 md:px-10 md:pt-6">
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={onBack} className={buttonClass("quiet", "gap-2 no-underline hover:underline")}>
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /> Back to details
          </button>
          <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center gap-2 rounded-full px-3 text-[17px] font-medium hover:bg-paper-line/50">
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /> Close
          </button>
        </div>
        <p className="mt-4 text-[16px] font-medium text-mist-muted">{item.name}</p>
        <h2 ref={headingRef} tabIndex={-1} className="pk-h2 mt-1 outline-none!">
          Which day?
        </h2>
        {context.tripCount > 1 && <p className="mt-2 text-[17px] text-mist-muted">Adding to {trip.name}</p>}

        <div role="group" aria-label="Day" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {trip.days.map((d, i) => {
            const fits = firstFit(trip, i, item.durationMinutes) !== null;
            const on = i === dayIndex;
            return (
              <button
                key={d.key}
                type="button"
                aria-pressed={on}
                onClick={() => pickDay(i)}
                className={cn(
                  "flex min-h-[72px] flex-col items-start justify-center rounded-[6px] border-2 px-3.5 py-2 text-left transition-colors",
                  on ? "border-mist-ink bg-night text-night-ink" : "border-paper-line bg-paper-raised hover:border-mist-ink",
                )}
              >
                <span className="text-[17px] font-medium leading-tight">
                  Day {d.dayNumber} <span className={on ? "text-night-muted" : "text-mist-muted"}>· {shortDate(d.key)}</span>
                </span>
                <span className={cn("mt-1 line-clamp-1 text-[15px] leading-snug", on ? "text-night-muted" : "text-mist-muted")}>
                  {fits ? dayLoad(d, trip) : "No room that day"}
                </span>
              </button>
            );
          })}
        </div>

        {day.blocks.length > 0 && (
          <div className="mt-5 border-l-2 border-gold-500 pl-4">
            <p className="text-[16px] font-medium text-mist-muted">Already on Day {day.dayNumber}</p>
            <ul className="mt-1 space-y-1">
              {day.blocks.map((b) => (
                <li key={b.id} className="text-[17px]">
                  <span className="font-medium">
                    <Tabular>{b.time}</Tabular>–<Tabular>{b.endTime}</Tabular>
                  </span>{" "}
                  {b.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.durationMinutes < 1440 && (
          <fieldset className="mt-8">
            <legend className="pk-h3">What time?</legend>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {PARTS.map((part) => {
                const busy = clash(trip, dayIndex, part.time, item.durationMinutes);
                return (
                  <button
                    key={part.time}
                    type="button"
                    aria-pressed={time === part.time}
                    onClick={() => setTime(part.time)}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center rounded-[6px] border-2 px-2 text-[17px] font-medium leading-tight transition-colors",
                      time === part.time ? "border-mist-ink bg-night text-night-ink" : "border-paper-line bg-paper-raised hover:border-mist-ink",
                    )}
                  >
                    {part.label}
                    <span className={cn("text-[15px] font-normal", time === part.time ? "text-night-muted" : "text-mist-muted")}>
                      {busy ? "Taken" : part.time}
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="mt-4 flex flex-wrap items-center gap-3 text-[17px]">
              Or another time
              <input
                type="time"
                step={900}
                value={time}
                onChange={(e) => e.target.value && setTime(e.target.value)}
                className="h-14 rounded-[6px] border-2 border-paper-line bg-paper-raised px-4 text-[18px] text-mist-ink focus:border-mist-ink"
              />
            </label>
          </fieldset>
        )}

        {item.branches.length > 1 && (
          <fieldset className="mt-8">
            <legend className="pk-h3">Which location?</legend>
            <p className="mt-1 text-[16px] text-mist-muted">Choose the one nearest to where you are staying.</p>
            <div className="mt-3 space-y-2">
              {item.branches.map((b) => (
                <label
                  key={b.id}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-[6px] border-2 px-4 text-[17px]",
                    branchId === b.id ? "border-mist-ink bg-paper-raised" : "border-paper-line",
                  )}
                >
                  <input type="radio" name="branchChoice" value={b.id} checked={branchId === b.id} onChange={() => setBranchId(b.id)} className="h-5 w-5 accent-[#11181b]" />
                  {b.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <footer className="flex-none border-t border-paper-line bg-paper-raised px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 md:px-10 md:pb-5 md:pt-4">
        <div aria-live="polite">
          <FormError message={state.status === "error" ? (state.fieldErrors?.day?.[0] ?? state.message) : null} />
          {problem && <p className="text-[17px] font-medium leading-snug text-danger-600">{problem}</p>}
          {!problem && needsBranch && <p className="text-[17px] text-mist-muted">Choose a location first.</p>}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="min-w-0 text-[16px] leading-snug text-mist-muted">
            <span className="block text-[17px] font-medium text-mist-ink">
              Day {day.dayNumber} · {shortDate(day.key)}
              {item.durationMinutes < 1440 && ` · ${time}`}
            </span>
            {priceLine} · not booked until you confirm
          </p>
          <Submit pendingLabel="Adding…" disabled={Boolean(problem) || needsBranch} className="max-md:w-full">
            Add to Day {day.dayNumber}
          </Submit>
        </div>
      </footer>
    </form>
  );
}
