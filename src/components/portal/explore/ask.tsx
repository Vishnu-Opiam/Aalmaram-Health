"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { talkToPersonAction } from "@/app/trip/actions";
import { buttonClass, type ButtonVariant } from "@/components/portal/kit";
import { useActionRedirect } from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { returnHere } from "./model";

/** A kit button that shows the form is working ("Adding…") and can't be pressed twice. */
export function Submit({
  children,
  pendingLabel,
  variant = "primary",
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending} className={buttonClass(variant, className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** A plain-words error under a form, on paper. */
export function FormError({ message, id }: { message: string | null; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-[17px] font-medium leading-snug text-danger-600">
      {message}
    </p>
  );
}

/**
 * "Ask Priya to arrange a visit" / "… to add this": tells the coordinator,
 * with the place or experience as ids only, and comes back to this page with
 * `asked=1` for the toast. Nothing is booked or promised.
 */
export function AskForm({
  tripId,
  vendorSlug,
  componentId,
  children,
  variant = "primary",
  className,
}: {
  tripId: string;
  vendorSlug?: string;
  componentId?: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  const [state, action] = useActionState(talkToPersonAction, idleState);
  useActionRedirect(state);
  return (
    <form
      action={action}
      className={cn("flex flex-col gap-3", className)}
      onSubmit={(e) => {
        // Where to come back to is only known in the browser (filters, search, the open place).
        (e.currentTarget.elements.namedItem("returnTo") as HTMLInputElement).value = returnHere();
      }}
    >
      <input type="hidden" name="tripId" value={tripId} />
      {vendorSlug && <input type="hidden" name="vendorSlug" value={vendorSlug} />}
      {componentId && <input type="hidden" name="componentId" value={componentId} />}
      <input type="hidden" name="returnTo" defaultValue="" />
      <Submit pendingLabel="Sending…" variant={variant}>
        {children}
      </Submit>
      <FormError message={state.status === "error" ? state.message : null} />
    </form>
  );
}
