"use client";

import { useActionState } from "react";
import { FormFeedback, useActionRedirect } from "@/components/ui/form-status";
import { pill } from "@/components/portal/ui";
import { idleState } from "@/lib/validation/form";
import { clientSignInAction } from "../actions";

const input =
  "mt-2 block min-h-14 w-full rounded-2xl border-2 border-sand-300 bg-white px-4 text-[19px] text-ink-900 focus:border-forest-800 focus:outline-none aria-[invalid=true]:border-danger-600";

/** Large fields and plain labels: most clients are 50+ (docs/platform/portal-ux.md). */
export function SignInForm() {
  const [state, action, pending] = useActionState(clientSignInAction, idleState);
  useActionRedirect(state);

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormFeedback state={state} />
      <label className="block text-[18px] font-semibold text-ink-900">
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
          <span role="alert" className="mt-1 block text-[16px] font-normal text-danger-600">
            {state.fieldErrors.email.join(" ")}
          </span>
        )}
      </label>
      <label className="block text-[18px] font-semibold text-ink-900">
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
          <span role="alert" className="mt-1 block text-[16px] font-normal text-danger-600">
            {state.fieldErrors.password.join(" ")}
          </span>
        )}
      </label>
      <button type="submit" disabled={pending} className={pill("primary", "w-full")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
