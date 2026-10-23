"use client";

import { useActionState } from "react";
import { CheckCheck } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { pill } from "@/components/portal/ui";
import { idleState, type FormState } from "@/lib/validation/form";

/** "Yes, confirm my trip": locks the itinerary ahead of payment and booking. Asked once, on the review page. */
export function ConfirmPanel({
  tripId,
  action,
}: {
  tripId: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  return (
    <form action={dispatch} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="tripId" value={tripId} />
      <SubmitButton size="lg" pendingLabel="Confirming…" className={pill("primary", "min-h-14 px-8 text-[18px]")}>
        <CheckCheck className="h-6 w-6" aria-hidden="true" /> Yes, confirm my trip
      </SubmitButton>
      <Link href={`/trip/itinerary?trip=${tripId}`} className={pill("secondary", "min-h-14")}>
        Not yet — keep planning
      </Link>
      <FormFeedback state={state} className="w-full" />
    </form>
  );
}
