"use client";

import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/portal/kit/button";
import { Gallery } from "@/components/portal/kit/gallery";
import { ModuleDot, kindOf } from "@/components/portal/kit/module";
import { StatusMark } from "@/components/portal/kit/status";
import { Tabular } from "@/components/portal/kit/tabular";
import { useActionRedirect } from "@/components/ui/form-status";
import { AppLink } from "@/components/ui/primitives";
import { formatDuration } from "@/domain/vendors/profile";
import type { BuilderBlock } from "@/domain/trips/builder-view";
import { idleState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { Sheet } from "../sheet";
import { ActionButton } from "./action-button";
import { dayLoad, euros, forParty, longDay, shortDay, toSource } from "./plan";
import type { DaysCtx } from "./types";
import { WhenPicker } from "./when-picker";

/**
 * One activity in full: the place's photographs, when and where, the price
 * for the party, who you will see and what is included. The client's own
 * items can be moved, given another location or removed (Undo follows in
 * the toast); anything the team arranged, or anything once the trip is
 * confirmed, goes through "Ask <coordinator> about this".
 */
export function ItemSheet({ ctx, block, startMoving, onClose }: { ctx: DaysCtx; block: BuilderBlock; startMoving: boolean; onClose: () => void }) {
  const { trip } = ctx;
  const [mode, setMode] = useState<"view" | "move" | "place">(startMoving && block.canEdit ? "move" : "view");
  const [state, dispatch, pending] = useActionState(ctx.actions.move, idleState);
  useActionRedirect(state);
  const day = trip.days.find((d) => d.key === block.day);
  const photos = block.place.photos.map(toSource);
  const canPlace = block.canEdit && block.branches.length > 1;

  const footer = block.canEdit ? (
    mode === "move" ? (
      <div className="flex items-center gap-3">
        {/* Its own key: reusing the "Change…" button's element would submit on the very click that opened the picker. */}
        <button key="save" type="submit" form="move-form" disabled={pending} aria-busy={pending} className={buttonClass("primary", "flex-1")}>
          {pending ? "Saving…" : "Save the change"}
        </button>
        <button type="button" onClick={() => setMode("view")} className={buttonClass("quiet", "px-3")}>
          Cancel
        </button>
      </div>
    ) : (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button key="change" type="button" onClick={() => setMode("move")} className={buttonClass("primary", "flex-1")}>
          Change day or time
        </button>
        <ActionButton
          action={ctx.actions.remove}
          fields={{ blockId: block.id, day: block.day }}
          className={buttonClass("quiet", "px-2 text-danger-600 decoration-danger-600/40")}
          pendingLabel="Removing…"
        >
          Remove from my trip
        </ActionButton>
      </div>
    )
  ) : (
    <ActionButton
      action={ctx.actions.ask}
      fields={{ tripId: trip.id, blockId: block.id, returnTo: ctx.back(block.day) }}
      className={buttonClass("primary", "w-full")}
      pendingLabel="Sending…"
    >
      Ask {ctx.contact} about this
    </ActionButton>
  );

  return (
    <Sheet label={block.title} onClose={onClose} footer={footer}>
      {photos.length > 0 && (
        // On a phone the gallery's 4:5 would fill the sheet: 4:3 keeps the title and facts in view.
        <div className="-mx-5 -mt-6 mb-8 md:-mx-10 [&_.snap-start>button>div]:aspect-[4/3]!">
          <Gallery photos={photos} name={block.place.name} kind={kindOf(block.moduleName)} panelKey="itemphoto" />
        </div>
      )}
      <p className="pk-label">
        <ModuleDot moduleName={block.moduleName} className="text-mist-ink" />
        {block.place.city ? ` · ${block.place.city}` : ""}
      </p>
      <h2 className="pk-h2 mt-2">{block.title}</h2>
      <StatusMark progress={block.progress} addedBy={block.addedBy} className="mt-4" />
      <p className="pk-body mt-3 text-mist-muted">{statusSentence(block, ctx.contact)}</p>

      {mode === "move" ? (
        <form id="move-form" action={dispatch} className="mt-8 space-y-8 border-t border-paper-line pt-8">
          <MoveFields ctx={ctx} block={block} />
          {state.status === "error" && state.message && (
            <p role="alert" className="text-[17px] text-danger-600">
              {state.message}
            </p>
          )}
        </form>
      ) : (
        <dl className="mt-8 divide-y divide-paper-line border-y border-paper-line">
          <Fact label="When">
            Day {day?.dayNumber} · {longDay(block.day)}
            <br />
            <Tabular>{block.time}</Tabular> – <Tabular>{block.endTime}</Tabular> · {formatDuration(block.durationMinutes)}
          </Fact>
          <Fact label="Where">
            {[block.branchLabel, block.place.name].filter(Boolean).join(", ")}
            {canPlace && mode !== "place" && (
              <button type="button" onClick={() => setMode("place")} className={buttonClass("quiet", "mt-1 flex")}>
                Change location
              </button>
            )}
            {mode === "place" && <PlaceForm ctx={ctx} block={block} onCancel={() => setMode("view")} />}
          </Fact>
          <Fact label="Price">
            {euros(block.price, block.currency)} {forParty(trip.travellers)}
          </Fact>
          {block.practitioners.length > 0 && (
            <Fact label="Who you'll see">
              {block.practitioners.map((p) => (
                <span key={p.name} className="block">
                  <span className="font-medium">{p.name}</span>, {p.role}
                  {p.yearsOfExperience !== null && `, ${p.yearsOfExperience} years' experience`}
                  {p.languages.length > 0 && `. Speaks ${p.languages.join(", ")}`}
                </span>
              ))}
            </Fact>
          )}
          {block.deliverable && <Fact label="You receive">{block.deliverable}</Fact>}
          {block.recoveryMinutes !== null && <Fact label="Afterwards">Allow {formatDuration(block.recoveryMinutes)} of rest.</Fact>}
        </dl>
      )}

      {block.note && (
        <blockquote className="mt-8 border-l-2 border-gold-500 pl-5">
          <p className="pk-label">A note for you</p>
          <p className="mt-1 font-display text-[22px] leading-[1.45]">{block.note}</p>
        </blockquote>
      )}

      <section className="mt-10">
        <h3 className="pk-h3">About the visit</h3>
        <p className="pk-body mt-2">{block.description}</p>
        {block.whatsIncluded && (
          <>
            <h4 className="mt-5 text-[17px] font-medium">What is included</h4>
            <p className="pk-body mt-1 whitespace-pre-wrap">{block.whatsIncluded}</p>
          </>
        )}
      </section>

      <section className="mt-10 border-t border-paper-line pt-8">
        <h3 className="pk-h3">About {block.provider.name}</h3>
        {block.provider.description && <p className="pk-body mt-2">{block.provider.description}</p>}
        <p className="mt-2 text-[17px] text-mist-muted">
          {[
            block.provider.yearEstablished && `Since ${block.provider.yearEstablished}`,
            block.provider.languages.length > 0 && `Speaks ${block.provider.languages.join(", ")}`,
            block.provider.accreditations.length > 0 && block.provider.accreditations.join(", "),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <AppLink href={`/trip/explore/${block.place.slug}`} className={buttonClass("quiet", "mt-3")}>
          See {block.place.name} <ArrowRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </AppLink>
      </section>
    </Sheet>
  );
}

function statusSentence(block: BuilderBlock, contact: string): string {
  if (block.progress === "booked") return "The provider has confirmed this booking. You don't need to do anything.";
  if (block.progress === "confirmed") return "You confirmed this. We are booking it now, and it gets a green tick when the provider confirms.";
  if (block.addedBy === "TEAM") return `Your team arranged this for you. To change anything, just ask ${contact}.`;
  if (block.addedBy === "AI") return "Our assistant suggested this. Keep it, move it or remove it: it is up to you.";
  return "You added this. You can move it or remove it until you confirm your trip.";
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 md:grid-cols-[9rem_1fr] md:gap-6">
      <dt className="text-[16px] font-medium text-mist-muted">{label}</dt>
      <dd className="text-[18px] leading-relaxed">{children}</dd>
    </div>
  );
}

/** Which day (each says how full it is), what time, kept at the same location. */
function MoveFields({ ctx, block }: { ctx: DaysCtx; block: BuilderBlock }) {
  const { trip } = ctx;
  const [dayKey, setDayKey] = useState(block.day);
  const [time, setTime] = useState(block.time);
  return (
    <>
      <input type="hidden" name="blockId" value={block.id} />
      {block.branchId && <input type="hidden" name="branchId" value={block.branchId} />}
      <fieldset>
        <legend className="text-[19px] font-medium">Which day?</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
          {trip.days.map((d) => (
            <label key={d.key} className="block">
              <input
                type="radio"
                name="day"
                value={d.key}
                checked={dayKey === d.key}
                onChange={() => setDayKey(d.key)}
                className="peer sr-only"
              />
              <span className="flex min-h-16 cursor-pointer flex-col justify-center rounded-[6px] border-2 border-paper-line bg-paper-raised px-4 py-2 leading-tight peer-checked:border-mist-ink peer-checked:bg-mist-ink peer-checked:text-paper peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-mist-ink">
                <span className="text-[17px] font-medium">
                  Day {d.dayNumber} · {shortDay(d.key)}
                </span>
                <span className={cn("mt-1 text-[16px] opacity-75")}>{d.key === block.day ? "this day" : dayLoad(trip, d)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <WhenPicker trip={trip} dayKey={dayKey} time={time} onTime={setTime} item={{ durationMinutes: block.durationMinutes }} ignoreId={block.id} />
    </>
  );
}

/** "Change location": the same day and time at another of the provider's locations. */
function PlaceForm({ ctx, block, onCancel }: { ctx: DaysCtx; block: BuilderBlock; onCancel: () => void }) {
  const [state, dispatch, pending] = useActionState(ctx.actions.move, idleState);
  useActionRedirect(state);
  return (
    <form action={dispatch} className="mt-4 space-y-2">
      <input type="hidden" name="blockId" value={block.id} />
      <input type="hidden" name="day" value={block.day} />
      <input type="hidden" name="time" value={block.time} />
      <fieldset>
        <legend className="sr-only">Which location?</legend>
        {block.branches.map((b) => (
          <label key={b.id} className="mb-2 flex min-h-14 cursor-pointer items-center gap-3 rounded-[6px] border-2 border-paper-line bg-paper-raised px-4 has-checked:border-mist-ink">
            <input type="radio" name="branchId" value={b.id} defaultChecked={b.id === block.branchId} required className="h-5 w-5 accent-mist-ink" />
            <span className="text-[17px]">{b.label}</span>
          </label>
        ))}
      </fieldset>
      {state.status === "error" && state.message && (
        <p role="alert" className="text-[16px] text-danger-600">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-4 pt-2">
        <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("secondary", "min-h-12")}>
          {pending ? "Saving…" : "Save location"}
        </button>
        <button type="button" onClick={onCancel} className={buttonClass("quiet")}>
          Keep this one
        </button>
      </div>
    </form>
  );
}
