"use client";

import type { Branch, Practitioner } from "@prisma/client";
import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** Echoed input after a failed submit, else the stored value (lists one per line). */
function valueReader<T extends object>(state: FormState, record?: T) {
  return (field: keyof T & string, fallback = "") => {
    const echoed = state.values?.[field];
    if (echoed !== undefined) return echoed;
    const stored = record?.[field];
    if (Array.isArray(stored)) return stored.join("\n");
    if (stored === null || stored === undefined) return fallback;
    return String(stored);
  };
}

function StatusField({ value, idPrefix }: { value: string; idPrefix: string }) {
  return (
    <Field label="Status" htmlFor={`${idPrefix}-status`}>
      <Select id={`${idPrefix}-status`} name="status" defaultValue={value}>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </Select>
    </Field>
  );
}

export function BranchForm({
  vendorId,
  branch,
  action,
}: {
  vendorId: string;
  branch?: Branch;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, idleState);
  useActionRedirect(state);
  const v = valueReader(state, branch);
  const id = branch?.id ?? "new-branch";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormFeedback state={state} />
      <input type="hidden" name="vendorId" value={vendorId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Branch name" htmlFor={`${id}-name`} required errors={state.fieldErrors.name}>
          <Input id={`${id}-name`} name="name" defaultValue={v("name")} placeholder="Edappally" />
        </Field>
        <Field label="City" htmlFor={`${id}-city`} required errors={state.fieldErrors.city}>
          <Input id={`${id}-city`} name="city" defaultValue={v("city")} placeholder="Kochi" />
        </Field>
        <Field label="Address" htmlFor={`${id}-addressLine`} errors={state.fieldErrors.addressLine}>
          <Input id={`${id}-addressLine`} name="addressLine" defaultValue={v("addressLine")} />
        </Field>
        <Field label="Postcode" htmlFor={`${id}-postcode`} errors={state.fieldErrors.postcode}>
          <Input id={`${id}-postcode`} name="postcode" defaultValue={v("postcode")} />
        </Field>
        <Field label="Country" htmlFor={`${id}-country`} required errors={state.fieldErrors.country}>
          <Input id={`${id}-country`} name="country" defaultValue={v("country", "India")} />
        </Field>
        <StatusField value={v("status", "ACTIVE")} idPrefix={id} />
      </div>
      <SubmitButton size="sm" pendingLabel="Saving…">
        {branch ? "Save branch" : "Add branch"}
      </SubmitButton>
    </form>
  );
}

export function PractitionerForm({
  vendorId,
  practitioner,
  action,
}: {
  vendorId: string;
  practitioner?: Practitioner;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, idleState);
  useActionRedirect(state);
  const v = valueReader(state, practitioner);
  const id = practitioner?.id ?? "new-practitioner";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormFeedback state={state} />
      <input type="hidden" name="vendorId" value={vendorId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${id}-name`} required errors={state.fieldErrors.name}>
          <Input id={`${id}-name`} name="name" defaultValue={v("name")} />
        </Field>
        <Field
          label="Role"
          htmlFor={`${id}-role`}
          required
          hint="Consultant physician, massage therapist, walking-tour guide…"
          errors={state.fieldErrors.role}
        >
          <Input id={`${id}-role`} name="role" defaultValue={v("role")} />
        </Field>
        <Field
          label="Qualifications"
          htmlFor={`${id}-qualifications`}
          hint="One per line."
          errors={state.fieldErrors.qualifications}
        >
          <Textarea id={`${id}-qualifications`} name="qualifications" rows={2} defaultValue={v("qualifications")} />
        </Field>
        <Field
          label="Achievements"
          htmlFor={`${id}-achievements`}
          hint="One per line."
          errors={state.fieldErrors.achievements}
        >
          <Textarea id={`${id}-achievements`} name="achievements" rows={2} defaultValue={v("achievements")} />
        </Field>
        <Field
          label="Years of experience"
          htmlFor={`${id}-yearsOfExperience`}
          errors={state.fieldErrors.yearsOfExperience}
        >
          <Input
            id={`${id}-yearsOfExperience`}
            name="yearsOfExperience"
            type="number"
            min={0}
            defaultValue={v("yearsOfExperience")}
          />
        </Field>
        <Field
          label="Languages"
          htmlFor={`${id}-languages`}
          hint="One per line."
          errors={state.fieldErrors.languages}
        >
          <Textarea id={`${id}-languages`} name="languages" rows={2} defaultValue={v("languages")} />
        </Field>
        <StatusField value={v("status", "ACTIVE")} idPrefix={id} />
      </div>
      <SubmitButton size="sm" pendingLabel="Saving…">
        {practitioner ? "Save practitioner" : "Add practitioner"}
      </SubmitButton>
    </form>
  );
}
