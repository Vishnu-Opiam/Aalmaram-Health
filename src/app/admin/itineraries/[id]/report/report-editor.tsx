"use client";

import { useActionState, useState } from "react";
import { Eye, PencilLine } from "lucide-react";
import {
  Field,
  Input,
  Textarea,
  buttonClasses,
} from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { saveReportAction } from "../../actions";

/**
 * Edit / preview toggle for the What-to-Expect report.
 *
 * The preview is rendered on the server from the SAVED content, so what the
 * admin previews is exactly what the client would see. Unsaved edits show a
 * reminder rather than a client-inaccurate live preview.
 */
export function ReportEditor({
  itineraryId,
  title,
  content,
  previewHtml,
  disabled,
}: {
  itineraryId: string;
  title: string;
  content: string;
  previewHtml: string;
  disabled: boolean;
}) {
  const [state, action] = useActionState(saveReportAction, idleState);
  useActionRedirect(state);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [dirty, setDirty] = useState(false);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Report view"
        className="flex gap-1 border-b border-sand-200 px-5 pt-4"
      >
        {(["edit", "preview"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "flex items-center gap-1.5 rounded-t-md px-3 py-2 text-[13px] font-medium transition-colors",
              tab === value
                ? "border-b-2 border-teal-600 text-teal-700"
                : "text-ink-500 hover:text-ink-900",
            )}
          >
            {value === "edit" ? (
              <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {value === "edit" ? "Edit" : "Preview as client"}
          </button>
        ))}
      </div>

      {tab === "edit" ? (
        <form
          action={action}
          className="space-y-4 p-5"
          noValidate
          onChange={() => setDirty(true)}
          onSubmit={() => setDirty(false)}
        >
          <input type="hidden" name="itineraryId" value={itineraryId} />
          <FormFeedback state={state} />

          <Field
            label="Report title"
            htmlFor="title"
            required
            errors={state.fieldErrors.title}
          >
            <Input
              id="title"
              name="title"
              required
              defaultValue={state.values?.title ?? title}
              disabled={disabled}
              invalid={Boolean(state.fieldErrors.title)}
            />
          </Field>

          <Field
            label="Report content"
            htmlFor="content"
            required
            hint="Markdown. Headings (#, ##, ###), lists (-), **bold**, _italic_. Raw HTML is escaped."
            errors={state.fieldErrors.content}
          >
            <Textarea
              id="content"
              name="content"
              required
              rows={30}
              spellCheck
              defaultValue={state.values?.content ?? content}
              disabled={disabled}
              invalid={Boolean(state.fieldErrors.content)}
              className="font-mono text-[13px] leading-relaxed"
            />
          </Field>

          <div className="flex items-center gap-3">
            <SubmitButton pendingLabel="Saving…" disabled={disabled}>
              Save report
            </SubmitButton>
            {disabled && (
              <p className="text-xs text-ink-500">
                Locked while the proposal is with the client. Move the itinerary
                back to Draft to edit.
              </p>
            )}
          </div>
        </form>
      ) : (
        <div className="p-5">
          {dirty && (
            <p className="mb-4 rounded-md border border-warning-200 bg-warning-50 px-4 py-2.5 text-[13px] text-warning-600">
              You have unsaved edits. This preview shows the last saved version.
            </p>
          )}
          <article
            className="prose-report mx-auto max-w-3xl"
            // Content is rendered by the server-side Markdown renderer, which
            // escapes all HTML before re-introducing a fixed tag whitelist.
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}

      <noscript>
        <p className="px-5 pb-4 text-xs text-ink-500">
          The preview tab needs JavaScript. The editor above works without it.
        </p>
      </noscript>
    </div>
  );
}

