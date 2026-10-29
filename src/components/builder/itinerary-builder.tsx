"use client";

import { startTransition, useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Clock, GripVertical, Lock, MapPin, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Badge, Button, Select } from "@/components/ui/primitives";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { formatMoney } from "@/domain/itineraries/pricing";
import { formatDuration } from "@/domain/vendors/profile";
import { BOOKING_TRANSITIONS, bookingStatusLabel } from "@/domain/bookings/status";
import { formatLongDate, parseDateInput } from "@/domain/shared/dates";
import type { BuilderBlock, BuilderDay, BuilderTrip, Library } from "@/domain/trips/builder-view";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { AddPanel, type SuggestFn } from "./add-panel";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export type BuilderActions = { add: Action; move: Action; remove: Action; suggest?: SuggestFn; setBooking?: Action };

/**
 * The itinerary builder: a day-by-day timeline with "+" between blocks and
 * drag to move (Nivedith's "plus button between two events", in a form 50+
 * users can manage). Every drag has a keyboard/click alternative ("Change
 * time"), and nothing is hidden behind hover.
 *
 * Shared by staff (`variant="staff"`, dense) and the client portal
 * (`variant="client"`, large type and targets). Which blocks may change is
 * decided on the server and arrives as `block.canEdit`.
 */
