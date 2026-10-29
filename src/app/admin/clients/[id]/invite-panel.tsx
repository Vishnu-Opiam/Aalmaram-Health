"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Input } from "@/components/ui/primitives";
import {
  FormFeedback,
  SubmitButton,
  useActionRedirect,
} from "@/components/ui/form-status";
import { idleState } from "@/lib/validation/form";
import { issueClientInviteAction } from "../actions";

/**
 * The token is stored hashed, so the link is shown once, right after it is
 * issued, and only while email is log-only (otherwise it goes by email).
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
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const expired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <div className="space-y-3">
      {!issuedAt && !state.link && (
        <Alert tone="info">
          This client has no portal access yet. Send an invitation so they can
          see the feed and build their itinerary.
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

      {state.link && (
        <div className="space-y-1.5">
          <label htmlFor="invite-link" className="text-xs text-ink-400">
            Portal link: copy it and send it to the client
          </label>
          <div className="flex gap-2">
            <Input id="invite-link" readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                // Clipboard can be refused; selecting the text leaves Ctrl+C.
                const select = () => (document.getElementById("invite-link") as HTMLInputElement).select();
                navigator.clipboard.writeText(state.link!).then(() => setCopiedLink(state.link!), select);
              }}
            >
              {copiedLink === state.link ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

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
