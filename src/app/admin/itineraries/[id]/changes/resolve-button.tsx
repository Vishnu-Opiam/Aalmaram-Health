"use client";

import { useActionState } from "react";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import { resolveChangeRequestAction } from "../../actions";

export function ResolveButton({
  changeRequestId,
}: {
  changeRequestId: string;
}) {
  const [state, action] = useActionState(resolveChangeRequestAction, idleState);
  useActionRedirect(state);

  return (
    <div className="space-y-2">
      <FormFeedback state={state} />
      <form action={action}>
        <input type="hidden" name="changeRequestId" value={changeRequestId} />
        <SubmitButton variant="secondary" size="sm" pendingLabel="Resolving…">
          Mark resolved
        </SubmitButton>
      </form>
    </div>
  );
}
