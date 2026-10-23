"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Clock, Leaf, Lock, MapPin, MessageCircle, Plus, Sparkles, Stethoscope, Landmark, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { FormFeedback, useActionRedirect } from "@/components/ui/form-status";
import { AddPanel, type Suggestion, type SuggestFn } from "@/components/builder/add-panel";
import { BlockDetails, ChangeForm, RemoveButton, nextHalfHour } from "@/components/builder/itinerary-builder";
import { formatMoney } from "@/domain/itineraries/pricing";
import { formatDuration } from "@/domain/vendors/profile";
import { formatLongDate, parseDateInput } from "@/domain/shared/dates";
import type { BuilderBlock, BuilderDay, BuilderTrip, Library, LibraryComponent } from "@/domain/trips/builder-view";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { ChatDock, type ChatDockProps } from "./chat-dock";
import { PROGRESS_LABELS, ProgressTick } from "./progress-tick";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export type BoardActions = { add: Action; move: Action; remove: Action; place: Action; suggest?: SuggestFn };

// Drag payloads: a block already on the board, or an idea (a component) from the rail or the chat.
const BLOCK_TYPE = "application/x-aalmaram-block";
const COMPONENT_TYPE = "application/x-aalmaram-component";

/**
 * The client's trip as a board: one column per day, a short card per
 * activity, everything visible at once. Details open on a tap. Ideas from the
 * AI sit beside it and in the chat below; drag one onto a day or press "Add".
 * Every drag has a button alternative (most clients are 50+).
 */
