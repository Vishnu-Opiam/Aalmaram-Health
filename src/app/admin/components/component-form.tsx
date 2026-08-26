"use client";

import { useActionState, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

export type ComponentFormValues = {
  id?: string;
  vendorId: string;
  catalogueId: string;
  name: string;
  tags: string[];
  price: string;
  currency: string;
  unit: string;
  costStatus: string;
  clientFacingDescription: string;
  whatsIncluded: string;
  clientDeliverable: string;
  source: string;
  sourceDate: string;
  status: string;
};

export type CatalogueOption = {
  id: string;
  name: string;
  moduleId: string;
  moduleName: string;
  status: string;
};

export function ComponentForm({
  values,
  vendors,
  catalogues,
  action,
  submitLabel,
}: {
  values?: Partial<ComponentFormValues>;
  vendors: { id: string; name: string; status: string }[];
  catalogues: CatalogueOption[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  useActionRedirect(state);

  // Read on the client - see NewItineraryForm for why.
  const vendorFromQuery = useSearchParams().get("vendorId") ?? "";

  const initial = (field: keyof ComponentFormValues, fallback = "") =>
    (state.values?.[field] as string | undefined) ??
    (values?.[field] as string | undefined) ??
    (field === "vendorId" ? vendorFromQuery || fallback : fallback);

  // Choosing a module first makes a long catalogue list manageable.
  const modules = useMemo(() => {
    const seen = new Map<string, string>();
    for (const catalogue of catalogues) {
      seen.set(catalogue.moduleId, catalogue.moduleName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [catalogues]);

  const initialCatalogueId = initial("catalogueId");
  const [moduleId, setModuleId] = useState(
    catalogues.find((c) => c.id === initialCatalogueId)?.moduleId ?? "",
  );

  const visibleCatalogues = moduleId
    ? catalogues.filter((c) => c.moduleId === moduleId)
    : catalogues;

  const tagsValue =
    (state.values?.tags as string | undefined) ??
    (values?.tags ? values.tags.join(", ") : "");

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormFeedback state={state} />

      <Card>
        <CardHeader
          title="Where it sits"
          description="A component belongs to one vendor and one catalogue. Its module is derived from the catalogue."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field
            label="Vendor"
            htmlFor="vendorId"
            required
            errors={state.fieldErrors.vendorId}
          >
            <Select
              id="vendorId"
              name="vendorId"
              required
              defaultValue={initial("vendorId")}
              invalid={Boolean(state.fieldErrors.vendorId)}
            >
              <option value="">Select a vendor…</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                  {vendor.status === "INACTIVE" ? " (inactive)" : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Module"
            htmlFor="moduleFilter"
            hint="Narrows the catalogue list."
          >
            <Select
              id="moduleFilter"
              value={moduleId}
              onChange={(event) => setModuleId(event.target.value)}
            >
              <option value="">All modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Catalogue"
            htmlFor="catalogueId"
            required
            errors={state.fieldErrors.catalogueId}
            className="sm:col-span-2"
          >
            <Select
              id="catalogueId"
              name="catalogueId"
              required
              defaultValue={initialCatalogueId}
              invalid={Boolean(state.fieldErrors.catalogueId)}
            >
              <option value="">Select a catalogue…</option>
              {visibleCatalogues.map((catalogue) => (
                <option key={catalogue.id} value={catalogue.id}>
                  {catalogue.moduleName} → {catalogue.name}
                  {catalogue.status === "INACTIVE" ? " (inactive)" : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="What the client sees"
          description="These fields are shown verbatim in the proposal and the What-to-Expect report. Write them for the client, not for the team."
        />
        <div className="space-y-5 p-5">
          <Field
            label="Component name"
            htmlFor="name"
            required
            errors={state.fieldErrors.name}
          >
            <Input
              id="name"
              name="name"
              required
              maxLength={200}
              defaultValue={initial("name")}
              invalid={Boolean(state.fieldErrors.name)}
              placeholder="Comprehensive Metabolic Panel"
            />
          </Field>

          <Field
            label="Client-facing description"
            htmlFor="clientFacingDescription"
            required
            hint="Factual and plain. Do not make medical claims or promise outcomes."
            errors={state.fieldErrors.clientFacingDescription}
          >
            <Textarea
              id="clientFacingDescription"
              name="clientFacingDescription"
              rows={4}
              required
              defaultValue={initial("clientFacingDescription")}
              invalid={Boolean(state.fieldErrors.clientFacingDescription)}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="What is included"
              htmlFor="whatsIncluded"
              hint="One item per line."
              errors={state.fieldErrors.whatsIncluded}
            >
              <Textarea
                id="whatsIncluded"
                name="whatsIncluded"
                rows={4}
                defaultValue={initial("whatsIncluded")}
                invalid={Boolean(state.fieldErrors.whatsIncluded)}
              />
            </Field>

            <Field
              label="Client deliverable"
              htmlFor="clientDeliverable"
              hint="What the client physically or digitally receives."
              errors={state.fieldErrors.clientDeliverable}
            >
              <Textarea
                id="clientDeliverable"
                name="clientDeliverable"
                rows={4}
                defaultValue={initial("clientDeliverable")}
                invalid={Boolean(state.fieldErrors.clientDeliverable)}
              />
            </Field>
          </div>

          <Field
            label="Tags"
            htmlFor="tags"
            hint="Comma separated. Used for search now, and for future matching."
            errors={state.fieldErrors.tags}
          >
            <Input
              id="tags"
              name="tags"
              defaultValue={tagsValue}
              invalid={Boolean(state.fieldErrors.tags)}
              placeholder="bloodwork, fasting, morning"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Commercial and provenance"
          description="Price is informational - this MVP does not process payments."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-3">
          <Field
            label="Price"
            htmlFor="price"
            required
            errors={state.fieldErrors.price}
          >
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={initial("price", "0")}
              invalid={Boolean(state.fieldErrors.price)}
            />
          </Field>

          <Field
            label="Currency"
            htmlFor="currency"
            errors={state.fieldErrors.currency}
          >
            <Input
              id="currency"
              name="currency"
              maxLength={3}
              defaultValue={initial("currency", "EUR")}
              invalid={Boolean(state.fieldErrors.currency)}
            />
          </Field>

          <Field
            label="Unit"
            htmlFor="unit"
            required
            errors={state.fieldErrors.unit}
          >
            <Input
              id="unit"
              name="unit"
              required
              defaultValue={initial("unit", "per person")}
              invalid={Boolean(state.fieldErrors.unit)}
            />
          </Field>

          <Field
            label="Cost status"
            htmlFor="costStatus"
            errors={state.fieldErrors.costStatus}
          >
            <Select
              id="costStatus"
              name="costStatus"
              defaultValue={initial("costStatus", "ESTIMATED")}
            >
              <option value="ESTIMATED">Estimated</option>
              <option value="CONFIRMED">Confirmed with vendor</option>
              <option value="ON_REQUEST">On request</option>
            </Select>
          </Field>

          <Field
            label="Source"
            htmlFor="source"
            hint="Where this information came from."
            errors={state.fieldErrors.source}
          >
            <Input
              id="source"
              name="source"
              defaultValue={initial("source")}
              invalid={Boolean(state.fieldErrors.source)}
              placeholder="Vendor rate card"
            />
          </Field>

          <Field
            label="Source date"
            htmlFor="sourceDate"
            errors={state.fieldErrors.sourceDate}
          >
            <Input
              id="sourceDate"
              name="sourceDate"
              type="date"
              defaultValue={initial("sourceDate")}
              invalid={Boolean(state.fieldErrors.sourceDate)}
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
              defaultValue={initial("status", "ACTIVE")}
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
          href={
            values?.id ? `/admin/components/${values.id}` : "/admin/components"
          }
          className={buttonClasses("secondary", "md")}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