export function ItineraryBuilder({
  trip,
  library,
  actions,
  variant,
}: {
  trip: BuilderTrip;
  library: Library;
  actions: BuilderActions;
  variant: "staff" | "client";
}) {
  const big = variant === "client";
  const [moveState, moveDispatch, movePending] = useActionState(actions.move, idleState);
  useActionRedirect(moveState);
  const [dragging, setDragging] = useState<BuilderBlock | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);

  function dropOn(day: string) {
    const block = dragging;
    setDragging(null);
    setDropDay(null);
    if (!block || block.day === day) return;
    const fd = new FormData();
    fd.set("blockId", block.id);
    fd.set("day", day);
    fd.set("time", block.time);
    if (block.branchId) fd.set("branchId", block.branchId);
    startTransition(() => moveDispatch(fd));
  }

  return (
    <div className={cn("space-y-6", big && "text-[17px]")}>
      <Summary trip={trip} big={big} />

      {moveState.status === "error" && <FormFeedback state={moveState} />}
      {movePending && (
        <p role="status" className="text-sm text-ink-500">
          Moving…
        </p>
      )}

      {trip.editable && (
        <p className={cn("text-ink-500", big ? "text-[15px]" : "text-xs")}>
          {big
            ? "Press + to add something to a day. You can drag your own activities to another day, or use “Change time”."
            : "Drag a block onto another day, or use “Change time”. Blocks the team adds are the client's health core."}
        </p>
      )}

      <ol className="space-y-6">
        {trip.days.map((day) => (
          <li
            key={day.key}
            id={`day-${day.key}`}
            className="scroll-mt-24"
            onDragOver={(event) => {
              if (!dragging) return;
              event.preventDefault();
              setDropDay(day.key);
            }}
            onDragLeave={() => setDropDay((current) => (current === day.key ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              dropOn(day.key);
            }}
          >
            <DaySection
              day={day}
              trip={trip}
              library={library}
              actions={actions}
              big={big}
              isDropTarget={dropDay === day.key && dragging?.day !== day.key}
              onDragStart={setDragging}
              onDragEnd={() => {
                setDragging(null);
                setDropDay(null);
              }}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Summary({ trip, big }: { trip: BuilderTrip; big: boolean }) {
  return (
    <div
      className={cn(
        "z-10 rounded-lg border border-sand-200 bg-white/95 shadow-sm backdrop-blur sm:sticky sm:top-0",
        big ? "p-5" : "p-4",
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={cn("uppercase tracking-[0.12em] text-ink-400", big ? "text-xs" : "text-[11px]")}>
            Trip total
          </p>
          <p
            className={cn("font-semibold tabular-nums text-ink-900", big ? "text-3xl" : "text-2xl")}
            aria-live="polite"
          >
            {formatMoney(trip.total, trip.currency)}
          </p>
          <p className={cn("text-ink-500", big ? "text-[15px]" : "text-xs")}>
            {trip.blockCount} {trip.blockCount === 1 ? "activity" : "activities"} · {trip.travellers}{" "}
            {trip.travellers === 1 ? "traveller" : "travellers"}
            {trip.mixedCurrencies && " · mixed currencies, total is indicative"}
          </p>
        </div>
        {trip.mix.length > 0 && (
          <dl className="grid min-w-[220px] gap-1.5" aria-label="Health, wellness and culture mix">
            {trip.mix.map((row) => (
              <div key={row.moduleName} className="grid grid-cols-[110px_1fr_auto] items-center gap-2 text-xs">
                <dt className="truncate text-ink-600">{row.moduleName}</dt>
                <dd className="relative h-2 rounded-full bg-sand-100">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-teal-500"
                    style={{ width: `${row.actual}%` }}
                  />
                  {row.target !== null && (
                    <span
                      className="absolute -top-0.5 h-3 w-0.5 bg-brass-500"
                      style={{ left: `${row.target}%` }}
                      title={`Target ${row.target}%`}
                    />
                  )}
                </dd>
                <dd className="tabular-nums text-ink-500">
                  {row.actual}%{row.target !== null && <span className="text-ink-400"> / {row.target}%</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {!trip.editable && (
        <p className={cn("mt-3 flex items-center gap-2 text-ink-600", big ? "text-[15px]" : "text-xs")}>
          <Lock className="h-4 w-4 text-brass-500" aria-hidden="true" />
          Confirmed and locked. Changes now go through the relationship manager.
        </p>
      )}
    </div>
  );
}

function DaySection({
  day,
  trip,
  library,
  actions,
  big,
  isDropTarget,
  onDragStart,
  onDragEnd,
}: {
  day: BuilderDay;
  trip: BuilderTrip;
  library: Library;
  actions: BuilderActions;
  big: boolean;
  isDropTarget: boolean;
  onDragStart: (block: BuilderBlock) => void;
  onDragEnd: () => void;
}) {
  // Which "+" slot is open: the index of the block it follows (-1 = start of day).
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const dayTotal = day.blocks.reduce((sum, b) => sum + Number(b.price), 0);

  const slot = (afterIndex: number) => {
    const previous = day.blocks[afterIndex];
    const defaultTime = previous ? nextHalfHour(previous.endTime) : "09:00";
    if (!trip.editable) return null;
    return openSlot === afterIndex ? (
      <AddPanel
        tripId={trip.id}
        day={day.key}
        defaultTime={defaultTime}
        library={library}
        action={actions.add}
        suggest={actions.suggest}
        big={big}
        onClose={() => setOpenSlot(null)}
      />
    ) : (
      <button
        type="button"
        onClick={() => setOpenSlot(afterIndex)}
        className={cn(
          "group flex w-full items-center gap-3 text-teal-600 hover:text-teal-700",
          big ? "py-2 text-[15px]" : "py-1 text-xs",
        )}
        aria-label={`Add something on day ${day.dayNumber}${previous ? ` after ${previous.title}` : ""}`}
      >
        <span className="h-px flex-1 bg-sand-200 group-hover:bg-teal-200" />
        <span
          className={cn(
            "flex items-center justify-center rounded-full border border-teal-200 bg-white",
            big ? "h-10 w-10" : "h-6 w-6",
          )}
        >
          <Plus className={big ? "h-5 w-5" : "h-3.5 w-3.5"} aria-hidden="true" />
        </span>
        <span className="h-px flex-1 bg-sand-200 group-hover:bg-teal-200" />
      </button>
    );
  };

  return (
    <section
      aria-labelledby={`day-${day.key}-heading`}
      className={cn(
        "rounded-lg border bg-white transition-colors",
        isDropTarget ? "border-teal-500 bg-teal-50" : "border-sand-200",
        big ? "p-5" : "p-4",
      )}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-sand-200 pb-2">
        <h3 id={`day-${day.key}-heading`} className={cn("text-ink-900", big ? "font-serif text-xl" : "text-sm font-semibold")}>
          <span className="text-brass-500">Day {day.dayNumber}</span> · {formatLongDate(parseDateInput(day.key))}
        </h3>
        {day.blocks.length > 0 && (
          <span className={cn("tabular-nums text-ink-500", big ? "text-[15px]" : "text-xs")}>
            {formatMoney(dayTotal, trip.currency)}
          </span>
        )}
      </header>

      {day.blocks.length === 0 && !trip.editable && (
        <p className={cn("py-4 text-ink-400", big ? "text-[15px]" : "text-xs")}>Free day.</p>
      )}
      {day.blocks.length === 0 && trip.editable && (
        <p className={cn("pt-3 text-ink-400", big ? "text-[15px]" : "text-xs")}>
          Nothing planned yet{isDropTarget ? " — drop here to move it to this day." : "."}
        </p>
      )}

      <div className="mt-2">
        {slot(-1)}
        {day.blocks.map((block, index) => (
          <div key={block.id}>
            <BlockCard
              block={block}
              trip={trip}
              actions={actions}
              big={big}
              onDragStart={() => onDragStart(block)}
              onDragEnd={onDragEnd}
            />
            {slot(index)}
          </div>
        ))}
      </div>
    </section>
  );
}

function BlockCard({
  block,
  trip,
  actions,
  big,
  onDragStart,
  onDragEnd,
}: {
  block: BuilderBlock;
  trip: BuilderTrip;
  actions: BuilderActions;
  big: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);

  return (
    <article
      draggable={block.canEdit}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", block.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-md border bg-white",
        block.addedBy === "TEAM" ? "border-teal-200 bg-teal-50/40" : "border-sand-200",
        block.addedBy === "AI" && "border-dashed border-info-200",
        block.canEdit && "cursor-grab active:cursor-grabbing",
        big ? "p-4" : "p-3",
      )}
      aria-label={`${block.time} to ${block.endTime}: ${block.title}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
        {block.canEdit && (
          // Touch screens can't drag; "Change time" is the way there.
          <GripVertical className="mt-1 hidden h-4 w-4 shrink-0 text-ink-400 sm:block" aria-hidden="true" />
        )}
        <div className={cn("shrink-0 tabular-nums text-ink-600", big ? "text-[15px] sm:w-24" : "text-xs sm:w-20")}>
          <span className="font-semibold text-ink-900">{block.time}</span>
          <span className="sm:block"> – {block.endTime}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4 className={cn("text-ink-900", big ? "font-serif text-[19px] leading-snug" : "text-sm font-medium")}>
              {block.title}
            </h4>
            <span className={cn("tabular-nums text-ink-800", big ? "text-[16px]" : "text-sm")}>
              {formatMoney(block.price, block.currency)}
            </span>
          </div>
          <p className={cn("mt-0.5 text-ink-500", big ? "text-[14px]" : "text-xs")}>
            {block.moduleName} · {block.provider.name}
            {block.branchLabel && (
              <>
                {" "}
                · <MapPin className="inline h-3 w-3" aria-hidden="true" /> {block.branchLabel}
              </>
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {block.addedBy === "TEAM" && <Badge tone="accent">{big ? "Health core · arranged by your team" : "Health core"}</Badge>}
            {block.addedBy === "AI" && <Badge tone="info">Suggested</Badge>}
            {block.overlaps && (
              <Badge tone="warning">
                <TriangleAlert className="h-3 w-3" aria-hidden="true" /> Overlaps another activity
              </Badge>
            )}
            <span className={cn("text-ink-400", big ? "text-[13px]" : "text-[11px]")}>
              <Clock className="mr-1 inline h-3 w-3" aria-hidden="true" />
              {formatDuration(block.durationMinutes)} · {block.priceUnitLabel}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size={big ? "md" : "sm"}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
              Details
            </Button>
            {block.canEdit && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size={big ? "md" : "sm"}
                  onClick={() => setChanging((v) => !v)}
                  aria-expanded={changing}
                >
                  <Clock className="h-4 w-4" aria-hidden="true" /> Change time
                </Button>
                <RemoveButton blockId={block.id} title={block.title} action={actions.remove} big={big} />
              </>
            )}
          </div>

          {!trip.editable && actions.setBooking && block.bookingStatus && (
            <BookingControl block={block} action={actions.setBooking} />
          )}
          {changing && <ChangeForm block={block} trip={trip} action={actions.move} big={big} />}
          {open && <BlockDetails block={block} big={big} />}
        </div>
      </div>
    </article>
  );
}

export function BlockDetails({ block, big }: { block: BuilderBlock; big: boolean }) {
  const text = big ? "text-[15px]" : "text-[13px]";
  return (
    <div className={cn("mt-3 space-y-3 rounded-md bg-sand-50 p-4 leading-relaxed text-ink-700", text)}>
      <p>{block.description}</p>
      {block.whatsIncluded && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">What is included</p>
          <p className="whitespace-pre-wrap">{block.whatsIncluded}</p>
        </div>
      )}
      {block.deliverable && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">What you receive</p>
          <p>{block.deliverable}</p>
        </div>
      )}
      {block.recoveryMinutes !== null && (
        <p>Allow {formatDuration(block.recoveryMinutes)} of rest afterwards.</p>
      )}
      {block.practitioners.length > 0 && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">Who you&rsquo;ll see</p>
          <ul className="mt-1 space-y-1">
            {block.practitioners.map((p) => (
              <li key={p.name}>
                <span className="font-medium text-ink-900">{p.name}</span>, {p.role}
                {p.yearsOfExperience !== null && ` · ${p.yearsOfExperience} years' experience`}
                {p.qualifications.length > 0 && ` · ${p.qualifications.join(", ")}`}
                {p.languages.length > 0 && ` · speaks ${p.languages.join(", ")}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">About this provider</p>
        <p className="font-medium text-ink-900">{block.provider.name}</p>
        {block.provider.description && <p>{block.provider.description}</p>}
        <p className="text-ink-500">
          {[
            block.provider.yearEstablished && `Since ${block.provider.yearEstablished}`,
            block.provider.languages.length > 0 && `Languages: ${block.provider.languages.join(", ")}`,
            block.provider.accreditations.length > 0 && `Accreditations: ${block.provider.accreditations.join(", ")}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {block.note && <p className="border-l-2 border-teal-200 pl-3 italic">{block.note}</p>}
    </div>
  );
}

export function ChangeForm({ block, trip, action, big }: { block: BuilderBlock; trip: BuilderTrip; action: Action; big: boolean }) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  const size = big ? "lg" : "sm";
  return (
    <form action={dispatch} className="mt-3 space-y-3 rounded-md border border-sand-200 p-3">
      <FormFeedback state={state} />
      <input type="hidden" name="blockId" value={block.id} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-[13px] font-medium text-ink-700">
          <span>Day</span>
          <Select name="day" defaultValue={block.day}>
            {trip.days.map((d) => (
              <option key={d.key} value={d.key}>
                Day {d.dayNumber} · {d.key}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-[13px] font-medium text-ink-700">
          <span>Start time</span>
          <input
            type="time"
            name="time"
            step={900}
            defaultValue={block.time}
            className="block h-10 w-full rounded-md border border-sand-300 bg-white px-3 text-sm"
          />
        </label>
        {block.branches.length > 1 && (
          <label className="space-y-1 text-[13px] font-medium text-ink-700">
            <span>Location</span>
            <Select name="branchId" defaultValue={block.branchId ?? ""}>
              {block.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>
      <SubmitButton size={size} pendingLabel="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}

export function RemoveButton({ blockId, title, action, big }: { blockId: string; title: string; action: Action; big: boolean }) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  return (
    <form
      action={dispatch}
      onSubmit={(event) => {
        if (!window.confirm(`Remove “${title}” from the itinerary?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="blockId" value={blockId} />
      <SubmitButton variant="ghost" size={big ? "md" : "sm"} pendingLabel="Removing…" className="text-danger-600">
        <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
      </SubmitButton>
      {state.status === "error" && <FormFeedback state={state} className="mt-2" />}
    </form>
  );
}

/** Staff record the provider's answer; the client sees the green tick on CONFIRMED. */
function BookingControl({ block, action }: { block: BuilderBlock; action: Action }) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  const current = block.bookingStatus!;
  const options = [current, ...BOOKING_TRANSITIONS[current]];
  return (
    <form action={dispatch} className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      <input type="hidden" name="blockId" value={block.id} />
      <label className="flex items-center gap-2 font-medium text-ink-700">
        Booking
        <Select name="status" defaultValue={current} className="h-8 w-auto text-xs" disabled={options.length === 1}>
          {options.map((s) => (
            <option key={s} value={s}>
              {bookingStatusLabel(s)}
            </option>
          ))}
        </Select>
      </label>
      {options.length > 1 && (
        <SubmitButton size="sm" variant="secondary" pendingLabel="Saving…">
          Save
        </SubmitButton>
      )}
      {state.status === "error" && <FormFeedback state={state} className="w-full" />}
    </form>
  );
}

export function nextHalfHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const minutes = Math.min(22 * 60, Math.ceil((h * 60 + m + 30) / 30) * 30);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
