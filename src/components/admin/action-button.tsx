"use client";

import { useActionState } from "react";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";

/**
 * A single-purpose button that runs a Server Action and then navigates.
 *
 * Every mutation in this app reports where to go next (FormState.redirectTo)
 * and the client performs the navigation once the action has settled. Nothing
 * relies on `revalidatePath` or an implicit post-action refresh - see
 * lib/refresh-url.ts for why.
 */
export function ActionButton({
  action,
  fields,
  children,
  pendingLabel = "Working…",
  variant = "secondary",
  size = "sm",
  confirm,
  className,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>;
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "quiet";
  size?: "sm" | "md" | "lg";
  confirm?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  useActionRedirect(state);

  return (
    <div className={className}>
      {state.status === "error" && (
        <FormFeedback state={state} className="mb-2" />
      )}
      <form
        action={formAction}
        onSubmit={(event) => {
          if (confirm && !window.confirm(confirm)) event.preventDefault();
        }}
      >
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <SubmitButton variant={variant} size={size} pendingLabel={pendingLabel}>
          {children}
        </SubmitButton>
      </form>
    </div>
  );
}
