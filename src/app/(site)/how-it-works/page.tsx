import type { Metadata } from "next";
import { Band, BookButton, ClosingCta, Faq, frame, PageHero, Photo, Points } from "@/components/site/blocks";
import { cn } from "@/lib/utils";
import { faqFor, HOW_IT_WORKS_PAGE as PAGE, PHOTOS, PRICING, STEPS } from "../content";

export const metadata: Metadata = {
  title: { absolute: "How it works · Aalmaram Health" },
  description: PAGE.intro,
};

// One photograph per step, of the trip the step leads to.
const STEP_PHOTOS = [PHOTOS.lake, PHOTOS.mortar, PHOTOS.kochi, PHOTOS.canal];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero title={PAGE.title} intro={PAGE.intro} photo={PHOTOS.prow} short>
        <BookButton />
      </PageHero>

      {/* Each step on its own row: the verb, then who does what and what you end up with. */}
      <section aria-labelledby="steps-title" className={cn(frame, "bg-mist py-28 text-mist-ink md:py-36")}>
        <h2 id="steps-title" className="site-head">Four steps, one person beside you</h2>
        <ol className="mt-20 space-y-24 md:space-y-32">
          {STEPS.map((step, i) => (
            <li key={step.verb} data-rise className="grid gap-6 md:grid-cols-12 md:gap-x-6">
              <p data-split="chars" className="site-display text-[clamp(4.5rem,9vw,9rem)] md:col-span-4" aria-hidden="true">{step.verb}</p>
              <Photo photo={STEP_PHOTOS[i]} sizes="(min-width: 768px) 25vw, 60vw" className="aspect-[4/5] w-3/5 md:order-last md:col-span-3 md:col-start-10 md:w-full" />
              <div className="md:col-span-5 md:col-start-5">
                <h3 className="text-[24px] font-medium">{step.title}</h3>
                <dl className="mt-6 space-y-5">
                  {[
                    ["You", PAGE.steps[i].you],
                    ["We", PAGE.steps[i].we],
                    ["You receive", PAGE.steps[i].get],
                  ].map(([label, text]) => (
                    <div key={label}>
                      <dt className="text-[16px] text-mist-muted">{label}</dt>
                      <dd className="mt-1 leading-relaxed">{text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Band id="trip-page" title="Your own trip page" intro="Open it on a computer, tablet or phone. It is where your plan lives, before, during and after your trip.">
        <Points items={PAGE.tripPage} />
      </Band>

      <Band id="charges" title="How we charge" tone="raised">
        <Points items={PRICING} />
        <h3 className="mt-20 text-[21px] font-medium">What we don&apos;t do</h3>
        <ul data-rise="left" className="mt-4 space-y-3 text-[20px] leading-snug">
          {PAGE.weDont.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Band>

      <Band id="faq" title="Questions about how it works" tone="mist">
        <Faq items={faqFor(PAGE.faq)} />
      </Band>

      <ClosingCta photo={PHOTOS.tea} />
    </>
  );
}
