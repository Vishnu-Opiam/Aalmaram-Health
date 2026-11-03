import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import { contactEmail, contactPhone } from "@/lib/env";
import { NEXT_STEPS } from "../content";
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
    <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
      <div>
        <p className="text-[16px] font-semibold uppercase tracking-[0.18em] text-gold-700">Free conversation</p>
        <h1 className="mt-3 font-display text-[38px] font-medium leading-[1.1] tracking-tight text-banyan-900 sm:text-[50px]">
          Talk to a person about your trip
        </h1>
        <p className="mt-4 max-w-2xl text-[20px] leading-relaxed text-ink-700">
          It is free, there is no obligation, and you will speak with someone who knows Kerala and our providers.
        </p>
        <div className="mt-10 rounded-[28px] bg-white p-6 ring-1 ring-kasavu-200 sm:p-8">
          <TalkForm />
        </div>
      </div>

      <aside className="space-y-8 lg:pt-28">
        <div className="rounded-[28px] bg-banyan-900 p-6 text-white sm:p-8">
          <h2 className="text-[21px] font-semibold text-gold-300">What happens next</h2>
          <ol className="mt-6 space-y-6">
            {NEXT_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-300/60 font-display text-[19px] text-gold-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[19px] font-semibold">{step.title}</p>
                  <p className="mt-1 leading-relaxed text-white/85">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {(phone || email) && (
          <div className="rounded-[28px] bg-kasavu-100 p-6 sm:p-8">
            <h2 className="text-[21px] font-semibold text-ink-900">Prefer to call or write?</h2>
            <ul className="mt-4 space-y-3">
              {phone && (
                <li>
                  <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-12 items-center gap-3 text-[19px] font-semibold text-banyan-900 underline underline-offset-4">
                    <Phone className="h-5 w-5 text-gold-700" aria-hidden="true" /> {phone}
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}?subject=${encodeURIComponent("Free call with Aalmaram Health")}`} className="inline-flex min-h-12 items-center gap-3 break-all text-[19px] font-semibold text-banyan-900 underline underline-offset-4">
                    <Mail className="h-5 w-5 shrink-0 text-gold-700" aria-hidden="true" /> {email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}

        <p className="px-2 text-[17px] leading-relaxed text-ink-700">
          We are a concierge, not a clinic, and we do not give medical advice. If you need urgent care, please contact
          your local services.
        </p>
      </aside>
    </div>
  );
}
