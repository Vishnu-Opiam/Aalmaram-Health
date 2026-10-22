"use client";

import type { Vendor } from "@prisma/client";
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
  const v = (field: keyof Vendor, fallback = "") => {
    const echoed = state.values?.[field as string];
    if (echoed !== undefined) return echoed;
    const stored = vendor?.[field];
    if (Array.isArray(stored)) return stored.join("\n");
    if (stored === null || stored === undefined) return fallback;
    return String(stored);
  };

  const text = (
    field: keyof Vendor & string,
    label: string,
    opts: { hint?: string; required?: boolean; placeholder?: string; type?: string; wide?: boolean } = {},
  ) => (
    <Field
      label={label}
      htmlFor={field}
      hint={opts.hint}
      required={opts.required}
      errors={state.fieldErrors[field]}
      className={opts.wide ? "sm:col-span-2" : undefined}
    >
      <Input
        id={field}
        name={field}
        type={opts.type}
        required={opts.required}
        defaultValue={v(field)}
        invalid={Boolean(state.fieldErrors[field])}
        placeholder={opts.placeholder}
      />
    </Field>
  );

  const lines = (field: keyof Vendor & string, label: string, hint: string, rows = 3) => (
    <Field label={label} htmlFor={field} hint={hint} errors={state.fieldErrors[field]}>
      <Textarea
        id={field}
        name={field}
        rows={rows}
        defaultValue={v(field)}
        invalid={Boolean(state.fieldErrors[field])}
      />
    </Field>
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormFeedback state={state} />

      <Card>
        <CardHeader
          title="About"
          description="Shown to clients under “About this provider”."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {text("name", "Vendor name", {
            required: true,
            wide: true,
            placeholder: "Backwater Diagnostics Centre (demo)",
          })}
          <Field
            label="Description"
            htmlFor="description"
            hint="What they do and what the experience is like. No medical claims."
            errors={state.fieldErrors.description}
            className="sm:col-span-2"
          >
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={v("description")}
              invalid={Boolean(state.fieldErrors.description)}
            />
          </Field>
          {text("yearEstablished", "Year established", { type: "number", placeholder: "1998" })}
          {text("staffCount", "Staff count", { type: "number" })}
          {lines("owners", "Owners", "One per line.", 2)}
          {lines("languages", "Languages spoken", "One per line, e.g. English, Malayalam.", 2)}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Trust"
          description="Record only what the vendor has evidenced."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {lines("accreditations", "Accreditations", "One per line.")}
          {lines("equipment", "Products and equipment", "One per line.")}
        </div>
      </Card>

      <Card>
        <CardHeader title="Online" description="Social links also feed the client Feed." />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {text("website", "Website", { placeholder: "https://", type: "url" })}
          {lines("socialLinks", "Social links", "One full address per line (Instagram, Facebook…).")}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Contact and HQ"
          description="Contact person, email, phone and notes are internal — never shown to clients. Branch addresses are added on the vendor page."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {text("contactName", "Point of contact")}
          {text("email", "Email", { type: "email" })}
          {text("phone", "Phone", { required: true })}
          {text("hqLine", "HQ address")}
          {text("hqCity", "HQ city", { placeholder: "Kochi" })}
          {text("hqPostcode", "HQ postcode")}
          {text("hqCountry", "HQ country", { placeholder: "India" })}
          <Field label="Status" htmlFor="status" errors={state.fieldErrors.status}>
            <Select id="status" name="status" defaultValue={v("status", "ACTIVE")}>
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
