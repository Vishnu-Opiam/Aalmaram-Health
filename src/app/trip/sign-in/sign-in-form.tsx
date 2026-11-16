"use client";

import { useActionState } from "react";
import { FormFeedback, useActionRedirect } from "@/components/ui/form-status";
import { buttonClass } from "@/components/portal/kit/button";
import { idleState } from "@/lib/validation/form";
import { clientSignInAction } from "../actions";

// Paper fields on the night ground: 56px tall, 18px text, a 2px ink edge on focus.
const input =
  "mt-2.5 block min-h-14 w-full rounded-[6px] border-2 border-transparent bg-paper px-4 text-[18px] text-mist-ink focus:border-brass focus:outline-none aria-[invalid=true]:border-danger-500";
const label = "block text-[17px] font-medium text-night-ink";
// Errors sit on paper so danger-600 keeps its contrast on night.
const fieldError = "mt-2 block rounded-[6px] bg-paper px-3 py-2 text-[16px] font-normal text-danger-600";

/** Large fields and plain labels: most clients are 55+. */
export function SignInForm() {
  const [state, action, pending] = useActionState(clientSignInAction, idleState);
  useActionRedirect(state);

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormFeedback state={state} className="rounded-[6px] text-[17px]" />
      <label className={label}>
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.values?.email ?? ""}
          aria-invalid={Boolean(state.fieldErrors.email)}
          className={input}
        />
        {state.fieldErrors.email && (
          <span role="alert" className={fieldError}>
            {state.fieldErrors.email.join(" ")}
          </span>
        )}
      </label>
      <label className={label}>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors.password)}
          className={input}
        />
        {state.fieldErrors.password && (
          <span role="alert" className={fieldError}>
            {state.fieldErrors.password.join(" ")}
          </span>
        )}
      </label>
      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
