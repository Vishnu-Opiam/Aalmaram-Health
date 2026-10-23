import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/auth/guards";
import { Alert } from "@/components/ui/primitives";
import { PortalBrand } from "@/components/portal/ui";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Open your trip" };

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
    text: "This trip is no longer active. Please contact your Aalmaram coordinator.",
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
    <div className="mx-auto max-w-xl px-5 py-12 sm:py-16">
      <PortalBrand />
      <h1 className="mt-10 font-display text-[38px] font-semibold leading-tight tracking-tight text-ink-900">
        Open your personal link
      </h1>
      <p className="mt-4 text-[19px] leading-relaxed text-ink-700">
        Your Aalmaram coordinator sends you a personal link by email. Opening
        that link is how you reach your trip - there is no password to
        remember.
      </p>

      {message && (
        <Alert tone={message.tone} className="mt-6">
          {message.text}
        </Alert>
      )}

      <div className="portal-card mt-8 p-6 sm:p-7">
        <h2 className="text-[19px] font-semibold text-ink-900">
          Cannot find your link?
        </h2>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-700">
          Search your inbox for an email from Aalmaram Health. If you still
          cannot find it, reply to any message from your coordinator and we will
          send a new one. For your security we cannot issue a link from this
          page.
        </p>
      </div>
    </div>
  );
}
