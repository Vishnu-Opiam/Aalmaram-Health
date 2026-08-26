"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import { updateItineraryAction } from "../actions";

export function TripDetailsForm({
  itineraryId,
  title,
  startDate,
  endDate,
  adminNotes,
  clientNotes,
  disabled,
}: {
  itineraryId: string;
  title: string;
  startDate: string;
  endDate: string;
  adminNotes: string;
  clientNotes: string;
  disabled: boolean;
}) {
  const [state, action] = useActionState(updateItineraryAction, idleState);
  useActionRedirect(state);

  return (
    <form action={action} className="space-y-4 p-5" noValidate>
      <input type="hidden" name="itineraryId" value={itineraryId} />
      <FormFeedback state={state} />

      <Field
        label="Itinerary title"
        htmlFor="title"
        required
        errors={state.fieldErrors.title}
      >
        <Input
          id="title"
          name="title"
          required
          defaultValue={state.values?.title ?? title}
          disabled={disabled}
          invalid={Boolean(state.fieldErrors.title)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Trip start"
          htmlFor="startDate"
          errors={state.fieldErrors.startDate}
        >
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={state.values?.startDate ?? startDate}
            disabled={disabled}
            invalid={Boolean(state.fieldErrors.startDate)}
          />
        </Field>

        <Field
          label="Trip end"
          htmlFor="endDate"
          errors={state.fieldErrors.endDate}
        >
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={state.values?.endDate ?? endDate}
            disabled={disabled}
            invalid={Boolean(state.fieldErrors.endDate)}
          />
        </Field>
      </div>

      <Field
        label="Welcome note to the client"
        htmlFor="clientNotes"
        hint="Shown at the top of the client's trip page."
        errors={state.fieldErrors.clientNotes}
      >
        <Textarea
          id="clientNotes"
          name="clientNotes"
          rows={3}
          defaultValue={state.values?.clientNotes ?? clientNotes}
          disabled={disabled}
          invalid={Boolean(state.fieldErrors.clientNotes)}
        />
      </Field>

      <Field
        label="Internal notes"
        htmlFor="adminNotes"
        hint="Never shown to the client."
        errors={state.fieldErrors.adminNotes}
      >
        <Textarea
          id="adminNotes"
          name="adminNotes"
          rows={3}
          defaultValue={state.values?.adminNotes ?? adminNotes}
          disabled={disabled}
          invalid={Boolean(state.fieldErrors.adminNotes)}
        />
      </Field>

      <SubmitButton size="sm" pendingLabel="Saving…" disabled={disabled}>
        Save trip details
      </SubmitButton>
    </form>
  );
}
