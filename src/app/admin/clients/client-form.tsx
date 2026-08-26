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
  country: string;
  status: string;
  tripStartDate: string;
  tripEndDate: string;
  healthInterests: string;
  wellnessInterests: string;
  culturalInterests: string;
  intakeNotes: string;
  generalPreferences: string;
};

export function ClientForm({
  values,
  action,
  submitLabel,
}: {
  values?: Partial<ClientFormValues>;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  useActionRedirect(state);
  const initial = (field: keyof ClientFormValues, fallback = "") =>
    state.values?.[field] ?? values?.[field] ?? fallback;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormFeedback state={state} />

      <Card>
        <CardHeader title="Contact" description="How we reach this client." />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field
            label="Full name"
            htmlFor="name"
            required
            errors={state.fieldErrors.name}
          >
            <Input
              id="name"
              name="name"
              required
              defaultValue={initial("name")}
              invalid={Boolean(state.fieldErrors.name)}
            />
          </Field>

          <Field
            label="Email"
            htmlFor="email"
            required
            hint="Used for the secure portal invitation."
            errors={state.fieldErrors.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={initial("email")}
              invalid={Boolean(state.fieldErrors.email)}
            />
          </Field>

          <Field label="Phone" htmlFor="phone" errors={state.fieldErrors.phone}>
            <Input
              id="phone"
              name="phone"
              defaultValue={initial("phone")}
              invalid={Boolean(state.fieldErrors.phone)}
            />
          </Field>

          <Field
            label="Country"
            htmlFor="country"
            errors={state.fieldErrors.country}
          >
            <Input
              id="country"
              name="country"
              defaultValue={initial("country")}
              invalid={Boolean(state.fieldErrors.country)}
              placeholder="Germany"
            />
          </Field>

          <Field
            label="Status"
            htmlFor="status"
            errors={state.fieldErrors.status}
          >
            <Select
              id="status"
              name="status"
              defaultValue={initial("status", "LEAD")}
            >
              {CLIENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Trip window"
          description="The dates the client is available to travel. Itinerary items must fall inside this window."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field
            label="Trip start date"
            htmlFor="tripStartDate"
            errors={state.fieldErrors.tripStartDate}
          >
            <Input
              id="tripStartDate"
              name="tripStartDate"
              type="date"
              defaultValue={initial("tripStartDate")}
              invalid={Boolean(state.fieldErrors.tripStartDate)}
            />
          </Field>

          <Field
            label="Trip end date"
            htmlFor="tripEndDate"
            errors={state.fieldErrors.tripEndDate}
          >
            <Input
              id="tripEndDate"
              name="tripEndDate"
              type="date"
              defaultValue={initial("tripEndDate")}
              invalid={Boolean(state.fieldErrors.tripEndDate)}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Intake"
          description="Only what is needed to curate an itinerary. This is not a medical record - do not record diagnoses, medications or clinical history."
        />
        <div className="space-y-5 p-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              label="Health interests"
              htmlFor="healthInterests"
              hint="e.g. full-body diagnostics"
              errors={state.fieldErrors.healthInterests}
            >
              <Textarea
                id="healthInterests"
                name="healthInterests"
                rows={4}
                defaultValue={initial("healthInterests")}
                invalid={Boolean(state.fieldErrors.healthInterests)}
              />
            </Field>

            <Field
              label="Wellness interests"
              htmlFor="wellnessInterests"
              hint="e.g. Ayurveda, yoga"
              errors={state.fieldErrors.wellnessInterests}
            >
              <Textarea
                id="wellnessInterests"
                name="wellnessInterests"
                rows={4}
                defaultValue={initial("wellnessInterests")}
                invalid={Boolean(state.fieldErrors.wellnessInterests)}
              />
            </Field>

            <Field
              label="Cultural interests"
              htmlFor="culturalInterests"
              hint="e.g. Kathakali, backwaters"
              errors={state.fieldErrors.culturalInterests}
            >
              <Textarea
                id="culturalInterests"
                name="culturalInterests"
                rows={4}
                defaultValue={initial("culturalInterests")}
                invalid={Boolean(state.fieldErrors.culturalInterests)}
              />
            </Field>
          </div>

          <Field
            label="General preferences"
            htmlFor="generalPreferences"
            hint="Diet, pace, accessibility, travel companions."
            errors={state.fieldErrors.generalPreferences}
          >
            <Textarea
              id="generalPreferences"
              name="generalPreferences"
              rows={3}
              defaultValue={initial("generalPreferences")}
              invalid={Boolean(state.fieldErrors.generalPreferences)}
            />
          </Field>

          <Field
            label="Intake notes"
            htmlFor="intakeNotes"
            hint="Internal. Never shown to the client."
            errors={state.fieldErrors.intakeNotes}
          >
            <Textarea
              id="intakeNotes"
              name="intakeNotes"
              rows={4}
              defaultValue={initial("intakeNotes")}
              invalid={Boolean(state.fieldErrors.intakeNotes)}
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
