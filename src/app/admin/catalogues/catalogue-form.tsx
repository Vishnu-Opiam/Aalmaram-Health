"use client";

import type { Catalogue } from "@prisma/client";
import { useActionState } from "react";
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
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";

export function CatalogueForm({
  catalogue,
  modules,
  action,
  submitLabel,
}: {
  catalogue?: Catalogue;
  modules: { id: string; name: string; status: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  useActionRedirect(state);
  // Read on the client - see NewItineraryForm for why.
  const defaultModuleId = useSearchParams().get("moduleId") ?? "";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormFeedback state={state} />
      <Card className="space-y-5 p-5">
        <Field
          label="Parent module"
          htmlFor="moduleId"
          required
          hint="Every catalogue belongs to exactly one module."
          errors={state.fieldErrors.moduleId}
        >
          <Select
            id="moduleId"
            name="moduleId"
            required
            defaultValue={
              state.values?.moduleId ?? catalogue?.moduleId ?? defaultModuleId
            }
            invalid={Boolean(state.fieldErrors.moduleId)}
          >
            <option value="">Select a module…</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
                {module.status === "INACTIVE" ? " (inactive)" : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Catalogue name"
          htmlFor="name"
          required
          errors={state.fieldErrors.name}
        >
          <Input
            id="name"
            name="name"
            required
            maxLength={120}
            defaultValue={state.values?.name ?? catalogue?.name ?? ""}
            invalid={Boolean(state.fieldErrors.name)}
            placeholder="Diagnostics"
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
              state.values?.description ?? catalogue?.description ?? ""
            }
            invalid={Boolean(state.fieldErrors.description)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Sort order"
            htmlFor="sortOrder"
            errors={state.fieldErrors.sortOrder}
          >
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              defaultValue={
                state.values?.sortOrder ?? String(catalogue?.sortOrder ?? 0)
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
              defaultValue={
                state.values?.status ?? catalogue?.status ?? "ACTIVE"
              }
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
          href="/admin/catalogues"
          className={buttonClasses("secondary", "md")}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
