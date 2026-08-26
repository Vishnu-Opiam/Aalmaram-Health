"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AppLink as Link,
  buttonClasses,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { createItineraryAction } from "../actions";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";

type ClientOption = {
  id: string;
  name: string;
  email: string;
  tripStartDate: string;
  tripEndDate: string;
};

export function NewItineraryForm({ clients }: { clients: ClientOption[] }) {
  const [state, action] = useActionState(createItineraryAction, idleState);
  useActionRedirect(state);

  // The "?clientId=" prefill is read here, on the client, rather than from the
  // page's searchParams. A server page whose tree awaits searchParams stalls
  // when Next re-renders it as part of a Server Action response, and this page
  // hosts exactly such a form. Reading it in a Client Component is free of that
  // problem and keeps the prefill link working.
  const defaultClientId = useSearchParams().get("clientId") ?? "";
  const [clientId, setClientId] = useState(
    clients.some((c) => c.id === defaultClientId) ? defaultClientId : "",
  );

  const selected = clients.find((client) => client.id === clientId);

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormFeedback state={state} />

      <Card className="space-y-5 p-5">
        <Field
          label="Client"
          htmlFor="clientId"
          required
          errors={state.fieldErrors.clientId}
        >
          <Select
            id="clientId"
            name="clientId"
            required
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            invalid={Boolean(state.fieldErrors.clientId)}
          >
            <option value="">Select a client…</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.email})
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Itinerary title"
          htmlFor="title"
          required
          hint="The client sees this. Keep it warm and descriptive."
          errors={state.fieldErrors.title}
        >
          <Input
            id="title"
            name="title"
            required
            maxLength={200}
            defaultValue={state.values?.title ?? ""}
            invalid={Boolean(state.fieldErrors.title)}
            placeholder="Ten days in Kerala: diagnostics, Ayurveda and backwaters"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Start date"
            htmlFor="startDate"
            hint="Defaults to the client trip window."
            errors={state.fieldErrors.startDate}
          >
            <Input
              id="startDate"
              name="startDate"
              type="date"
              key={`start-${clientId}`}
              defaultValue={
                state.values?.startDate ?? selected?.tripStartDate ?? ""
              }
              invalid={Boolean(state.fieldErrors.startDate)}
            />
          </Field>

          <Field
            label="End date"
            htmlFor="endDate"
            errors={state.fieldErrors.endDate}
          >
            <Input
              id="endDate"
              name="endDate"
              type="date"
              key={`end-${clientId}`}
              defaultValue={
                state.values?.endDate ?? selected?.tripEndDate ?? ""
              }
              invalid={Boolean(state.fieldErrors.endDate)}
            />
          </Field>
        </div>

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
            defaultValue={state.values?.adminNotes ?? ""}
            invalid={Boolean(state.fieldErrors.adminNotes)}
          />
        </Field>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Creating…">
          Create and start building
        </SubmitButton>
        <Link
          href="/admin/itineraries"
          className={buttonClasses("secondary", "md")}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
