"use client";

import { useActionState, useState } from "react";
import { Check, MessageSquare } from "lucide-react";
import { Alert, Field, Select, Textarea } from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import { approveItineraryAction, requestChangesAction } from "./actions";

export type DecisionItem = { id: string; title: string; dayLabel: string };

/**
 * The client's decision area.
 *
 * Two clear actions, no jargon, and an explicit acknowledgement after a change
 * request so the client knows the message reached a person.
 */
export function DecisionPanel({
  itineraryId,
  status,
  items,
  hasOpenRequest,
}: {
  itineraryId: string;
  status: "PUBLISHED" | "CHANGES_REQUESTED" | "APPROVED";
  items: DecisionItem[];
  hasOpenRequest: boolean;
}) {
  const [approveState, approve] = useActionState(
    approveItineraryAction,
    idleState,
  );
  const [changeState, requestChanges] = useActionState(
    requestChangesAction,
    idleState,
  );
  useActionRedirect(approveState);
  useActionRedirect(changeState);
  const [mode, setMode] = useState<"none" | "changes">("none");

  if (status === "APPROVED") {
    return (
      <Alert tone="success" title="You have approved this journey">
        Thank you. Your Aalmaram coordinator is confirming each element with the
        providers and will be in touch with the final details.
      </Alert>
    );
  }

  const acknowledged =
    changeState.status === "success" || (hasOpenRequest && mode === "none");

  return (
    <div className="space-y-5">
      <FormFeedback state={approveState} />

      {acknowledged && changeState.status !== "success" && (
        <Alert tone="info" title="We have your request">
          Your Aalmaram coordinator has received your requested changes and is
          revising the proposal. You will receive an updated version shortly.
        </Alert>
      )}

      {changeState.status === "success" ? (
        <Alert tone="success" title="Request received">
          {changeState.message}
        </Alert>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <form action={approve}>
              <input type="hidden" name="itineraryId" value={itineraryId} />
              <SubmitButton
                size="lg"
                className="w-full"
                pendingLabel="Approving…"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Approve this journey
              </SubmitButton>
            </form>

            <button
              type="button"
              onClick={() => setMode(mode === "changes" ? "none" : "changes")}
              aria-expanded={mode === "changes"}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-sand-300 bg-white px-6 text-[15px] font-medium text-ink-800 transition-colors hover:bg-sand-100"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Request a change
            </button>
          </div>

          <p className="text-[13px] leading-relaxed text-ink-500">
            Approving tells us the plan works for you. Nothing is charged here -
            your coordinator will confirm each element with the providers and
            discuss costs with you directly.
          </p>

          {mode === "changes" && (
            <form
              action={requestChanges}
              className="space-y-4 rounded-lg border border-sand-200 bg-white p-5"
              noValidate
            >
              <input type="hidden" name="itineraryId" value={itineraryId} />
              <FormFeedback state={changeState} />

              <Field
                label="What would you like to change?"
                htmlFor="itineraryItemId"
                errors={changeState.fieldErrors.itineraryItemId}
              >
                <Select
                  id="itineraryItemId"
                  name="itineraryItemId"
                  defaultValue="GENERAL"
                >
                  <option value="GENERAL">
                    Something about the trip as a whole
                  </option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.dayLabel} — {item.title}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Tell us more"
                htmlFor="message"
                required
                hint="A sentence or two is plenty. Please do not include medical details here."
                errors={changeState.fieldErrors.message}
              >
                <Textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  minLength={10}
                  maxLength={4000}
                  defaultValue={changeState.values?.message ?? ""}
                  invalid={Boolean(changeState.fieldErrors.message)}
                  placeholder="I would prefer the backwater day earlier in the week, if that is possible."
                />
              </Field>

              <div className="flex items-center gap-3">
                <SubmitButton pendingLabel="Sending…">
                  Send to my coordinator
                </SubmitButton>
                <button
                  type="button"
                  onClick={() => setMode("none")}
                  className="text-[13px] font-medium text-ink-500 hover:text-ink-900 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
