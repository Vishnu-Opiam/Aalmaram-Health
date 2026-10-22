"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function useForm(action: Action) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  const value = (field: string, fallback = "") => state.values?.[field] ?? fallback;
  return { state, dispatch, value };
}

export function TripForm({
  action,
  clientId,
  initial,
  submitLabel,
}: {
  action: Action;
  clientId?: string;
  initial: { name: string; startDate: string; endDate: string; travellers: number };
  submitLabel: string;
}) {
  const { state, dispatch, value } = useForm(action);
  const prefix = clientId ? "new-trip" : "trip";
  return (
    <form action={dispatch} className="space-y-4" noValidate>
      <FormFeedback state={state} />
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Trip name" htmlFor={`${prefix}-name`} required errors={state.fieldErrors.name} className="sm:col-span-2">
          <Input id={`${prefix}-name`} name="name" defaultValue={value("name", initial.name)} placeholder="Ten days in Kerala" />
        </Field>
        <Field label="Start date" htmlFor={`${prefix}-start`} required errors={state.fieldErrors.startDate}>
          <Input id={`${prefix}-start`} name="startDate" type="date" defaultValue={value("startDate", initial.startDate)} />
        </Field>
        <Field label="End date" htmlFor={`${prefix}-end`} required errors={state.fieldErrors.endDate}>
          <Input id={`${prefix}-end`} name="endDate" type="date" defaultValue={value("endDate", initial.endDate)} />
        </Field>
        <Field
          label="Travellers"
          htmlFor={`${prefix}-travellers`}
          required
          hint="Prices follow this until the itinerary is confirmed."
          errors={state.fieldErrors.travellers}
        >
          <Input
            id={`${prefix}-travellers`}
            name="travellers"
            type="number"
            min={1}
            max={20}
            defaultValue={value("travellers", String(initial.travellers))}
          />
        </Field>
      </div>
      <SubmitButton size="sm" pendingLabel="Saving…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export function RequirementsForm({
  action,
  modules,
  initial,
}: {
  action: Action;
  modules: { id: string; name: string }[];
  initial: {
    summary: string;
    budgetAmount: string;
    budgetCurrency: string;
    pace: string;
    mustHaves: string;
    avoid: string;
    mix: Record<string, string>;
  };
}) {
  const { state, dispatch, value } = useForm(action);
  const [mix, setMix] = useState<Record<string, string>>(() =>
    Object.fromEntries(modules.map((m) => [m.id, value(`mix.${m.id}`, initial.mix[m.id] ?? "")])),
  );
  const total = Object.values(mix).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const blank = Object.values(mix).every((v) => v.trim() === "");

  return (
    <form action={dispatch} className="space-y-4" noValidate>
      <FormFeedback state={state} />
      <Field
        label="Summary"
        htmlFor="req-summary"
        required
        hint="What the client wants from this trip, in a few sentences. Not a medical record."
        errors={state.fieldErrors.summary}
      >
        <Textarea id="req-summary" name="summary" rows={4} defaultValue={value("summary", initial.summary)} />
      </Field>

      <fieldset>
        <legend className="text-[13px] font-medium text-ink-700">Module mix (%)</legend>
        <p className="text-xs text-ink-500">How the trip divides between modules. Leave all blank if not known yet.</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {modules.map((m) => (
            <label key={m.id} className="space-y-1 text-xs text-ink-600">
              <span>{m.name}</span>
              <Input
                name={`mix.${m.id}`}
                type="number"
                min={0}
                max={100}
                value={mix[m.id]}
                onChange={(event) => setMix((current) => ({ ...current, [m.id]: event.target.value }))}
              />
            </label>
          ))}
        </div>
        <p
          className={cn("mt-1 text-xs", blank || total === 100 ? "text-ink-500" : "text-danger-600")}
          aria-live="polite"
        >
          {blank ? "No mix set." : `Total ${total}%${total === 100 ? "" : " — must be 100%"}`}
        </p>
        {state.fieldErrors.moduleMix && (
          <p role="alert" className="text-xs text-danger-600">
            {state.fieldErrors.moduleMix.join(" ")}
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Budget" htmlFor="req-budget" errors={state.fieldErrors.budgetAmount}>
          <Input id="req-budget" name="budgetAmount" type="number" min={0} defaultValue={value("budgetAmount", initial.budgetAmount)} />
        </Field>
        <Field label="Currency" htmlFor="req-currency" errors={state.fieldErrors.budgetCurrency}>
          <Input id="req-currency" name="budgetCurrency" maxLength={3} defaultValue={value("budgetCurrency", initial.budgetCurrency || "EUR")} />
        </Field>
        <Field label="Pace" htmlFor="req-pace" errors={state.fieldErrors.pace}>
          <Select id="req-pace" name="pace" defaultValue={value("pace", initial.pace)}>
            <option value="">Not known</option>
            <option value="RELAXED">Relaxed</option>
            <option value="BALANCED">Balanced</option>
            <option value="PACKED">Packed</option>
          </Select>
        </Field>
        <Field label="Must-haves" htmlFor="req-must" hint="One per line." errors={state.fieldErrors.mustHaves}>
          <Textarea id="req-must" name="mustHaves" rows={3} defaultValue={value("mustHaves", initial.mustHaves)} />
        </Field>
        <Field label="Avoid" htmlFor="req-avoid" hint="One per line." errors={state.fieldErrors.avoid}>
          <Textarea id="req-avoid" name="avoid" rows={3} defaultValue={value("avoid", initial.avoid)} />
        </Field>
      </div>
      <SubmitButton size="sm" pendingLabel="Saving…">
        Save requirements
      </SubmitButton>
    </form>
  );
}

export function ConversationForm({ action, defaultOccurredAt }: { action: Action; defaultOccurredAt: string }) {
  const { state, dispatch, value } = useForm(action);
  return (
    <form action={dispatch} className="space-y-4" noValidate>
      <FormFeedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Channel" htmlFor="conv-channel" required errors={state.fieldErrors.channel}>
          <Select id="conv-channel" name="channel" defaultValue={value("channel", "CALL")}>
            <option value="CALL">Call</option>
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="IN_PERSON">In person</option>
            <option value="STAFF_CHAT">Staff chat</option>
            <option value="AI_CHAT">AI chat</option>
          </Select>
        </Field>
        <Field label="When" htmlFor="conv-when" required errors={state.fieldErrors.occurredAt}>
          <Input id="conv-when" name="occurredAt" type="datetime-local" defaultValue={value("occurredAt", defaultOccurredAt)} />
        </Field>
      </div>
      <Field
        label="Transcript or notes"
        htmlFor="conv-transcript"
        required
        hint="Staff-only. Never shown to the client or written to logs."
        errors={state.fieldErrors.transcript}
      >
        <Textarea id="conv-transcript" name="transcript" rows={6} defaultValue={value("transcript")} />
      </Field>
      <Field label="Brief for the team" htmlFor="conv-summary" hint="Optional: which direction to take the client." errors={state.fieldErrors.summary}>
        <Textarea id="conv-summary" name="summary" rows={2} defaultValue={value("summary")} />
      </Field>
      <SubmitButton size="sm" pendingLabel="Saving…">
        Record conversation
      </SubmitButton>
    </form>
  );
}

export function NotesForm({
  action,
  initial,
}: {
  action: Action;
  initial: { adminNotes: string; clientNotes: string };
}) {
  const { state, dispatch, value } = useForm(action);
  return (
    <form action={dispatch} className="space-y-4" noValidate>
      <FormFeedback state={state} />
      <Field label="Welcome note to the client" htmlFor="notes-client" hint="Shown at the top of the client's itinerary." errors={state.fieldErrors.clientNotes}>
        <Textarea id="notes-client" name="clientNotes" rows={3} defaultValue={value("clientNotes", initial.clientNotes)} />
      </Field>
      <Field label="Internal notes" htmlFor="notes-admin" hint="Never shown to the client." errors={state.fieldErrors.adminNotes}>
        <Textarea id="notes-admin" name="adminNotes" rows={3} defaultValue={value("adminNotes", initial.adminNotes)} />
      </Field>
      <SubmitButton size="sm" pendingLabel="Saving…">
        Save notes
      </SubmitButton>
    </form>
  );
}

export function ReportEditor({
  action,
  tripId,
  initial,
}: {
  action: Action;
  tripId: string;
  initial: { title: string; content: string };
}) {
  const { state, dispatch, value } = useForm(action);
  return (
    <form action={dispatch} className="space-y-4" noValidate>
      <FormFeedback state={state} />
      <input type="hidden" name="tripId" value={tripId} />
      <Field label="Title" htmlFor="report-title" required errors={state.fieldErrors.title}>
        <Input id="report-title" name="title" defaultValue={value("title", initial.title)} />
      </Field>
      <Field label="Content (Markdown)" htmlFor="report-content" required errors={state.fieldErrors.content}>
        <Textarea
          id="report-content"
          name="content"
          rows={24}
          className="font-mono text-[13px]"
          defaultValue={value("content", initial.content)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton size="sm" pendingLabel="Saving…" name="intent" value="save" variant="secondary">
          Save draft
        </SubmitButton>
        <SubmitButton size="sm" pendingLabel="Sharing…" name="intent" value="share">
          Save and share with client
        </SubmitButton>
      </div>
    </form>
  );
}
