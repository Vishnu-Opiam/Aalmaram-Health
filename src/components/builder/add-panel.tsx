"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button, Select } from "@/components/ui/primitives";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { formatMoney } from "@/domain/itineraries/pricing";
import { formatDuration } from "@/domain/vendors/profile";
import type { Library, LibraryComponent } from "@/domain/trips/builder-view";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";

export type Suggestion = { componentId: string; reason: string };
export type SuggestFn = (tripId: string, day: string, time: string) => Promise<Suggestion[]>;

/**
 * What opens behind a "+": suggestions for this slot first (when the AI layer
 * provides them), then browse module → category → experience, then pick the
 * location (for providers with several) and a start time.
 */
export function AddPanel({
  tripId,
  day,
  defaultTime,
  library,
  action,
  suggest,
  big,
  onClose,
}: {
  tripId: string;
  day: string;
  defaultTime: string;
  library: Library;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  suggest?: SuggestFn;
  big: boolean;
  onClose: () => void;
}) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);

  const byId = useMemo(() => {
    const map = new Map<string, LibraryComponent>();
    for (const m of library.modules) for (const c of m.catalogues) for (const comp of c.components) map.set(comp.id, comp);
    return map;
  }, [library]);

  const [moduleId, setModuleId] = useState<string | null>(null);
  const [catalogueId, setCatalogueId] = useState<string | null>(null);
  const [selected, setSelected] = useState<LibraryComponent | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(suggest ? null : []);

  useEffect(() => {
    if (!suggest) return;
    let live = true;
    suggest(tripId, day, defaultTime)
      .then((result) => live && setSuggestions(result.filter((s) => byId.has(s.componentId))))
      .catch(() => live && setSuggestions([]));
    return () => {
      live = false;
    };
  }, [suggest, tripId, day, defaultTime, byId]);

  const activeModule = library.modules.find((m) => m.id === moduleId) ?? null;
  const catalogue = activeModule?.catalogues.find((c) => c.id === catalogueId) ?? null;
  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-4 font-medium transition-colors",
      big ? "h-11 text-[15px]" : "h-8 text-xs",
      active ? "border-teal-600 bg-teal-600 text-white" : "border-sand-300 bg-white text-ink-700 hover:bg-sand-100",
    );

  return (
    <div className="my-2 rounded-lg border border-teal-200 bg-teal-50/40 p-4" role="region" aria-label="Add to this day">
      <div className="mb-3 flex items-center justify-between">
        <p className={cn("font-medium text-ink-900", big ? "text-[17px]" : "text-sm")}>Add to this day</p>
        <Button type="button" variant="ghost" size={big ? "md" : "sm"} onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" aria-hidden="true" /> Close
        </Button>
      </div>

      {selected ? (
        <form action={dispatch} className="space-y-4">
          <FormFeedback state={state} />
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="componentId" value={selected.id} />
          <input type="hidden" name="day" value={day} />
          <ComponentSummary component={selected} big={big} />
          <div className="grid gap-3 sm:grid-cols-2">
            {selected.branches.length > 1 && (
              <label className={cn("space-y-1 font-medium text-ink-700", big ? "text-[15px]" : "text-[13px]")}>
                <span>Location — choose the one nearest to where you stay</span>
                <Select name="branchId" defaultValue="" required>
                  <option value="" disabled>
                    Choose a location…
                  </option>
                  {selected.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </Select>
                {state.fieldErrors.branchId && (
                  <span role="alert" className="block text-xs text-danger-600">
                    {state.fieldErrors.branchId.join(" ")}
                  </span>
                )}
              </label>
            )}
            <label className={cn("space-y-1 font-medium text-ink-700", big ? "text-[15px]" : "text-[13px]")}>
              <span>Start time</span>
              <input
                type="time"
                name="time"
                step={900}
                defaultValue={defaultTime}
                required
                className={cn("block w-full rounded-md border border-sand-300 bg-white px-3", big ? "h-12 text-[17px]" : "h-10 text-sm")}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton size={big ? "lg" : "sm"} pendingLabel="Adding…">
              Add to day
            </SubmitButton>
            <Button type="button" variant="secondary" size={big ? "lg" : "sm"} onClick={() => setSelected(null)}>
              Back
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {suggest && (
            <section aria-label="Suggested for this time">
              <p className={cn("flex items-center gap-1.5 font-medium text-ink-700", big ? "text-[15px]" : "text-xs")}>
                <Sparkles className="h-4 w-4 text-brass-500" aria-hidden="true" /> Suggested for this time
              </p>
              {suggestions === null ? (
                <p className="mt-2 text-sm text-ink-400">Finding ideas…</p>
              ) : suggestions.length === 0 ? (
                <p className="mt-2 text-sm text-ink-400">No suggestions for this slot — browse below.</p>
              ) : (
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {suggestions.slice(0, 4).map((s) => {
                    const comp = byId.get(s.componentId)!;
                    return (
                      <li key={s.componentId}>
                        <PickCard component={comp} reason={s.reason} big={big} onPick={() => setSelected(comp)} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          <section aria-label="Browse">
            <p className={cn("font-medium text-ink-700", big ? "text-[15px]" : "text-xs")}>Browse</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {library.modules.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={chip(m.id === moduleId)}
                  aria-pressed={m.id === moduleId}
                  onClick={() => {
                    setModuleId(m.id);
                    setCatalogueId(null);
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
            {activeModule && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeModule.catalogues.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={chip(c.id === catalogueId)}
                    aria-pressed={c.id === catalogueId}
                    onClick={() => setCatalogueId(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
                {activeModule.catalogues.length === 0 && <p className="text-sm text-ink-400">Nothing available yet.</p>}
              </div>
            )}
            {catalogue && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {catalogue.components.map((comp) => (
                  <li key={comp.id}>
                    <PickCard component={comp} big={big} onPick={() => setSelected(comp)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function PickCard({
  component,
  reason,
  big,
  onPick,
}: {
  component: LibraryComponent;
  reason?: string;
  big: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "h-full w-full rounded-md border border-sand-200 bg-white text-left transition-colors hover:border-teal-500",
        big ? "p-4" : "p-3",
      )}
    >
      <span className={cn("block font-medium text-ink-900", big ? "text-[16px]" : "text-sm")}>{component.name}</span>
      <span className={cn("block text-ink-500", big ? "text-[14px]" : "text-xs")}>
        {component.vendorName} · {formatDuration(component.durationMinutes)} ·{" "}
        {formatMoney(component.price, component.currency)} {component.priceUnitLabel}
      </span>
      {reason && <span className={cn("mt-1 block italic text-ink-600", big ? "text-[14px]" : "text-xs")}>{reason}</span>}
    </button>
  );
}

function ComponentSummary({ component, big }: { component: LibraryComponent; big: boolean }) {
  return (
    <div className="rounded-md bg-white p-3">
      <p className={cn("font-medium text-ink-900", big ? "font-serif text-[19px]" : "text-sm")}>{component.name}</p>
      <p className={cn("text-ink-500", big ? "text-[14px]" : "text-xs")}>
        {component.vendorName} · {formatDuration(component.durationMinutes)} ·{" "}
        {formatMoney(component.price, component.currency)} {component.priceUnitLabel}
      </p>
      <p className={cn("mt-2 leading-relaxed text-ink-700", big ? "text-[15px]" : "text-[13px]")}>{component.description}</p>
      {component.deliverable && (
        <p className={cn("mt-1 text-ink-600", big ? "text-[14px]" : "text-xs")}>You receive: {component.deliverable}</p>
      )}
    </div>
  );
}
