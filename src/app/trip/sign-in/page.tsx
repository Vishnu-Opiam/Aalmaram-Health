import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/auth/guards";
import { Alert } from "@/components/ui/primitives";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Access your journey" };

const MESSAGES: Record<string, { tone: "warning" | "danger"; text: string }> = {
  invalid: {
    tone: "danger",
    text: "That link is not valid. It may have been mistyped, or replaced by a newer one.",
  },
  expired: {
    tone: "warning",
    text: "That link has expired. Please ask your Aalmaram coordinator for a fresh one.",
  },
  inactive: {
    tone: "warning",
    text: "This journey is no longer active. Please contact your Aalmaram coordinator.",
  },
  rate_limited: {
    tone: "warning",
    text: "Too many attempts from this connection. Please wait a few minutes and try again.",
  },
  signed_out: {
    tone: "warning",
    text: "You have been signed out. Open your personal link again to return.",
  },
};

export default async function TripSignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await getCurrentClient();
  if (client) redirect("/trip");

  const error = param(await searchParams, "error");
  const message = MESSAGES[error];

  return (
    <div className="mx-auto max-w-xl px-5 py-20">
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-400">
        Your journey
      </p>
      <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight text-ink-900">
        Open your personal link
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
        Your Aalmaram coordinator sends you a personal link by email. Opening
        that link is how you reach your proposal - there is no password to
        remember.
      </p>

      {message && (
        <Alert tone={message.tone} className="mt-6">
          {message.text}
        </Alert>
      )}

      <div className="mt-8 rounded-lg border border-sand-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-ink-900">
          Cannot find your link?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Search your inbox for an email from Aalmaram Health. If you still
          cannot find it, reply to any message from your coordinator and we will
          send a new one. For your security we cannot issue a link from this
          page.
        </p>
      </div>
    </div>
  );
}
