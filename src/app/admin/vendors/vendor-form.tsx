"use client";

import type { Vendor } from "@prisma/client";
import { useActionState } from "react";
import {
  AppLink as Link,
  buttonClasses,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";

export function VendorForm({
  vendor,
  action,
  submitLabel,
}: {
  vendor?: Vendor;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  useActionRedirect(state);
  const v = (field: keyof Vendor, fallback = "") =>
    state.values?.[field as string] ??
    (vendor?.[field] as string | null) ??
    fallback;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormFeedback state={state} />

      <Card className="p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Vendor name"
            htmlFor="name"
            required
            errors={state.fieldErrors.name}
            className="sm:col-span-2"
          >
            <Input
              id="name"
              name="name"
              required
              maxLength={200}
              defaultValue={v("name")}
              invalid={Boolean(state.fieldErrors.name)}
              placeholder="Backwater Diagnostics Centre (demo)"
            />
          </Field>

          <Field
            label="Contact name"
            htmlFor="contactName"
            errors={state.fieldErrors.contactName}
          >
            <Input
              id="contactName"
              name="contactName"
              defaultValue={v("contactName")}
              invalid={Boolean(state.fieldErrors.contactName)}
            />
          </Field>

          <Field label="Email" htmlFor="email" errors={state.fieldErrors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={v("email")}
              invalid={Boolean(state.fieldErrors.email)}
            />
          </Field>

          <Field label="Phone" htmlFor="phone" errors={state.fieldErrors.phone}>
            <Input
              id="phone"
              name="phone"
              defaultValue={v("phone")}
              invalid={Boolean(state.fieldErrors.phone)}
            />
          </Field>

          <Field
            label="Location"
            htmlFor="location"
            hint="City or district in Kerala."
            errors={state.fieldErrors.location}
          >
            <Input
              id="location"
              name="location"
              defaultValue={v("location")}
              invalid={Boolean(state.fieldErrors.location)}
              placeholder="Kochi, Ernakulam"
            />
          </Field>

          <Field
            label="Accreditation"
            htmlFor="accreditation"
            hint="Record only what the vendor has evidenced."
            errors={state.fieldErrors.accreditation}
            className="sm:col-span-2"
          >
            <Input
              id="accreditation"
              name="accreditation"
              defaultValue={v("accreditation")}
              invalid={Boolean(state.fieldErrors.accreditation)}
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
              defaultValue={v("status", "ACTIVE")}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>

          <Field
            label="Internal notes"
            htmlFor="notes"
            hint="Never shown to clients."
            errors={state.fieldErrors.notes}
            className="sm:col-span-2"
          >
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={v("notes")}
              invalid={Boolean(state.fieldErrors.notes)}
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <Link
          href={vendor ? `/admin/vendors/${vendor.id}` : "/admin/vendors"}
          className={buttonClasses("secondary", "md")}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
