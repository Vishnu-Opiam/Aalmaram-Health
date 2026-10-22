"use client";

import { useActionState } from "react";
import {
  AppLink as Link,
  buttonClasses,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { CLIENT_STATUS_OPTIONS } from "@/components/admin/status-badges";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";

export type ClientFormValues = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  addressLine: string;
  city: string;
  postcode: string;
  country: string;
  status: string;
  relationshipManagerId: string;
  generalPreferences: string;
};

/**
 * The lasting client record. What the client wants from a particular trip
 * lives on that trip's requirements, not here.
 */
export function ClientForm({
  values,
  staff,
  action,
  submitLabel,
}: {
  values?: Partial<ClientFormValues>;
  staff: { id: string; name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  useActionRedirect(state);
  const initial = (field: keyof ClientFormValues, fallback = "") =>
    state.values?.[field] ?? values?.[field] ?? fallback;

  const text = (field: keyof ClientFormValues & string, label: string, opts: { type?: string; required?: boolean; hint?: string } = {}) => (
    <Field label={label} htmlFor={field} required={opts.required} hint={opts.hint} errors={state.fieldErrors[field]}>
      <Input
        id={field}
        name={field}
        type={opts.type}
        required={opts.required}
        defaultValue={initial(field)}
        invalid={Boolean(state.fieldErrors[field])}
      />
    </Field>
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormFeedback state={state} />

      <Card>
        <CardHeader title="Contact" description="How we reach this client." />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {text("name", "Full name", { required: true })}
          {text("email", "Email", { type: "email", required: true, hint: "Their portal link is sent here." })}
          {text("phone", "Phone")}
          {text("dateOfBirth", "Date of birth", { type: "date" })}
          {text("addressLine", "Address")}
          {text("city", "City")}
          {text("postcode", "Postcode")}
          {text("country", "Country")}
        </div>
      </Card>

      <Card>
        <CardHeader title="Relationship" description="Who looks after this client, and where they are in the process." />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Relationship manager" htmlFor="relationshipManagerId" errors={state.fieldErrors.relationshipManagerId}>
            <Select id="relationshipManagerId" name="relationshipManagerId" defaultValue={initial("relationshipManagerId")}>
              <option value="">Not assigned</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status" errors={state.fieldErrors.status}>
            <Select id="status" name="status" defaultValue={initial("status", "LEAD")}>
              {CLIENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Lasting preferences"
            htmlFor="generalPreferences"
            hint="True across trips: diet, mobility, language, likes and dislikes. Not a medical record."
            errors={state.fieldErrors.generalPreferences}
            className="sm:col-span-2"
          >
            <Textarea
              id="generalPreferences"
              name="generalPreferences"
              rows={3}
              defaultValue={initial("generalPreferences")}
              invalid={Boolean(state.fieldErrors.generalPreferences)}
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <Link
          href={values?.id ? `/admin/clients/${values.id}` : "/admin/clients"}
          className={buttonClasses("secondary", "md")}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
