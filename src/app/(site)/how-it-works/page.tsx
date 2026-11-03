import type { Metadata } from "next";
import { X } from "lucide-react";
import { Faq, MobileCta, NumberedList, PageHero, Section, TalkBand } from "@/components/site/blocks";
import { StepsScene } from "@/components/site/steps-scene";
import { faqFor, HOW_IT_WORKS_PAGE as PAGE, PHOTOS, PRICING, STEPS } from "../content";

export const metadata: Metadata = {
  title: { absolute: "How it works · Aalmaram Health" },
  description: PAGE.intro,
};

function Detail({ label, text }: { label: string; text: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-[17px] font-semibold text-gold-700">{label}</dt>
      <dd className="leading-relaxed text-ink-800">{text}</dd>
    </div>
  );
}

export default function HowItWorksPage() {
  const steps = STEPS.map((step, i) => ({
    ...step,
    children: (
      <dl className="mt-5 space-y-3 rounded-3xl bg-white p-5 ring-1 ring-kasavu-200">
        <Detail label="You" text={PAGE.steps[i].you} />
        <Detail label="We" text={PAGE.steps[i].we} />
        <Detail label="You receive" text={PAGE.steps[i].get} />
      </dl>
    ),
  }));

  return (
    <>
      <PageHero eyebrow="Four steps" title={PAGE.title} intro={PAGE.intro} photo={PHOTOS.canoe} />

      <Section id="steps" eyebrow="Step by step" title="Four steps, with a person beside you at each one" tint>
        <StepsScene steps={steps} />
      </Section>

      <Section id="trip-page" eyebrow="Your trip page" title="Everything in one place" intro="After the first conversation you get a private trip page. It is where your plan lives until you are home.">
        <div className="grid gap-10 lg:grid-cols-2">
          <NumberedList items={PAGE.tripPage} />
          <div className="site-reveal self-start rounded-[28px] bg-kasavu-100 p-6 sm:p-8">
            <h3 className="text-[21px] font-semibold text-ink-900">What we don&apos;t do</h3>
            <ul className="mt-5 space-y-4">
              {PAGE.weDont.map((line) => (
                <li key={line} className="flex gap-3 leading-relaxed text-ink-800">
                  <X className="mt-1 h-5 w-5 shrink-0 text-laterite-600" aria-hidden="true" /> {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="pricing" eyebrow="Prices" title="Transparent pricing" tint>
        <NumberedList items={PRICING} />
      </Section>

      <TalkBand />

      <Section id="faq" eyebrow="Questions" title="Questions about the process">
        <Faq items={faqFor(PAGE.faq)} />
      </Section>

      <MobileCta />
    </>
  );
}
