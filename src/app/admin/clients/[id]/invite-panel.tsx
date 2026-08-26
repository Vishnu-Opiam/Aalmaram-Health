"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import { issueClientInviteAction } from "../actions";

/**
 * The raw invitation token is never rendered here. The admin sends the link by
 * email; the development email transport prints it to the server console and
 * .mail.log, which is how it is retrieved locally.
 */
export function InvitePanel({
  clientId,
  clientEmail,
  issuedAt,
  expiresAt,
  lastLoginAt,
}: {
  clientId: string;
  clientEmail: string;
  issuedAt: string | null;
  expiresAt: string | null;
  lastLoginAt: string | null;
}) {
  const [state, action] = useActionState(issueClientInviteAction, idleState);
  useActionRedirect(state);
  const expired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <div className="space-y-3">
      {!issuedAt && (
        <Alert tone="info">
          This client has no portal access yet. Send an invitation so they can
          open their proposal once it is published.
        </Alert>
      )}

      {issuedAt && (
        <dl className="space-y-1.5 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-400">Invitation issued</dt>
            <dd className="text-ink-700">{issuedAt}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-400">Link expires</dt>
            <dd className={expired ? "text-danger-600" : "text-ink-700"}>
              {expiresAt}
              {expired && " (expired)"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-400">Last portal sign-in</dt>
            <dd className="text-ink-700">{lastLoginAt ?? "Never"}</dd>
          </div>
        </dl>
      )}

      <FormFeedback state={state} />

      <form action={action}>
        <input type="hidden" name="clientId" value={clientId} />
        <SubmitButton
          variant={issuedAt ? "secondary" : "primary"}
          size="sm"
          className="w-full"
          pendingLabel="Sending…"
        >
          {issuedAt ? "Re-issue invitation link" : "Send invitation link"}
        </SubmitButton>
      </form>

      <p className="text-xs text-ink-400">
        Sends a personal link to {clientEmail}. Re-issuing invalidates the
        previous link immediately.
      </p>
    </div>
  );
}
