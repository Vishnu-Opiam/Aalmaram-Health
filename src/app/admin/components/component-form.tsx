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
  priceUnit: string;
  durationMinutes: string;
  recoveryTimeMinutes: string;
  practitionerIds: string[];
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

export type PractitionerOption = {
  id: string;
  name: string;
  role: string;
  vendorId: string;
};

export function ComponentForm({
  values,
  vendors,
  catalogues,
  practitioners,
  action,
  submitLabel,
}: {
  values?: Partial<ComponentFormValues>;
  vendors: { id: string; name: string; status: string }[];
  catalogues: CatalogueOption[];
  practitioners: PractitionerOption[];
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

  // Only the chosen vendor's practitioners can deliver its component.
  const [vendorId, setVendorId] = useState(initial("vendorId"));
  const vendorPractitioners = practitioners.filter((p) => p.vendorId === vendorId);
  const checkedPractitioners = new Set(values?.practitionerIds ?? []);

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
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
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
          title="Delivery"
          description="How long it takes, any recovery afterwards, and who delivers it."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field
            label="Duration (minutes)"
            htmlFor="durationMinutes"
            required
            hint="Time the client spends on it. 90 = 1 h 30 min."
            errors={state.fieldErrors.durationMinutes}
          >
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min={5}
              step={5}
              required
              defaultValue={initial("durationMinutes", "60")}
              invalid={Boolean(state.fieldErrors.durationMinutes)}
            />
          </Field>

          <Field
            label="Recovery time (minutes)"
            htmlFor="recoveryTimeMinutes"
            hint="Only for the few procedures that need it. Leave blank otherwise."
            errors={state.fieldErrors.recoveryTimeMinutes}
          >
            <Input
              id="recoveryTimeMinutes"
              name="recoveryTimeMinutes"
              type="number"
              min={0}
              step={5}
              defaultValue={initial("recoveryTimeMinutes")}
              invalid={Boolean(state.fieldErrors.recoveryTimeMinutes)}
            />
          </Field>

          <fieldset className="sm:col-span-2">
            <legend className="text-[13px] font-medium text-ink-700">
              Delivered by
            </legend>
            <p className="mt-0.5 text-xs text-ink-500">
              Optional. Health components always have one; restaurants never do.
            </p>
            {vendorPractitioners.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">
                {vendorId
                  ? "This vendor has no practitioners yet. Add them on the vendor page."
                  : "Choose a vendor to see its practitioners."}
              </p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {vendorPractitioners.map((practitioner) => (
                  <label
                    key={practitioner.id}
                    className="flex items-start gap-2 rounded-md border border-sand-200 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="practitionerIds"
                      value={practitioner.id}
                      defaultChecked={checkedPractitioners.has(practitioner.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-ink-900">{practitioner.name}</span>
                      <span className="block text-xs text-ink-500">{practitioner.role}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {state.fieldErrors.practitionerIds && (
              <p role="alert" className="mt-1.5 text-xs text-danger-600">
                {state.fieldErrors.practitionerIds.join(" ")}
              </p>
            )}
          </fieldset>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Commercial and provenance"
          description="The client sees this price in the itinerary builder."
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
            label="Price is"
            htmlFor="priceUnit"
            required
            hint="Restaurants: Google's average for two."
            errors={state.fieldErrors.priceUnit}
          >
            <Select
              id="priceUnit"
              name="priceUnit"
              defaultValue={initial("priceUnit", "PER_PERSON")}
            >
              <option value="PER_PERSON">Per person</option>
              <option value="FOR_TWO">For two</option>
              <option value="PER_GROUP">Per group</option>
            </Select>
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
