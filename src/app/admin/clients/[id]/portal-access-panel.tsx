"use client";

import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import { setClientPasswordAction } from "../actions";

/**
 * Staff create the client's portal login: the email is the client record's,
 * the password is typed here and shared with the client in person or by phone.
 * Saving a new one signs the client out of every device.
 */
export function PortalAccessPanel({
  clientId,
  clientEmail,
  signInUrl,
  passwordSetAt,
  lastLoginAt,
}: {
  clientId: string;
  clientEmail: string;
  signInUrl: string;
  passwordSetAt: string | null;
  lastLoginAt: string | null;
}) {
  const [state, action] = useActionState(setClientPasswordAction, idleState);
  useActionRedirect(state);

  return (
    <div className="space-y-3">
      {passwordSetAt ? (
        <dl className="space-y-1.5 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-400">Login email</dt>
            <dd className="truncate text-ink-700">{clientEmail}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-400">Password set</dt>
            <dd className="text-ink-700">{passwordSetAt}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-400">Last portal sign-in</dt>
            <dd className="text-ink-700">{lastLoginAt ?? "Never"}</dd>
          </div>
        </dl>
      ) : (
        <Alert tone="info">
          This client cannot sign in yet. Set a password, then share it with them.
        </Alert>
      )}

      <FormFeedback state={state} />

      <form action={action} className="space-y-3">
        <input type="hidden" name="clientId" value={clientId} />
        <Field
          label={passwordSetAt ? "New password" : "Password"}
          htmlFor="client-password"
          required
          errors={state.fieldErrors.password}
          hint="At least 10 characters. Shown as you type so you can read it out."
        >
          <Input
            id="client-password"
            name="password"
            type="text"
            autoComplete="off"
            spellCheck={false}
            required
            minLength={10}
            invalid={Boolean(state.fieldErrors.password)}
          />
        </Field>
        <SubmitButton
          variant={passwordSetAt ? "secondary" : "primary"}
          size="sm"
          className="w-full"
          pendingLabel="Saving…"
        >
          {passwordSetAt ? "Reset password" : "Create login"}
        </SubmitButton>
      </form>

      <p className="text-xs text-ink-400">
        The client signs in at {signInUrl} with {clientEmail}.
        {passwordSetAt && " Resetting signs them out of every device."}
      </p>
    </div>
  );
}
