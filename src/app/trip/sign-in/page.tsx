import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/auth/guards";
import { Alert } from "@/components/ui/primitives";
import { Photo } from "@/components/portal/kit/photo";
import { PortalBrand } from "@/components/portal/ui";
import { PHOTOS } from "@/app/(site)/content";
import { param } from "@/lib/utils";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in to your trip" };

const MESSAGES: Record<string, { tone: "warning" | "danger"; text: string }> = {
  signed_out: {
    tone: "warning",
    text: "You have been signed out. Sign in again to return to your trip.",
  },
};

const photo = PHOTOS.lake;

/**
 * Split on night: the canoe at dawn on the left (on top, on phones), the
 * form on the right with paper fields and the one brass action.
 */
export default async function TripSignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await getCurrentClient();
  if (client) redirect("/trip");

  const message = MESSAGES[param(await searchParams, "error")];

  return (
    <main id="trip-content" className="pk-night grid flex-1 md:min-h-svh md:grid-cols-12">
      <Photo
        photo={photo}
        sizes="(min-width: 768px) 58vw, 100vw"
        priority
        shutter
        scrim={["top", "bottom"]}
        className="h-[38svh] min-h-64 md:col-span-7 md:h-auto"
        overlayClassName="flex-col justify-between p-5 min-[390px]:p-6 md:p-10 lg:p-14"
      >
        <a href="/" className="inline-flex min-h-12 items-center self-start" aria-label="Aalmaram Health — home">
          <PortalBrand />
        </a>
        <p className="pk-h1 max-w-[12ch] max-md:hidden">Your trip is waiting.</p>
      </Photo>

      <div className="flex flex-col px-5 pb-8 pt-10 min-[390px]:px-6 md:col-span-5 md:px-12 md:pt-14 lg:px-16 xl:px-20">
        <div className="my-auto w-full max-w-md md:py-10">
          <h1 className="pk-h2">Sign in to your trip</h1>
          <p className="mt-4 text-[18px] leading-relaxed text-night-muted">
            Use your email address and the password your Aalmaram coordinator gave you.
          </p>

          {message && (
            <Alert tone={message.tone} className="mt-6 rounded-[6px] text-[17px]">
              {message.text}
            </Alert>
          )}

          <div className="mt-9">
            <SignInForm />
          </div>

          <p className="mt-7 text-[17px] leading-relaxed text-night-muted">
            Forgotten your password? Reply to any message from your coordinator and they will set a new one for you.
          </p>
        </div>

        <div className="mt-12 max-w-md space-y-2 text-[15px] leading-relaxed text-night-muted">
          <p>
            Aalmaram Health coordinates your trip with independent providers in Kerala; it does not provide medical
            advice, diagnosis or treatment. Clinical decisions rest with the providers who care for you.
          </p>
          <p>
            Photograph by{" "}
            <a href={photo.href} className="underline underline-offset-2 hover:text-night-ink" rel="noopener noreferrer">
              {photo.credit}
            </a>{" "}
            on Unsplash.
          </p>
        </div>
      </div>
    </main>
  );
}
