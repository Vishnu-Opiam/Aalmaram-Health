import type { Metadata } from "next";
import { frame, Photo, telHref } from "@/components/site/blocks";
import { contactEmail, contactPhone } from "@/lib/env";
import { cn } from "@/lib/utils";
import { NEXT_STEPS, PHOTOS } from "../content";
import { TalkForm } from "./talk-form";

export const metadata: Metadata = {
  title: { absolute: "Book a free conversation · Aalmaram Health" },
  description: "Talk to a person about a health, wellness and culture trip to Kerala. Free, with no obligation.",
};

/** The one place every "Book a free conversation" button leads. */
export default function TalkPage() {
  const email = contactEmail();
  const phone = contactPhone();

  return (
    <div className={cn(frame, "grid gap-14 pb-28 pt-36 md:grid-cols-12 md:gap-x-6 md:pt-44")}>
      <div className="md:col-span-7">
        <div data-rise>
          <h1 className="site-head text-[clamp(2.4rem,1.4rem+3.6vw,4.75rem)]">Talk to a person about your trip</h1>
          <p className="site-lead mt-6 max-w-[36rem]">
            It is free, there is no obligation, and you will speak with someone who knows Kerala and our providers.
          </p>
        </div>
        <div className="mt-12 bg-mist p-6 text-mist-ink sm:p-10">
          <TalkForm />
        </div>
      </div>

      <aside className="md:col-span-4 md:col-start-9">
        <div className="md:sticky md:top-28">
          <Photo photo={PHOTOS.lake} sizes="(min-width: 768px) 30vw, 100vw" className="aspect-[4/3]" />
          <h2 className="mt-10 text-[21px] font-medium">What happens next</h2>
          <ol className="mt-5 space-y-5">
            {NEXT_STEPS.map((step) => (
              <li key={step.title}>
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 leading-relaxed text-night-muted">{step.text}</p>
              </li>
            ))}
          </ol>

          {(phone || email) && (
            <>
              <h2 className="mt-10 text-[21px] font-medium">Prefer to call or write?</h2>
              <ul className="mt-3 space-y-1">
                {phone && (
                  <li>
                    <a href={telHref(phone)} className="inline-flex min-h-12 items-center text-[19px] underline underline-offset-4">{phone}</a>
                  </li>
                )}
                {email && (
                  <li>
                    <a href={`mailto:${email}?subject=${encodeURIComponent("Free call with Aalmaram Health")}`} className="inline-flex min-h-12 items-center break-all text-[19px] underline underline-offset-4">
                      {email}
                    </a>
                  </li>
                )}
              </ul>
            </>
          )}

          <p className="mt-10 text-[16px] leading-relaxed text-night-muted">
            We are a concierge, not a clinic, and we do not give medical advice. If you need urgent care, please contact
            your local services.
          </p>
        </div>
      </aside>
    </div>
  );
}
