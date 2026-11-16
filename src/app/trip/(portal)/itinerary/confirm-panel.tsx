"use client";

import { useActionState } from "react";
import { buttonClass } from "@/components/portal/kit/button";
import { FormFeedback, useActionRedirect } from "@/components/ui/form-status";
import { AppLink as Link } from "@/components/ui/primitives";
import { idleState, type FormState } from "@/lib/validation/form";

/** "Yes, confirm my trip": locks the itinerary ahead of payment and booking. Asked once, on the review page. */
export function ConfirmPanel({
  tripId,
  action,
}: {
  tripId: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, dispatch, pending] = useActionState(action, idleState);
  useActionRedirect(state);
  return (
    <form action={dispatch} className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <input type="hidden" name="tripId" value={tripId} />
      <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary", "w-full px-9 text-[18px] min-[480px]:w-auto")}>
        {pending ? "Confirming…" : "Yes, confirm my trip"}
      </button>
      <Link href={`/trip/itinerary?trip=${tripId}`} className={buttonClass("quiet")}>
        Not yet — keep planning
      </Link>
      <FormFeedback state={state} className="w-full" />
    </form>
  );
}
