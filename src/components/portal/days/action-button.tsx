"use client";

import { useActionState } from "react";
import { useActionRedirect } from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";

export type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * One button that posts a few hidden fields to a portal action and follows
 * its redirect: Undo, Remove, "Ask Priya about this", a one-tap time fix.
 * The pending label stands in while it works; an error shows under it.
 */
export function ActionButton({
  action,
  fields,
  children,
  pendingLabel = "One moment…",
  className,
  formClassName,
  errorClassName = "text-danger-600",
  label,
}: {
  action: Action;
  fields: Record<string, string | null | undefined>;
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  formClassName?: string;
  errorClassName?: string;
  /** Accessible name when the visible words need context ("Undo removing Dinner…"). */
  label?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, idleState);
  useActionRedirect(state);
  return (
    <form action={dispatch} className={formClassName}>
      {Object.entries(fields).map(([name, value]) => (value == null ? null : <input key={name} type="hidden" name={name} value={value} />))}
      <button type="submit" disabled={pending} aria-busy={pending} aria-label={pending ? undefined : label} className={className}>
        {pending ? pendingLabel : children}
      </button>
      {state.status === "error" && state.message && (
        <p role="alert" className={cn("mt-2 text-[16px] leading-snug", errorClassName)}>
          {state.message}
        </p>
      )}
    </form>
  );
}

/** The Undo button inside the night toast. */
export const undoClass =
  "inline-flex min-h-12 items-center rounded-full border-2 border-brass px-5 text-[16px] font-medium text-brass transition-colors hover:bg-brass hover:text-night disabled:opacity-60";
