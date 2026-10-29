"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, MessageCircle, Plus, Sparkles, Sun, Trash2, TriangleAlert } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import type { Suggestion, SuggestFn } from "@/components/builder/add-panel";
import { nextHalfHour } from "@/components/builder/itinerary-builder";
import { formatMoney } from "@/domain/itineraries/pricing";
import { formatDuration } from "@/domain/vendors/profile";
import { parseDateInput } from "@/domain/shared/dates";
import type { BuilderBlock, BuilderDay, BuilderTrip, Library, LibraryComponent } from "@/domain/trips/builder-view";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { PROGRESS_LABELS } from "./progress-tick";
import { Sheet, useUrlPanel } from "./sheet";
import { KIND, KindIcon, StatusPill, kindOf, pill } from "./ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export type DaysActions = { add: Action; move: Action; remove: Action; build: Action; suggest?: SuggestFn };

const longDay = (key: string) =>
  parseDateInput(key).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDay = (key: string) =>
  parseDateInput(key).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });

const PARTS_OF_DAY = [
  { label: "Morning", time: "09:00" },
  { label: "Afternoon", time: "14:00" },
  { label: "Evening", time: "18:30" },
];

/**
 * The client's trip read like a printed itinerary: one day under another,
 * each activity a large row. A tap opens its details; "Add something" opens a
 * guided panel (ideas, then kind, then when). Nothing needs a drag, and both
 * panels live in the URL so the Back button closes them.
 */
export function TripDays({
  trip,
  library,
  actions,
  contactName,
  justId,
  justMoved,
}: {
  trip: BuilderTrip;
  library: Library;
  actions: DaysActions;
  contactName: string;
  justId: string | null;
  justMoved: boolean;
}) {
  const [itemId, openItem, closeItem] = useUrlPanel("item");
  const [addKey, openAdd, closeAdd] = useUrlPanel("add");
  const blocks = useMemo(() => new Map(trip.days.flatMap((d) => d.blocks.map((b) => [b.id, b] as const))), [trip]);
  const openBlock = itemId ? blocks.get(itemId) : undefined;
  const addDay = addKey && trip.editable ? trip.days.find((d) => d.key === addKey) : undefined;
  const freeDays = trip.days.filter((d) => d.blocks.length === 0).length;

  // The page streams in after the browser has looked for the #day anchor, so
  // bring the just-added item (or the linked day) into view ourselves.
  useEffect(() => {
    const target = justId ? `block-${justId}` : window.location.hash.slice(1);
    if (target) document.getElementById(target)?.scrollIntoView({ block: justId ? "center" : "start" });
  }, [justId]);

  return (
    <>
      <nav aria-label="Jump to a day" className="sticky top-0 z-20 -mx-4 bg-sand-50/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {trip.days.map((day) => (
            <li key={day.key}>
              <a
                href={`#day-${day.key}`}
                className="flex min-h-12 flex-col items-center justify-center whitespace-nowrap rounded-2xl border border-sand-200 bg-white px-4 text-[15px] leading-tight text-ink-700 hover:border-forest-800"
              >
                <span className="font-semibold text-ink-900">Day {day.dayNumber}</span>{" "}
                <span>{shortDay(day.key)}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {trip.editable && freeDays > 0 && <SuggestCard tripId={trip.id} freeDays={freeDays} action={actions.build} />}

      <ol className="mt-4 space-y-5">
        {trip.days.map((day) => (
          <li key={day.key} id={`day-${day.key}`} className="portal-card scroll-mt-24 p-3 sm:p-6">
            <h2 className="flex flex-wrap items-baseline gap-x-3 px-2 pt-1">
              <span className="font-display text-[28px] font-semibold leading-tight text-ink-900">Day {day.dayNumber}</span>
              <span className="text-[18px] text-ink-600">{longDay(day.key)}</span>
            </h2>
            {day.blocks.length > 0 ? (
              <ul className="mt-2 divide-y divide-sand-100">
                {day.blocks.map((block) => (
                  <Row key={block.id} block={block} just={block.id === justId ? (justMoved ? "Moved here" : "Just added") : null} onOpen={() => openItem(block.id)} />
                ))}
              </ul>
            ) : (
              <p className="mx-2 mt-3 flex items-start gap-3 rounded-2xl bg-sand-100/70 px-4 py-4 text-[17px] leading-relaxed text-ink-700">
                <Sun className="mt-0.5 h-5 w-5 shrink-0 text-marigold-500" aria-hidden="true" />
                A free day — rest, or explore at your own pace{trip.editable ? ". You can add something if you like." : "."}
              </p>
            )}
            {trip.editable && (
              <button type="button" onClick={() => openAdd(day.key)} className={pill("quiet", "mt-1 w-full justify-start sm:w-auto")}>
                <Plus className="h-5 w-5" aria-hidden="true" /> Add something to Day {day.dayNumber}
              </button>
            )}
          </li>
        ))}
      </ol>

      {openBlock && (
        <ItemSheet block={openBlock} trip={trip} actions={actions} contactName={contactName} onClose={closeItem} />
      )}
      {addDay && <AddSheet trip={trip} day={addDay} library={library} actions={actions} onClose={closeAdd} />}
    </>
  );
}