export function TripBoard({
  trip,
  library,
  ideas,
  actions,
  chat,
}: {
  trip: BuilderTrip;
  library: Library;
  ideas: Suggestion[];
  actions: BoardActions;
  chat: Omit<ChatDockProps, "draft" | "renderIdea" | "editable">;
}) {
  const [moveState, moveDispatch, movePending] = useActionState(actions.move, idleState);
  const [placeState, placeDispatch, placePending] = useActionState(actions.place, idleState);
  useActionRedirect(moveState);
  useActionRedirect(placeState);

  const [openBlock, setOpenBlock] = useState<BuilderBlock | null>(null);
  const [addDay, setAddDay] = useState<BuilderDay | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ text: string; nonce: number } | null>(null);

  const components = useMemo(() => {
    const map = new Map<string, LibraryComponent>();
    for (const m of library.modules) for (const c of m.catalogues) for (const comp of c.components) map.set(comp.id, comp);
    return map;
  }, [library]);
  const blocks = useMemo(() => new Map(trip.days.flatMap((d) => d.blocks.map((b) => [b.id, b] as const))), [trip]);

  function place(componentId: string, day: string) {
    const fd = new FormData();
    fd.set("tripId", trip.id);
    fd.set("componentId", componentId);
    fd.set("day", day);
    startTransition(() => placeDispatch(fd));
  }

  function drop(event: React.DragEvent, day: string) {
    event.preventDefault();
    setDropDay(null);
    const block = blocks.get(event.dataTransfer.getData(BLOCK_TYPE));
    const componentId = event.dataTransfer.getData(COMPONENT_TYPE);
    if (block && block.day !== day) {
      const fd = new FormData();
      fd.set("blockId", block.id);
      fd.set("day", day);
      fd.set("time", block.time);
      if (block.branchId) fd.set("branchId", block.branchId);
      startTransition(() => moveDispatch(fd));
    } else if (componentId && components.has(componentId)) {
      place(componentId, day);
    }
  }

  const renderIdea = (idea: Suggestion) => {
    const component = components.get(idea.componentId);
    return component ? (
      <IdeaCard component={component} reason={idea.reason} days={trip.days} editable={trip.editable} onPlace={place} />
    ) : null;
  };

  const shownIdeas = ideas.filter((i) => components.has(i.componentId));
  const pending = movePending || placePending;
  const error = [moveState, placeState].find((s) => s.status === "error");

  return (
    <>
      {pending && (
        <p role="status" className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-5 py-2 text-[15px] text-white shadow-lg">
          Saving…
        </p>
      )}
      {error && <FormFeedback state={error} className="mb-4" />}

      <div className={cn("grid gap-6", trip.editable && "lg:grid-cols-[minmax(0,1fr)_300px]")}>
        <section aria-label="Your days" id="itinerary">
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
            {trip.days.map((day) => (
              <li
                key={day.key}
                id={`day-${day.key}`}
                className={cn(
                  "flex min-h-40 scroll-mt-24 flex-col rounded-xl border bg-white/70 p-2.5 transition-colors",
                  dropDay === day.key ? "border-teal-500 bg-teal-50" : "border-sand-200",
                )}
                onDragOver={(event) => {
                  if (!trip.editable) return;
                  const types = event.dataTransfer.types;
                  if (!types.includes(BLOCK_TYPE) && !types.includes(COMPONENT_TYPE)) return;
                  event.preventDefault();
                  setDropDay(day.key);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropDay(null);
                }}
                onDrop={(event) => drop(event, day.key)}
              >
                <h2 className="px-1.5 pb-2 pt-1">
                  <span className="block font-serif text-[20px] leading-none text-ink-900">Day {day.dayNumber}</span>
                  <span className="mt-1 block text-[14px] text-ink-500">{shortDate(day.key)}</span>
                </h2>
                <ul className="flex flex-1 flex-col gap-2">
                  {day.blocks.map((block) => (
                    <li key={block.id}>
                      <BlockCard block={block} onOpen={() => setOpenBlock(block)} />
                    </li>
                  ))}
                  {day.blocks.length === 0 && (
                    <li className="px-1.5 py-2 text-[14px] text-ink-400">{trip.editable ? "Free — drop something here" : "Free day"}</li>
                  )}
                </ul>
                {trip.editable && (
                  <button
                    type="button"
                    onClick={() => setAddDay(day)}
                    className="mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-dashed border-sand-300 text-[15px] font-medium text-teal-700 hover:border-teal-500 hover:bg-teal-50"
                    aria-label={`Add something on day ${day.dayNumber}`}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add
                  </button>
                )}
              </li>
            ))}
          </ol>
        </section>

        {trip.editable && (
          <aside aria-labelledby="ideas-heading" className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border border-sand-200 bg-white p-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
              <h2 id="ideas-heading" className="flex items-center gap-2 font-serif text-[20px] text-ink-900">
                <Sparkles className="h-5 w-5 text-brass-500" aria-hidden="true" /> Ideas for you
              </h2>
              <p className="mt-1 text-[14px] text-ink-500">Drag one onto a day, or press Add.</p>
              {shownIdeas.length === 0 ? (
                <p className="mt-4 text-[15px] text-ink-500">
                  Tell the assistant below what you enjoy and ideas will appear here.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {shownIdeas.map((idea) => (
                    <li key={idea.componentId}>{renderIdea(idea)}</li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
      </div>

      {openBlock && (
        <BlockDrawer
          block={openBlock}
          trip={trip}
          actions={actions}
          onClose={() => setOpenBlock(null)}
          onAsk={() => {
            setDraft({ text: `About “${openBlock.title}”: `, nonce: Date.now() });
            setOpenBlock(null);
          }}
        />
      )}
      {addDay && (
        <Sheet label={`Add to day ${addDay.dayNumber}`} onClose={() => setAddDay(null)} side="center">
          <AddPanel
            tripId={trip.id}
            day={addDay.key}
            defaultTime={addDay.blocks.length ? nextHalfHour(addDay.blocks[addDay.blocks.length - 1].endTime) : "09:00"}
            library={library}
            action={actions.add}
            suggest={actions.suggest}
            big
            onClose={() => setAddDay(null)}
          />
        </Sheet>
      )}

      <ChatDock {...chat} editable={trip.editable} draft={draft} renderIdea={renderIdea} />
    </>
  );
}

const shortDate = (key: string) =>
  parseDateInput(key).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function moduleLook(moduleName: string) {
  if (/health|medical/i.test(moduleName)) return { Icon: Stethoscope, stripe: "border-l-teal-500", icon: "text-teal-600" };
  if (/wellness|spa/i.test(moduleName)) return { Icon: Leaf, stripe: "border-l-success-600", icon: "text-success-600" };
  return { Icon: Landmark, stripe: "border-l-brass-500", icon: "text-brass-600" };
}

function BlockCard({ block, onOpen }: { block: BuilderBlock; onOpen: () => void }) {
  const look = moduleLook(block.moduleName);
  return (
    <div
      draggable={block.canEdit}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(BLOCK_TYPE, block.id);
      }}
      className={cn(
        "rounded-lg border border-l-4 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
        look.stripe,
        block.addedBy === "AI" ? "border-dashed border-y-info-200 border-r-info-200" : "border-y-sand-200 border-r-sand-200",
        block.progress === "booked" && "bg-success-50",
        block.canEdit && "cursor-grab active:cursor-grabbing",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-2 p-2.5 text-left"
        aria-label={`${block.time}, ${block.title}${block.addedBy === "TEAM" ? ", arranged by your team" : block.addedBy === "AI" ? ", suggested" : ""}. ${PROGRESS_LABELS[block.progress]}. Open details`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[14px] tabular-nums text-ink-600">
            <look.Icon className={cn("h-4 w-4 shrink-0", look.icon)} aria-hidden="true" />
            <span className="font-semibold text-ink-900">{block.time}</span>
            {block.addedBy === "TEAM" && <Lock className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />}
            {block.addedBy === "AI" && <Sparkles className="h-3.5 w-3.5 text-info-600" aria-hidden="true" />}
            {block.overlaps && <TriangleAlert className="h-3.5 w-3.5 text-warning-600" aria-hidden="true" />}
          </span>
          <span className="mt-1 line-clamp-2 block text-[15px] leading-snug text-ink-900">{block.title}</span>
        </span>
        <ProgressTick progress={block.progress} />
      </button>
    </div>
  );
}

/** An idea from the rail or the chat: drag it onto a day, or press Add and pick the day. */
export function IdeaCard({
  component,
  reason,
  days,
  editable,
  onPlace,
}: {
  component: LibraryComponent;
  reason: string;
  days: BuilderDay[];
  editable: boolean;
  onPlace: (componentId: string, day: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <div
      draggable={editable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(COMPONENT_TYPE, component.id);
      }}
      className={cn("rounded-lg border border-sand-200 bg-sand-50 p-3", editable && "cursor-grab active:cursor-grabbing")}
    >
      <p className="text-[15px] font-medium leading-snug text-ink-900">{component.name}</p>
      <p className="mt-0.5 text-[13px] text-ink-500">
        {formatDuration(component.durationMinutes)} · {formatMoney(component.price, component.currency)}
      </p>
      <p className="mt-1 text-[13px] italic text-ink-600">{reason}</p>
      {editable &&
        (picking ? (
          <div className="mt-2" role="group" aria-label={`Choose a day for ${component.name}`}>
            <p className="text-[13px] font-medium text-ink-700">Which day?</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {days.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => onPlace(component.id, d.key)}
                  className="min-h-10 rounded-full border border-teal-200 bg-white px-3 text-[14px] font-medium text-teal-700 hover:bg-teal-50"
                >
                  Day {d.dayNumber}
                </button>
              ))}
              <button type="button" onClick={() => setPicking(false)} className="min-h-10 px-2 text-[14px] text-ink-500">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => setPicking(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </Button>
        ))}
    </div>
  );
}

function BlockDrawer({
  block,
  trip,
  actions,
  onClose,
  onAsk,
}: {
  block: BuilderBlock;
  trip: BuilderTrip;
  actions: BoardActions;
  onClose: () => void;
  onAsk: () => void;
}) {
  const [changing, setChanging] = useState(false);
  const day = trip.days.find((d) => d.key === block.day);
  return (
    <Sheet label={block.title} onClose={onClose} side="right">
      <p className="text-[15px] text-ink-500">
        Day {day?.dayNumber} · {formatLongDate(parseDateInput(block.day))}
      </p>
      <h2 className="mt-1 font-serif text-[26px] leading-tight text-ink-900">{block.title}</h2>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[16px] text-ink-700">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4 text-ink-400" aria-hidden="true" /> {block.time} – {block.endTime}
        </span>
        <span>{formatMoney(block.price, block.currency)}</span>
        {block.branchLabel && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4 text-ink-400" aria-hidden="true" /> {block.branchLabel}
          </span>
        )}
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-lg border border-sand-200 bg-white p-3">
        <ProgressTick progress={block.progress} size="lg" />
        <p className="text-[16px] text-ink-800">
          {block.progress === "planned"
            ? block.addedBy === "TEAM"
              ? "Arranged by your team — fixed in your trip."
              : block.addedBy === "AI"
                ? "Suggested by our assistant — keep it or remove it."
                : "Your choice — you can move or remove it."
            : PROGRESS_LABELS[block.progress]}
        </p>
      </div>
      {block.overlaps && (
        <p className="mt-3 flex items-center gap-2 text-[15px] text-warning-600">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" /> This overlaps another activity — change the time.
        </p>
      )}

      {block.canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="md" onClick={() => setChanging((v) => !v)} aria-expanded={changing}>
            <Clock className="h-4 w-4" aria-hidden="true" /> Change day or time
          </Button>
          <RemoveButton blockId={block.id} title={block.title} action={actions.remove} big />
        </div>
      )}
      {changing && <ChangeForm block={block} trip={trip} action={actions.move} big />}

      <BlockDetails block={block} big />

      <Button type="button" variant="ghost" size="md" className="mt-4" onClick={onAsk}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask the assistant about this
      </Button>
    </Sheet>
  );
}

/** A modal panel: from the right on wide screens, full-screen on a phone. Esc or the backdrop closes it. */
function Sheet({
  label,
  side,
  onClose,
  children,
}: {
  label: string;
  side: "right" | "center";
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" className="absolute inset-0 bg-ink-900/30" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div
        ref={panelRef}
        className={cn(
          "relative ml-auto h-full w-full overflow-y-auto bg-sand-50 p-5 shadow-xl sm:p-7",
          side === "right" ? "sm:max-w-[480px]" : "sm:m-auto sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-xl",
        )}
      >
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" /> Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
