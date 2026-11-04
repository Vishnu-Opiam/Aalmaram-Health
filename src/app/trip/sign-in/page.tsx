import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/auth/guards";
import { Alert } from "@/components/ui/primitives";
import { PortalBrand } from "@/components/portal/ui";
import { param } from "@/lib/utils";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in to your trip" };

const MESSAGES: Record<string, { tone: "warning" | "danger"; text: string }> = {
  signed_out: {
    tone: "warning",
    text: "You have been signed out. Sign in again to return to your trip.",
  },
};

export default async function TripSignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await getCurrentClient();
  if (client) redirect("/trip");

  const message = MESSAGES[param(await searchParams, "error")];

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:py-16">
      <PortalBrand />
      <h1 className="mt-10 font-display text-[38px] font-semibold leading-tight tracking-tight text-ink-900">
        Sign in to your trip
      </h1>
      <p className="mt-4 text-[19px] leading-relaxed text-ink-700">
        Use your email address and the password your Aalmaram coordinator gave you.
      </p>

      {message && (
        <Alert tone={message.tone} className="mt-6">
          {message.text}
        </Alert>
      )}

      <div className="portal-card mt-8 p-6 sm:p-7">
        <SignInForm />
      </div>

      <p className="mt-6 text-[17px] leading-relaxed text-ink-700">
        Forgotten your password? Reply to any message from your coordinator and they will set a new one for you.
      </p>
    </div>
  );
}