function Row({ block, just, onOpen }: { block: BuilderBlock; just: string | null; onOpen: () => void }) {
  const origin = block.addedBy === "TEAM" ? ", arranged for you" : block.addedBy === "AI" ? ", a suggestion" : "";
  return (
    <li id={`block-${block.id}`} className="scroll-mt-24 py-1">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${block.time}, ${block.title}${origin}. ${PROGRESS_LABELS[block.progress]}. Open details`}
        className={cn(
          "flex w-full items-start gap-4 rounded-3xl p-3 text-left transition-colors hover:bg-sand-50 sm:gap-5 sm:p-4",
          just && "portal-just-added bg-marigold-50 hover:bg-marigold-50",
        )}
      >
        <span className="hidden w-16 shrink-0 pt-1.5 text-right tabular-nums sm:block">
          <span className="block text-[19px] font-semibold text-ink-900">{block.time}</span>
          <span className="block text-[15px] text-ink-600">{block.endTime}</span>
        </span>
        <KindIcon moduleName={block.moduleName} />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold tabular-nums text-ink-700 sm:hidden">
            {block.time} – {block.endTime}
          </span>
          <span className="block text-[19px] font-semibold leading-snug text-ink-900">{block.title}</span>
          <span className="mt-1 block text-[16px] leading-snug text-ink-600">
            {[block.catalogueName, block.branchLabel, formatDuration(block.durationMinutes)].filter(Boolean).join(" · ")}
          </span>
          {block.overlaps && (
            <span className="mt-1.5 flex items-center gap-1.5 text-[16px] font-medium text-warning-600">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" /> Overlaps another activity
            </span>
          )}
          {just && <span className="mt-1.5 block text-[16px] font-semibold text-marigold-700">{just}</span>}
          <StatusPill block={block} className="mt-2 sm:hidden" />
        </span>
        <StatusPill block={block} className="mt-1 hidden sm:inline-flex" />
        <ChevronRight className="mt-3 hidden h-5 w-5 shrink-0 text-ink-600 sm:block" aria-hidden="true" />
      </button>
    </li>
  );
}

/** The one AI action on this page, in plain words. */
function SuggestCard({ tripId, freeDays, action }: { tripId: string; freeDays: number; action: Action }) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  return (
    <form action={dispatch} className="mt-3 flex flex-wrap items-center gap-4 rounded-[1.75rem] bg-marigold-50 p-5 sm:p-6">
      <input type="hidden" name="tripId" value={tripId} />
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-marigold-700" aria-hidden="true">
        <Sparkles className="h-6 w-6" />
      </span>
      <div className="min-w-[14rem] flex-1">
        <p className="text-[19px] font-semibold text-ink-900">
          You have {freeDays} free {freeDays === 1 ? "day" : "days"}. Would you like some ideas?
        </p>
        <p className="mt-0.5 text-[16px] text-ink-700">We add a few suggestions around your appointments. Keep the ones you like, remove the rest.</p>
      </div>
      <SubmitButton pendingLabel="Finding ideas…" size="lg" className={pill("secondary")}>
        Suggest things for me
      </SubmitButton>
      <FormFeedback state={state} className="w-full" />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------

function ItemSheet({
  block,
  trip,
  actions,
  contactName,
  onClose,
}: {
  block: BuilderBlock;
  trip: BuilderTrip;
  actions: DaysActions;
  contactName: string;
  onClose: () => void;
}) {
  const [changing, setChanging] = useState(false);
  const day = trip.days.find((d) => d.key === block.day);
  const kind = KIND[kindOf(block.moduleName)];
  const askUrl = `/trip/chat?trip=${encodeURIComponent(trip.id)}&about=${encodeURIComponent(block.title)}`;

  return (
    <Sheet label={block.title} onClose={onClose}>
      <p className="flex items-center gap-3 text-[17px] font-medium text-ink-700">
        <KindIcon moduleName={block.moduleName} /> {kind.label} · {block.catalogueName}
      </p>
      <h2 className="mt-4 font-display text-[32px] font-semibold leading-tight text-ink-900">{block.title}</h2>
      <StatusPill block={block} className="mt-3" />
      <p className="mt-3 text-[17px] leading-relaxed text-ink-700">{statusSentence(block, contactName)}</p>

      <dl className="mt-6 divide-y divide-sand-200 rounded-3xl border border-sand-200 bg-white px-5">
        <Fact label="When">
          Day {day?.dayNumber}, {longDay(block.day)}
          <br />
          {block.time} – {block.endTime} ({formatDuration(block.durationMinutes)})
        </Fact>
        <Fact label="Where">{[block.branchLabel, block.provider.name].filter(Boolean).join(" — ")}</Fact>
        <Fact label="Price">
          {formatMoney(block.price, block.currency)}
          {trip.travellers > 1 && ` for ${trip.travellers} travellers`}
        </Fact>
        {block.practitioners.length > 0 && (
          <Fact label="Who you'll see">
            {block.practitioners.map((p) => (
              <span key={p.name} className="block">
                <span className="font-semibold text-ink-900">{p.name}</span>, {p.role}
                {p.yearsOfExperience !== null && `, ${p.yearsOfExperience} years' experience`}
                {p.languages.length > 0 && `. Speaks ${p.languages.join(", ")}`}
              </span>
            ))}
          </Fact>
        )}
        {block.deliverable && <Fact label="You receive">{block.deliverable}</Fact>}
        {block.recoveryMinutes !== null && <Fact label="Afterwards">Allow {formatDuration(block.recoveryMinutes)} of rest.</Fact>}
      </dl>

      {block.note && (
        <blockquote className="mt-5 rounded-3xl bg-marigold-50 px-5 py-4 text-[17px] leading-relaxed text-ink-800">
          <span className="block text-[15px] font-semibold text-marigold-700">A note for you</span>
          {block.note}
        </blockquote>
      )}

      {block.canEdit && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setChanging((v) => !v)} aria-expanded={changing} className={pill("secondary")}>
              Change day or time
            </button>
            <RemoveForm block={block} action={actions.remove} />
          </div>
          {changing && <ChangeForm block={block} trip={trip} action={actions.move} />}
        </div>
      )}

      <section className="mt-8">
        <h3 className="font-display text-[22px] font-semibold text-ink-900">About this</h3>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-700">{block.description}</p>
        {block.whatsIncluded && (
          <>
            <h4 className="mt-4 text-[16px] font-semibold text-ink-900">What is included</h4>
            <p className="mt-1 whitespace-pre-wrap text-[17px] leading-relaxed text-ink-700">{block.whatsIncluded}</p>
          </>
        )}
      </section>

      <section className="mt-8">
        <h3 className="font-display text-[22px] font-semibold text-ink-900">About {block.provider.name}</h3>
        {block.provider.description && <p className="mt-2 text-[17px] leading-relaxed text-ink-700">{block.provider.description}</p>}
        <p className="mt-2 text-[16px] leading-relaxed text-ink-600">
          {[
            block.provider.yearEstablished && `Since ${block.provider.yearEstablished}`,
            block.provider.languages.length > 0 && `Speaks ${block.provider.languages.join(", ")}`,
            block.provider.accreditations.length > 0 && block.provider.accreditations.join(", "),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </section>

      <Link href={askUrl} className={pill("secondary", "mt-8")}>
        <MessageCircle className="h-5 w-5" aria-hidden="true" /> Ask us about this
      </Link>
    </Sheet>
  );
}

