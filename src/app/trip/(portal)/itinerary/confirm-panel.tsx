"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { formatMoney } from "@/domain/itineraries/pricing";
import { idleState, type FormState } from "@/lib/validation/form";

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
    <section aria-labelledby="confirm-heading" className="rounded-lg border border-sand-200 bg-white p-6 sm:p-8">
      <h2 id="confirm-heading" className="font-serif text-2xl text-ink-900">
        Happy with your trip?
      </h2>
      <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-600">
        When you confirm, we lock your itinerary at <strong>{formatMoney(total, currency)}</strong> for {blockCount}{" "}
        {blockCount === 1 ? "activity" : "activities"}. We ask for payment next, and only then contact the providers
        to book. After confirming, changes go through your relationship manager.
      </p>
      <form
        action={dispatch}
        className="mt-5"
        onSubmit={(event) => {
          if (!window.confirm("Confirm and lock your itinerary? Further changes will go through your relationship manager.")) {
            event.preventDefault();
          }
        }}
      >
        <FormFeedback state={state} className="mb-3" />
        <input type="hidden" name="tripId" value={tripId} />
        <SubmitButton size="lg" pendingLabel="Confirming…" disabled={blockCount === 0}>
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Confirm my itinerary
        </SubmitButton>
      </form>
    </section>
  );
}
