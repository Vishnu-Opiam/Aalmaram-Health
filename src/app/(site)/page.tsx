import type { Metadata } from "next";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { BackwaterStory } from "@/components/site/backwater-story";
import { Faq, MobileCta, MoreLink, photoUrl, Section, TalkBand } from "@/components/site/blocks";
import { ChecklistScene } from "@/components/site/checklist-scene";
import { JourneyScene } from "@/components/site/journey-scene";
import { StepsScene } from "@/components/site/steps-scene";
import { YourMix } from "@/components/site/your-mix";
import { formatPriceRange } from "@/domain/site/prices";
import { contactPhone } from "@/lib/env";
import { FAQ, HERO, JOURNEY_DAYS, JOURNEYS, PHOTOS, PRICING, RIGHT_FOR_YOU, STEPS, STORY, VETTING, WHY_KERALA } from "./content";

export const metadata: Metadata = {
  title: { absolute: "Aalmaram Health · Health journeys in Kerala, arranged for you" },
  description: HERO.line,
};

/**
 * Homepage and landing page in one, told as a story: a day on the backwaters
 * in 3D (what this is), then how we choose providers (is it safe), a journey
 * day by day and your own mix (is it for me, what will it cost), how it works,
 * and one clear way to talk to a person.
 */
export default function HomePage() {
  const phone = contactPhone();
  const sample = JOURNEYS[0];

  return (
    <>
      <BackwaterStory phone={phone} chapters={[{ ...STORY[0], title: HERO.title, text: `${HERO.line} ${HERO.forWhom}` }, ...STORY.slice(1)]} />

      <ChecklistScene
        id="safety"
        eyebrow="Is it safe?"
        problem="Kerala has many good providers, but quality is uneven — and their websites rarely tell you who will treat you, how experienced they are, or what it costs."
        answer="So we go and look."
        items={VETTING}
      >
        <MoreLink href="/safety">How we choose providers, in full</MoreLink>
      </ChecklistScene>

      <JourneyScene
        id="journeys"
        eyebrow="A journey, day by day"
        title={sample.title}
        intro={`${sample.days} days, planned around one client's wishes. Every trip is different; this is the shape of one.`}
        panels={JOURNEY_DAYS}
        footer={
          <>
            <p className="text-[16px] font-semibold uppercase tracking-[0.18em] text-gold-300">Typically, everything on the ground</p>
            <p className="mt-4 font-display text-[34px] leading-tight">{formatPriceRange(sample.fromEur, sample.toEur)}</p>
            <p className="mt-4 leading-relaxed text-white/85">Flights not included. Every price is on your trip page before you decide.</p>
            <Link href="/talk" className="mt-8 inline-flex min-h-12 items-center self-start rounded-full bg-gold-300 px-6 font-semibold text-banyan-950 hover:bg-kasavu-50">
              Plan one like it
            </Link>
          </>
        }
      />

      <Section
        id="explore"
        eyebrow="Your mix"
        title="Health, wellness and culture — in the proportions you choose"
        intro="Try a mix and see what a trip could include. Prices are indicative; your exact quote comes from the provider before you book."
        tint
      >
        <YourMix />
      </Section>

      <Section id="how-it-works" eyebrow="How it works" title="Four steps, with a person beside you at each one">
        <StepsScene steps={STEPS} />
        <MoreLink href="/how-it-works">More on how it works</MoreLink>
      </Section>

      {/* Why Kerala — a full-bleed photo that drifts as you pass */}
      <section id="why-kerala" aria-labelledby="why-kerala-title" className="relative scroll-mt-24 overflow-hidden bg-banyan-950 text-white">
        <div data-parallax="0.35" className="absolute inset-[-15%_0]">
          <Image src={photoUrl(PHOTOS.tea.src, 2200)} alt="" fill sizes="100vw" className="object-cover opacity-80" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-banyan-950/95 via-banyan-950/60 to-banyan-950/10" />
        <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 sm:py-40">
          <div data-reveal className="max-w-2xl">
            <p className="text-[16px] font-semibold uppercase tracking-[0.22em] text-gold-300">Why Kerala</p>
            <h2 id="why-kerala-title" className="mt-4 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[64px]">
              Good care, an old tradition, and a beautiful place to be
            </h2>
            <p className="mt-6 text-[20px] leading-relaxed text-white/90">{HERO.context}</p>
          </div>
          <ul data-stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:max-w-4xl">
            {WHY_KERALA.map((item) => (
              <li key={item.title} className="rounded-[28px] bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur-md">
                <h3 className="text-[20px] font-semibold text-gold-300">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-white/90">{item.text}</p>
              </li>
            ))}
          </ul>
          <Link href="/why-kerala" className="mt-12 inline-flex min-h-12 items-center text-[19px] font-semibold underline underline-offset-4">
            Discover Kerala: care, Ayurveda, places and seasons
          </Link>
        </div>
      </section>

      <Section id="right-for-you" eyebrow="Is it for me?" title="Is this right for you?">
        <div data-stagger className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[28px] bg-leaf-50 p-6 ring-1 ring-leaf-100 sm:p-10">
            <h3 className="font-display text-[28px] text-leaf-700">It suits you if</h3>
            <ul className="mt-6 space-y-4">
              {RIGHT_FOR_YOU.suits.map((line) => (
                <li key={line} className="flex gap-3 leading-relaxed text-ink-800">
                  <Check className="mt-1 h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" /> {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[28px] bg-white p-6 ring-1 ring-kasavu-200 sm:p-10">
            <h3 className="font-display text-[28px] text-ink-900">It is not for</h3>
            <ul className="mt-6 space-y-4">
              {RIGHT_FOR_YOU.notFor.map((line) => (
                <li key={line} className="flex gap-3 leading-relaxed text-ink-800">
                  <X className="mt-1 h-5 w-5 shrink-0 text-laterite-600" aria-hidden="true" /> {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="pricing" eyebrow="Prices" title="Transparent pricing" tint>
        <ul data-stagger className="grid gap-10 md:grid-cols-3">
          {PRICING.map((item, i) => (
            <li key={item.title} className="border-t-2 border-gold-500 pt-8">
              <p className="font-display text-[88px] leading-none text-banyan-900" aria-hidden="true">
                {["0%", "1", "€ £"][i]}
              </p>
              <h3 className="mt-6 text-[22px] font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-700">{item.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <TalkBand />

      <Section id="faq" eyebrow="Questions" title="Questions people ask">
        <Faq items={FAQ} />
      </Section>

      <MobileCta />
    </>
  );
}
