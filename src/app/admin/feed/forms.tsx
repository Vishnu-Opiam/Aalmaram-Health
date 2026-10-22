"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function FeedPostForm({
  action,
  vendors,
  today,
}: {
  action: Action;
  vendors: { id: string; name: string }[];
  today: string;
}) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  const v = (field: string, fallback = "") => state.values?.[field] ?? fallback;
  return (
    <form action={dispatch} className="space-y-4" noValidate>
      <FormFeedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source" htmlFor="feed-source" required errors={state.fieldErrors.source}>
          <Select id="feed-source" name="source" defaultValue={v("source", "VENDOR_INSTAGRAM")}>
            <option value="VENDOR_INSTAGRAM">Vendor Instagram</option>
            <option value="KERALA_TOURISM">Kerala Tourism</option>
            <option value="NEWS">Positive news</option>
          </Select>
        </Field>
        <Field label="Posted by" htmlFor="feed-vendor" hint="For vendor posts; links to the provider." errors={state.fieldErrors.vendorId}>
          <Select id="feed-vendor" name="vendorId" defaultValue={v("vendorId")}>
            <option value="">No vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Caption" htmlFor="feed-caption" required errors={state.fieldErrors.caption} className="sm:col-span-2">
          <Textarea id="feed-caption" name="caption" rows={3} defaultValue={v("caption")} />
        </Field>
        <Field label="Link to the original" htmlFor="feed-link" required errors={state.fieldErrors.link}>
          <Input id="feed-link" name="link" type="url" placeholder="https://" defaultValue={v("link")} />
        </Field>
        <Field label="Image address" htmlFor="feed-media" hint="Optional." errors={state.fieldErrors.mediaUrl}>
          <Input id="feed-media" name="mediaUrl" type="url" placeholder="https://" defaultValue={v("mediaUrl")} />
        </Field>
        <Field label="Published" htmlFor="feed-date" required errors={state.fieldErrors.publishedAt}>
          <Input id="feed-date" name="publishedAt" type="date" defaultValue={v("publishedAt", today)} />
        </Field>
      </div>
      <SubmitButton size="sm" pendingLabel="Adding…">
        Add post
      </SubmitButton>
    </form>
  );
}

export function FeedImportForm({ action }: { action: Action }) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  return (
    <form action={dispatch} className="space-y-4" noValidate>
      <FormFeedback state={state} />
      <Field
        label="Posts (JSON)"
        htmlFor="feed-json"
        hint='An array of { "source", "caption", "link", "publishedAt", optional "mediaUrl", "externalId", "vendorName" }. Re-importing the same externalId updates the post.'
        errors={state.fieldErrors.json}
      >
        <Textarea id="feed-json" name="json" rows={8} className="font-mono text-xs" defaultValue={state.values?.json ?? ""} />
      </Field>
      <SubmitButton size="sm" pendingLabel="Importing…">
        Import
      </SubmitButton>
    </form>
  );
}