function statusSentence(block: BuilderBlock, contact: string): string {
  if (block.progress === "booked") return "The provider has confirmed this booking. You don't need to do anything.";
  if (block.progress === "confirmed") return "You confirmed this. We are booking it now and you will see a green tick when the provider confirms.";
  if (block.addedBy === "TEAM") return `Your team arranged this for you. If you would like to change it, ask ${contact}.`;
  if (block.addedBy === "AI") return "Our assistant suggested this. Keep it, move it, or remove it — it is up to you.";
  return "You added this. You can move it or remove it until you confirm your trip.";
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-[16px] font-semibold text-ink-600">{label}</dt>
      <dd className="text-[17px] leading-relaxed text-ink-900">{children}</dd>
    </div>
  );
}

function RemoveForm({ block, action }: { block: BuilderBlock; action: Action }) {
  const [asking, setAsking] = useState(false);
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={pill("secondary", "text-danger-600")}>
        <Trash2 className="h-5 w-5" aria-hidden="true" /> Remove from my trip
      </button>
    );
  }
  return (
    <form action={dispatch} className="w-full rounded-3xl border-2 border-danger-200 bg-danger-50 p-5" aria-label="Remove this activity">
      <input type="hidden" name="blockId" value={block.id} />
      <input type="hidden" name="day" value={block.day} />
      <p className="text-[18px] font-semibold text-ink-900">Remove “{block.title}” from your trip?</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <SubmitButton variant="danger" size="lg" pendingLabel="Removing…" className={pill("danger")}>
          Yes, remove it
        </SubmitButton>
        <button type="button" onClick={() => setAsking(false)} className={pill("secondary")}>
          No, keep it
        </button>
      </div>
      <FormFeedback state={state} className="mt-3" />
    </form>
  );
}

