"use client";

import { useActionState } from "react";
import { Alert, ButtonLink, Field, Input, Textarea } from "@/components/ui/primitives";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";
import type { VendorSuggestions } from "@/domain/vendors/website-draft";
import type { DraftState } from "./profile-actions";

type DraftAction = (prev: DraftState, formData: FormData) => Promise<DraftState>;
type ApplyAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * "Draft from website" (P1.5): read one public page, then review what it says
 * against the profile. Rows that would replace something a person entered
 * start unticked; nothing is saved until "Save ticked suggestions".
 */
export function DraftFromWebsitePanel({
  vendorId,
  website,
  draftAction,
  applyAction,
}: {
  vendorId: string;
  website: string | null;
  draftAction: DraftAction;
  applyAction: ApplyAction;
}) {
  const [state, formAction] = useActionState<DraftState, FormData>(draftAction, idleState);

  return (
    <div className="space-y-5 px-5 pb-5">
      <form action={formAction} className="space-y-4" noValidate>
        <FormFeedback state={state} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="Page address"
            htmlFor="draft-url"
            hint="The provider's site, or a public listing about them (for example their Kerala Tourism page)."
            errors={state.fieldErrors.url}
          >
            <Input
              id="draft-url"
              name="url"
              type="url"
              defaultValue={state.values?.url ?? website ?? ""}
              placeholder="https://"
            />
          </Field>
          <Field
            label="Or paste the page's text"
            htmlFor="draft-text"
            hint="Used instead of fetching when filled in."
            errors={state.fieldErrors.pastedText}
          >
            <Textarea id="draft-text" name="pastedText" rows={3} defaultValue={state.values?.pastedText ?? ""} />
          </Field>
        </div>
        <SubmitButton size="sm" variant="secondary" pendingLabel="Reading the page…">
          Draft suggestions
        </SubmitButton>
      </form>

      {state.suggestions && (
        <SuggestionReview
          // A new draft remounts the review so its ticks start fresh.
          key={state.draftId}
          vendorId={vendorId}
          suggestions={state.suggestions}
          action={applyAction}
        />
      )}
    </div>
  );
}

function SuggestionReview({
  vendorId,
  suggestions,
  action,
}: {
  vendorId: string;
  suggestions: VendorSuggestions;
  action: ApplyAction;
}) {
  const [state, formAction] = useActionState(action, idleState);
  useActionRedirect(state);
  const { fields, branches, practitioners, services, withheld } = suggestions;
  const nothing = fields.length + branches.length + practitioners.length === 0;

  return (
    <form action={formAction} className="space-y-5 border-t border-sand-200 pt-5" noValidate>
      <FormFeedback state={state} />
      <Alert tone="info">
        Check every suggestion against the page, and reword descriptions in our own voice. Don&apos;t copy a
        site&apos;s text or photos.
        {withheld > 0 &&
          ` ${withheld} passage${withheld === 1 ? " was" : "s were"} left out because ${withheld === 1 ? "it reads" : "they read"} like a health claim.`}
      </Alert>

      {fields.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-semibold text-ink-900">Profile fields</legend>
          {fields.map((f) => (
            <div key={f.field} className="grid gap-2 rounded-md border border-sand-200 p-3 sm:grid-cols-[10rem_1fr]">
              <label className="flex items-start gap-2 text-[13px] font-medium text-ink-700">
                <input
                  type="checkbox"
                  name={`use:${f.field}`}
                  defaultChecked={!f.replaces}
                  className="mt-0.5 h-4 w-4"
                  aria-describedby={`now-${f.field}`}
                />
                {f.label}
              </label>
              <div className="space-y-1.5">
                {f.list || f.field === "description" ? (
                  <Textarea
                    name={`field:${f.field}`}
                    aria-label={`${f.label}, suggested`}
                    defaultValue={f.suggested}
                    rows={Math.min(6, f.suggested.split("\n").length + (f.field === "description" ? 2 : 0))}
                  />
                ) : (
                  <Input name={`field:${f.field}`} aria-label={`${f.label}, suggested`} defaultValue={f.suggested} />
                )}
                <p id={`now-${f.field}`} className="text-xs text-ink-500">
                  {f.list
                    ? f.current
                      ? "Adds to the existing entries; nothing is removed."
                      : "Empty now."
                    : f.replaces
                      ? `Replaces: ${f.current}`
                      : "Empty now."}
                </p>
                {state.fieldErrors[f.field] && (
                  <p role="alert" className="text-xs text-danger-600">
                    {state.fieldErrors[f.field].join(" ")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </fieldset>
      )}

      {branches.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-900">New branches</legend>
          <ul className="space-y-2">
            {branches.map((b) => (
              <li key={b.name}>
                <label className="flex items-start gap-2 text-sm text-ink-700">
                  <input type="checkbox" name="branch" value={JSON.stringify(b)} defaultChecked className="mt-1 h-4 w-4" />
                  <span>
                    <span className="font-medium text-ink-900">{b.name}</span>
                    <span className="block text-xs text-ink-500">
                      {[b.addressLine, b.city, b.postcode].filter(Boolean).join(", ")}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {practitioners.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-900">New practitioners</legend>
          <ul className="space-y-2">
            {practitioners.map((p) => (
              <li key={p.name}>
                <label className="flex items-start gap-2 text-sm text-ink-700">
                  <input type="checkbox" name="practitioner" value={JSON.stringify(p)} defaultChecked className="mt-1 h-4 w-4" />
                  <span>
                    <span className="font-medium text-ink-900">{p.name}</span>
                    <span className="block text-xs text-ink-500">
                      {[p.role, p.qualifications.replaceAll("\n", ", "), p.yearsOfExperience && `${p.yearsOfExperience} years`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {services.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-ink-900">Services the page mentions</h3>
          <p className="mb-2 text-xs text-ink-500">
            Not added automatically: a component needs a catalogue, duration and price.
          </p>
          <ul className="space-y-1.5">
            {services.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 text-sm text-ink-700">
                <span>
                  {s.name}
                  {s.description && <span className="block text-xs text-ink-500">{s.description}</span>}
                </span>
                <ButtonLink href={`/admin/components/new?vendorId=${vendorId}`} variant="secondary" size="sm">
                  Add as component
                </ButtonLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nothing ? (
        <p className="text-sm text-ink-500">The page had nothing the profile doesn&apos;t already hold.</p>
      ) : (
        <SubmitButton size="sm" pendingLabel="Saving…">
          Save ticked suggestions
        </SubmitButton>
      )}
    </form>
  );
}
