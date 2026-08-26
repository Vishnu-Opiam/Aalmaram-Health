"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button } from "@/components/ui/primitives";
import type { FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";

/**
 * Navigates once an action has reported success with a destination.
 *
 * See the note on FormState.redirectTo: calling redirect() inside an action
 * that backs useActionState can deadlock React's transition, leaving the form
 * stuck on its pending label even though the write succeeded. Doing the
 * navigation here - after the action state has settled - avoids that entirely.
 */
export function useActionRedirect(state: FormState) {
  // Guards against navigating twice for one result. A second assign() would
  // abort the first, which leaves the browser in a confusing half-navigated
  // state (and made end-to-end navigation flaky).
  const navigatedTo = useRef<string | null>(null);

  useEffect(() => {
    if (state.status !== "success" || !state.redirectTo) return;
    if (navigatedTo.current === state.redirectTo) return;
    navigatedTo.current = state.redirectTo;

    // A full document navigation, deliberately, rather than router.push() or
    // router.refresh().
    //
    // Next's client-side router does not reliably complete a transition that
    // was started from a Server Action here: the write commits, the server
    // renders and serves the destination, and the browser still sits on the old
    // screen with the submit button stuck on its pending label. It is
    // intermittent, which is worse than consistently broken - an admin would
    // sometimes see a stale itinerary and not know it.
    //
    // These are internal, low-traffic screens. One page load per mutation is a
    // cheap price for always showing the truth.
    window.location.assign(state.redirectTo);
  }, [state]);
}

/**
 * Submit button that reflects the pending state of its enclosing form.
 * Every mutating form in the product uses this so "loading" is never missed.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  formAction,
  name,
  value,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "quiet";
  size?: "sm" | "md" | "lg";
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      formAction={formAction}
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}

/** Renders the message half of a FormState (success or error). */
export function FormFeedback({
  state,
  className,
}: {
  state: FormState;
  className?: string;
}) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <Alert
      tone={state.status === "success" ? "success" : "danger"}
      className={cn(className)}
    >
      {state.message}
    </Alert>
  );
}
