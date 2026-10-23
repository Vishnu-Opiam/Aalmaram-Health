"use client";

import { useActionState } from "react";
import { CheckCheck } from "lucide-react";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { formatMoney } from "@/domain/itineraries/pricing";
import { idleState, type FormState } from "@/lib/validation/form";

/** "Confirm my itinerary": locks it ahead of payment and booking. */
export function ConfirmPanel({
  tripId,
  total,
  currency,
  blockCount,
  action,
}: {
  tripId: string;
  total: string;
  currency: string;
  blockCount: number;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  return (
    <form
      action={dispatch}
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
      onSubmit={(event) => {
        const message = `Confirm your trip at ${formatMoney(total, currency)} for ${blockCount} ${blockCount === 1 ? "activity" : "activities"}?\n\nWe then ask for payment and book each activity. After this, changes go through your relationship manager.`;
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="tripId" value={tripId} />
      <span className="text-[15px] text-ink-500">Happy with it? Nothing is booked until you confirm.</span>
      <SubmitButton size="lg" pendingLabel="Confirming…" disabled={blockCount === 0}>
        <CheckCheck className="h-5 w-5" aria-hidden="true" /> Confirm my itinerary
      </SubmitButton>
      <FormFeedback state={state} className="w-full" />
    </form>
  );
}