function ChangeForm({ block, trip, action }: { block: BuilderBlock; trip: BuilderTrip; action: Action }) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  return (
    <form action={dispatch} className="space-y-5 rounded-3xl border border-sand-200 bg-white p-5">
      <input type="hidden" name="blockId" value={block.id} />
      <fieldset>
        <legend className="text-[18px] font-semibold text-ink-900">Which day?</legend>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {trip.days.map((d) => (
            <label key={d.key} className="block">
              <input type="radio" name="day" value={d.key} defaultChecked={d.key === block.day} className="peer sr-only" />
              <span className="flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-sand-200 bg-white text-[15px] leading-tight text-ink-700 peer-checked:border-forest-900 peer-checked:bg-forest-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500">
                <span className="font-semibold">Day {d.dayNumber}</span> {shortDay(d.key)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <WhenPicker defaultTime={block.time} />
      {block.branches.length > 1 && <BranchSelect branches={block.branches} defaultValue={block.branchId ?? ""} />}
      <FormFeedback state={state} />
      <SubmitButton size="lg" pendingLabel="Saving…" className={pill("primary")}>
        Save the change
      </SubmitButton>
    </form>
  );
}

/** Morning / afternoon / evening for most people; an exact time for those who want one. */
function WhenPicker({ defaultTime }: { defaultTime: string }) {
  const [time, setTime] = useState(defaultTime);
  return (
    <fieldset>
      <legend className="text-[18px] font-semibold text-ink-900">What time?</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {PARTS_OF_DAY.map((part) => (
          <button
            key={part.label}
            type="button"
            aria-pressed={time === part.time}
            onClick={() => setTime(part.time)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 px-5 text-[17px] font-semibold leading-tight",
              time === part.time ? "border-forest-900 bg-forest-900 text-white" : "border-sand-200 bg-white text-ink-800 hover:border-forest-800",
            )}
          >
            {part.label}{" "}
            <span className="text-[14px] font-medium opacity-80">{part.time}</span>
          </button>
        ))}
      </div>
      <label className="mt-3 flex flex-wrap items-center gap-3 text-[17px] text-ink-700">
        Or a time of your choice
        <input
          type="time"
          name="time"
          step={900}
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-13 rounded-2xl border-2 border-sand-200 bg-white px-4 text-[18px] text-ink-900 focus:border-forest-800 focus:outline-none"
        />
      </label>
    </fieldset>
  );
}

function BranchSelect({ branches, defaultValue }: { branches: { id: string; label: string }[]; defaultValue: string }) {
  return (
    <label className="block">
      <span className="text-[18px] font-semibold text-ink-900">Which location?</span>
      <span className="mt-0.5 block text-[16px] text-ink-600">Choose the one nearest to where you are staying.</span>
      <select
        name="branchId"
        defaultValue={defaultValue}
        required
        className="mt-2 block h-14 w-full rounded-2xl border-2 border-sand-200 bg-white px-4 text-[18px] text-ink-900 focus:border-forest-800 focus:outline-none"
      >
        <option value="" disabled>
          Choose a location…
        </option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Adding: ideas → kind → option → when
// ---------------------------------------------------------------------------

function AddSheet({
  trip,
  day,
  library,
  actions,
  onClose,
}: {
  trip: BuilderTrip;
  day: BuilderDay;
  library: Library;
  actions: DaysActions;
  onClose: () => void;
}) {
  const [state, dispatch] = useActionState(actions.add, idleState);
  useActionRedirect(state);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [catalogueId, setCatalogueId] = useState<string | null>(null);
  const [chosen, setChosen] = useState<LibraryComponent | null>(null);
  const [ideas, setIdeas] = useState<Suggestion[] | null>(actions.suggest ? null : []);

  const byId = useMemo(() => {
    const map = new Map<string, LibraryComponent>();
    for (const m of library.modules) for (const c of m.catalogues) for (const comp of c.components) map.set(comp.id, comp);
    return map;
  }, [library]);
  const last = day.blocks[day.blocks.length - 1];
  const defaultTime = last ? nextHalfHour(last.endTime) : "10:00";

  const suggest = actions.suggest;
  useEffect(() => {
    if (!suggest) return;
    let live = true;
    suggest(trip.id, day.key, defaultTime)
      .then((result) => live && setIdeas(result.filter((s) => byId.has(s.componentId)).slice(0, 3)))
      .catch(() => live && setIdeas([]));
    return () => {
      live = false;
    };
  }, [suggest, trip.id, day.key, defaultTime, byId]);

  const activeModule = library.modules.find((m) => m.id === moduleId);
  const shown = activeModule?.catalogues.filter((c) => !catalogueId || c.id === catalogueId) ?? [];
  const heading = `Add to Day ${day.dayNumber}`;

  return (
    <Sheet label={heading} onClose={onClose}>
      <div role="region" aria-label="Add to this day">
        <p className="text-[17px] text-ink-600">{longDay(day.key)}</p>
        <h2 className="font-display text-[32px] font-semibold leading-tight text-ink-900">{heading}</h2>

        {chosen ? (
          <form action={dispatch} className="mt-5 space-y-6">
            <button type="button" onClick={() => setChosen(null)} className={pill("quiet", "-ml-4")}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back
            </button>
            <input type="hidden" name="tripId" value={trip.id} />
            <input type="hidden" name="componentId" value={chosen.id} />
            <input type="hidden" name="day" value={day.key} />
            <div className="rounded-3xl border border-sand-200 bg-white p-5">
              <p className="font-display text-[24px] font-semibold leading-snug text-ink-900">{chosen.name}</p>
              <p className="mt-1 text-[16px] text-ink-600">
                {chosen.vendorName} · {formatDuration(chosen.durationMinutes)} · {formatMoney(chosen.price, chosen.currency)}{" "}
                {chosen.priceUnitLabel}
              </p>
              <p className="mt-3 text-[17px] leading-relaxed text-ink-700">{chosen.description}</p>
              {chosen.deliverable && <p className="mt-2 text-[16px] text-ink-700">You receive: {chosen.deliverable}</p>}
            </div>
            <WhenPicker defaultTime={defaultTime} />
            {chosen.branches.length > 1 && <BranchSelect branches={chosen.branches} defaultValue="" />}
            <FormFeedback state={state} />
            <SubmitButton size="lg" pendingLabel="Adding…" className={pill("primary", "w-full sm:w-auto")}>
              <Plus className="h-5 w-5" aria-hidden="true" /> Add to my trip
            </SubmitButton>
            <p className="text-[16px] text-ink-600">Nothing is booked until you confirm your trip.</p>
          </form>
        ) : activeModule ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => {
                setModuleId(null);
                setCatalogueId(null);
              }}
              className={pill("quiet", "-ml-4")}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" /> All kinds
            </button>
            <h3 className="mt-2 flex items-center gap-3 font-display text-[24px] font-semibold text-ink-900">
              <KindIcon moduleName={activeModule.name} /> {KIND[kindOf(activeModule.name)].label}
            </h3>
            {activeModule.catalogues.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Show">
                {[{ id: null, name: "Everything" }, ...activeModule.catalogues].map((c) => (
                  <button
                    key={c.id ?? "all"}
                    type="button"
                    aria-pressed={catalogueId === c.id}
                    onClick={() => setCatalogueId(c.id)}
                    className={cn(
                      "min-h-12 rounded-full border-2 px-5 text-[16px] font-semibold",
                      catalogueId === c.id ? "border-forest-900 bg-forest-900 text-white" : "border-sand-200 bg-white text-ink-800",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            {shown.every((c) => c.components.length === 0) ? (
              <p className="mt-5 text-[17px] text-ink-700">Nothing to choose here yet. Ask us and we will look for you.</p>
            ) : (
              shown.map((c) =>
                c.components.length > 0 ? (
                  <section key={c.id} className="mt-6" aria-label={c.name}>
                    <h4 className="text-[17px] font-semibold text-ink-700">{c.name}</h4>
                    <ul className="mt-2 space-y-3">
                      {c.components.map((comp) => (
                        <li key={comp.id}>
                          <OptionCard component={comp} onPick={() => setChosen(comp)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null,
              )
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {ideas === null ? (
              <p className="text-[17px] text-ink-600">Finding ideas for this day…</p>
            ) : (
              ideas.length > 0 && (
                <section aria-label="Ideas for this day">
                  <h3 className="flex items-center gap-2 text-[19px] font-semibold text-ink-900">
                    <Sparkles className="h-5 w-5 text-marigold-500" aria-hidden="true" /> Ideas for this day
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {ideas.map((idea) => (
                      <li key={idea.componentId}>
                        <OptionCard component={byId.get(idea.componentId)!} reason={idea.reason} onPick={() => setChosen(byId.get(idea.componentId)!)} />
                      </li>
                    ))}
                  </ul>
                </section>
              )
            )}
            <section aria-label="Choose what you would like">
              <h3 className="text-[19px] font-semibold text-ink-900">{ideas?.length ? "Or choose what you would like" : "What would you like?"}</h3>
              <ul className="mt-3 space-y-3">
                {library.modules.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setModuleId(m.id)}
                      className="flex w-full items-center gap-4 rounded-3xl border-2 border-sand-200 bg-white p-4 text-left hover:border-forest-800"
                    >
                      <KindIcon moduleName={m.name} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[19px] font-semibold text-ink-900">{KIND[kindOf(m.name)].label}</span>
                        <span className="block text-[16px] text-ink-600">{m.catalogues.map((c) => c.name).join(", ")}</span>
                      </span>
                      <ChevronRight className="h-6 w-6 shrink-0 text-ink-600" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function OptionCard({ component, reason, onPick }: { component: LibraryComponent; reason?: string; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="block w-full rounded-3xl border-2 border-sand-200 bg-white p-4 text-left hover:border-forest-800 sm:p-5"
    >
      <span className="block text-[18px] font-semibold leading-snug text-ink-900">{component.name}</span>
      <span className="mt-1 block text-[16px] text-ink-600">
        {component.vendorName} · {formatDuration(component.durationMinutes)} · {formatMoney(component.price, component.currency)}{" "}
        {component.priceUnitLabel}
      </span>
      {reason && <span className="mt-2 block text-[16px] font-medium text-marigold-700">{reason}</span>}
    </button>
  );
}
