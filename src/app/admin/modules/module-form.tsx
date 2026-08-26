"use client";

import type { Module } from "@prisma/client";
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

export function ModuleForm({
  module,
  action,
  submitLabel,
}: {
  module?: Module;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  useActionRedirect(state);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormFeedback state={state} />
      <Card className="space-y-5 p-5">
        <Field
          label="Module name"
          htmlFor="name"
          required
          hint="Modules are data, not code. Add or rename them freely."
          errors={state.fieldErrors.name}
        >
          <Input
            id="name"
            name="name"
            required
            maxLength={120}
            defaultValue={state.values?.name ?? module?.name ?? ""}
            invalid={Boolean(state.fieldErrors.name)}
            placeholder="Health &amp; Medical"
          />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          errors={state.fieldErrors.description}
        >
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={
              state.values?.description ?? module?.description ?? ""
            }
            invalid={Boolean(state.fieldErrors.description)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Sort order"
            htmlFor="sortOrder"
            hint="Lower numbers appear first."
            errors={state.fieldErrors.sortOrder}
          >
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              defaultValue={
                state.values?.sortOrder ?? String(module?.sortOrder ?? 0)
              }
              invalid={Boolean(state.fieldErrors.sortOrder)}
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
              defaultValue={state.values?.status ?? module?.status ?? "ACTIVE"}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <Link
          href="/admin/modules"
          className={buttonClasses("secondary", "md")}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
