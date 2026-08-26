"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Field, Input } from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, idleState);
  useActionRedirect(state);
  // Read on the client - see NewItineraryForm for why.
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      <FormFeedback state={state} />

      <Field
        label="Email"
        htmlFor="email"
        required
        errors={state.fieldErrors.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.values?.email ?? ""}
          invalid={Boolean(state.fieldErrors.email)}
          placeholder="you@aalmaram.example"
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        errors={state.fieldErrors.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(state.fieldErrors.password)}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
