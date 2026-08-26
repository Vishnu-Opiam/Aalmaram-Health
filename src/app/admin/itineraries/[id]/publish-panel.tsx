"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import {
  publishItineraryAction,
  setReadyForReviewAction,
  unpublishItineraryAction,
} from "../actions";

/**
 * The publishing control surface.
 *
 * Publishing is always explicit. A published itinerary cannot be edited in
 * place - the admin must move it back to Draft first, which is what stops a
 * client from ever seeing half-finished content.
 */
export function PublishPanel({
  itineraryId,
  status,
  issues,
  hasReport,
  publishedAt,
}: {
  itineraryId: string;
  status: string;
  issues: string[];
  hasReport: boolean;
  publishedAt: string | null;
}) {
  const [publishState, publish] = useActionState(
    publishItineraryAction,
    idleState,
  );
  const [unpublishState, unpublish] = useActionState(
    unpublishItineraryAction,
    idleState,
  );
  const [readyState, markReady] = useActionState(
    setReadyForReviewAction,
    idleState,
  );
  useActionRedirect(publishState);
  useActionRedirect(unpublishState);
  useActionRedirect(readyState);

  const isLive = status === "PUBLISHED" || status === "CHANGES_REQUESTED";
  const isApproved = status === "APPROVED";
  const canPublish =
    issues.length === 0 &&
    ["DRAFT", "READY_FOR_REVIEW", "CHANGES_REQUESTED"].includes(status);

  return (
    <div className="space-y-4 p-5">
      <FormFeedback state={publishState} />
      <FormFeedback state={unpublishState} />
      <FormFeedback state={readyState} />

      {issues.length > 0 && (
        <Alert tone="warning" title="Not ready to publish">
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </Alert>
      )}

      {issues.length === 0 && !isLive && !isApproved && (
        <Alert tone="success">
          All publication checks pass.
          {!hasReport &&
            " The What-to-Expect report has not been generated yet - you can still publish, but the client will see the itinerary only."}
        </Alert>
      )}

      {isApproved && (
        <Alert tone="success" title="Approved by the client">
          Move it back to Draft only if the plan genuinely needs to change - the
          client will lose sight of the proposal while you edit.
        </Alert>
      )}

      {isLive && (
        <Alert tone="info" title="Visible to the client">
          {publishedAt ? `Published ${publishedAt}. ` : ""}
          Editing is locked. Move it back to Draft to make changes, then
          re-publish.
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <form action={markReady}>
            <input type="hidden" name="itineraryId" value={itineraryId} />
            <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
              Mark ready for review
            </SubmitButton>
          </form>
        )}

        {!isLive && !isApproved && (
          <form action={publish}>
            <input type="hidden" name="itineraryId" value={itineraryId} />
            <SubmitButton
              size="sm"
              pendingLabel="Publishing…"
              disabled={!canPublish}
            >
              {status === "CHANGES_REQUESTED"
                ? "Publish revised proposal"
                : "Publish to client"}
            </SubmitButton>
          </form>
        )}

        {(isLive || isApproved) && (
          <form action={unpublish}>
            <input type="hidden" name="itineraryId" value={itineraryId} />
            <SubmitButton
              variant="secondary"
              size="sm"
              pendingLabel="Withdrawing…"
            >
              Move back to Draft to edit
            </SubmitButton>
          </form>
        )}

        {status === "CHANGES_REQUESTED" && (
          <p className="w-full text-xs text-ink-500">
            The client has asked for changes. Move this back to Draft, revise
            it, then publish again.
          </p>
        )}
      </div>
    </div>
  );
}
