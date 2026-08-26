"use client";

import { useActionState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import { generateReportAction } from "../../actions";

/**
 * Generates (or regenerates) the What-to-Expect report.
 *
 * Regenerating overwrites admin edits, so it asks first. Navigation happens via
 * useActionRedirect once the action has settled - see FormState.redirectTo.
 */
export function GenerateReportButton({
  itineraryId,
  hasReport,
  size = "sm",
}: {
  itineraryId: string;
  hasReport: boolean;
  size?: "sm" | "md";
}) {
  const [state, action] = useActionState(generateReportAction, idleState);
  useActionRedirect(state);

  return (
    <div className="space-y-2">
      {state.status === "error" && <FormFeedback state={state} />}
      <form
        action={action}
        onSubmit={(event) => {
          if (
            hasReport &&
            !window.confirm(
              "Regenerating rebuilds the report from the itinerary and discards your edits. Continue?",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="itineraryId" value={itineraryId} />
        <SubmitButton
          variant={hasReport ? "secondary" : "primary"}
          size={size}
          pendingLabel="Generating…"
        >
          {hasReport ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Regenerate from itinerary
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Generate report
            </>
          )}
        </SubmitButton>
      </form>
    </div>
  );
}
