import type { Metadata } from "next";
import Image from "next/image";
import { Info } from "lucide-react";
import { JourneyScene } from "@/components/site/journey-scene";
import { Faq, MobileCta, PageHero, photoUrl, Section, TalkBand } from "@/components/site/blocks";
import { faqFor, HERO, PHOTOS, WHY_KERALA_PAGE as PAGE } from "../content";

export const metadata: Metadata = {
  title: { absolute: "Why Kerala · Aalmaram Health" },
  description: PAGE.intro,
};

/** The "beautiful page" from the 2 Nov call: Kerala itself, with the quality of care first. */
export default function WhyKeralaPage() {
  return (
    <>
      <PageHero eyebrow="The place" title={PAGE.title} intro={PAGE.intro} photo={PHOTOS.houseboat} />

      <Section id="care" eyebrow="Care" title="Good private care, explained plainly" intro={HERO.context}>
        <ul className="grid gap-5 sm:grid-cols-2">
          {PAGE.care.map((item) => (
            <li key={item.title} className="site-reveal rounded-[28px] bg-white p-6 ring-1 ring-kasavu-200 sm:p-8">
              <span className="block h-px w-12 bg-gold-500" aria-hidden="true" />
              <h3 className="mt-4 text-[21px] font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-700">{item.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <section id="ayurveda" aria-labelledby="ayurveda-title" className="scroll-mt-24 bg-kasavu-100">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
          <div data-clip className="relative aspect-[4/3] overflow-hidden rounded-[28px]">
            <Image src={photoUrl(PHOTOS.oils.src, 1200)} alt={PHOTOS.oils.alt} fill sizes="(min-width: 1024px) 45vw, 92vw" className="site-zoom object-cover" />
          </div>
          <div className="site-reveal">
            <p className="text-[16px] font-semibold uppercase tracking-[0.18em] text-gold-700">Wellness</p>
            <h2 id="ayurveda-title" className="mt-3 font-display text-[32px] font-medium leading-[1.15] tracking-tight text-banyan-900 sm:text-[42px]">
              {PAGE.ayurveda.title}
            </h2>
            <p className="mt-4 text-[19px] leading-relaxed text-ink-700 md:text-[20px]">{PAGE.ayurveda.text}</p>
            <p className="mt-6 flex gap-3 rounded-3xl bg-white p-5 leading-relaxed text-ink-800 ring-1 ring-kasavu-200">
              <Info className="mt-1 h-5 w-5 shrink-0 text-gold-700" aria-hidden="true" /> {PAGE.ayurveda.note}
            </p>
          </div>
        </div>
      </section>

      <JourneyScene
        id="places"
        eyebrow="Places"
        title="Backwaters, hills, coast and history"
        intro="Culture is part of every trip, at the pace you choose. A few of the places our clients love."
        panels={PAGE.places.filter((p) => p.photo).map((p) => ({ when: "Kerala", ...p }))}
        footer={
          <ul className="space-y-6">
            {PAGE.places
              .filter((p) => !p.photo)
              .map((p) => (
                <li key={p.title}>
                  <h3 className="font-display text-[28px] text-gold-300">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-white/85">{p.text}</p>
                </li>
              ))}
          </ul>
        }
      />

      <Section id="seasons" eyebrow="When to go" title="Kerala through the year" tint>
        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PAGE.seasons.map((season) => (
            <li key={season.months} className="site-reveal rounded-[28px] bg-white p-6 ring-1 ring-kasavu-200">
              <h3 className="font-display text-[22px] font-medium text-banyan-900">{season.months}</h3>
              <p className="mt-2 leading-relaxed text-ink-700">{season.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="getting-there" eyebrow="Getting there" title="Practical things to know">
        <dl className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {PAGE.travel.map((item) => (
            <div key={item.title} className="site-reveal border-b border-kasavu-200 pb-6">
              <dt className="text-[20px] font-semibold text-ink-900">{item.title}</dt>
              <dd className="mt-2 leading-relaxed text-ink-700">{item.text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <TalkBand />

      <Section id="faq" eyebrow="Questions" title="Questions about travelling">
        <Faq items={faqFor(["Is Kerala safe to travel to?", "Do I need a visa?", "What does a whole trip cost?"])} />
      </Section>

      <MobileCta />
    </>
  );
}
