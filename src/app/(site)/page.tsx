import type { Metadata } from "next";
import Image from "next/image";
import { CalendarCheck, Check, ShieldCheck, X } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { BanyanSteps, Faq, goldCta, MobileCta, MoreLink, NumberedList, photoUrl, Section, TalkBand, telHref } from "@/components/site/blocks";
import { DawnScene } from "@/components/site/dawn-scene";
import { MIX_STYLE, MixBar, describeMix } from "@/components/site/mix-bar";
import { YourMix } from "@/components/site/your-mix";
import { formatPriceRange } from "@/domain/site/prices";
import { MIX_KEYS } from "@/domain/site/mix";
import { contactPhone } from "@/lib/env";
import { cn } from "@/lib/utils";
import {
  FAQ,
  HERO,
  JOURNEYS,
  PHOTOS,
  PRICING,
  PROMISES,
  RIGHT_FOR_YOU,
  SAFETY,
  STATEMENT,
  STEPS,
  VETTING,
  WHY_KERALA,
} from "./content";

export const metadata: Metadata = {
  title: { absolute: "Aalmaram Health · Health journeys in Kerala, arranged for you" },
  description: HERO.line,
};

function CallLine({ phone, light }: { phone?: string; light?: boolean }) {
  return (
    <p className={cn("text-[17px]", light ? "text-white/90" : "text-ink-700")}>
      A conversation with a person, free and with no obligation.
      {phone && (
        <>
          {" "}
          Or call{" "}
          <a href={telHref(phone)} className="font-semibold underline underline-offset-4">
            {phone}
          </a>
          .
        </>
      )}
    </p>
  );
}

/**
 * Homepage and landing page in one: answers "what is this, is it safe, is it
 * for me, what will it cost" and turns visitors into a free conversation with a
 * person. How it works, safety and Why Kerala are previews of their own pages.
 */
export default function HomePage() {
  const phone = contactPhone();
  const words = STATEMENT.split(" ");

  return (
    <>
      {/* What is this — a framed window onto a Kerala dawn that opens as you scroll */}
      <section aria-labelledby="hero-title" className="overflow-hidden bg-banyan-900 p-2 sm:p-4">
        <div className="site-frame relative isolate flex min-h-[640px] flex-col justify-end overflow-hidden rounded-[28px] bg-[#efd3b4] lg:min-h-[min(88vh,860px)]">
          <DawnScene />
          <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-banyan-950/95 via-banyan-950/60 to-transparent" aria-hidden="true" />
          <div className="relative px-5 pb-10 pt-40 text-white sm:px-10 sm:pb-14 lg:px-14">
            <h1 id="hero-title" className="max-w-3xl font-display text-[40px] font-medium leading-[1.08] tracking-tight sm:text-[56px]">
              {HERO.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[19px] leading-relaxed text-white/95 sm:text-[21px]">{HERO.line}</p>
            <p className="mt-3 max-w-2xl text-[18px] leading-relaxed text-white/85">{HERO.forWhom}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/talk" className={goldCta}>
                <CalendarCheck className="h-5 w-5" aria-hidden="true" /> Book a free conversation
              </Link>
              <CallLine phone={phone} light />
            </div>
          </div>
        </div>
      </section>

      {/* The statement, and three promises */}
      <section aria-label="What we do" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <p className="text-center text-[16px] font-semibold uppercase tracking-[0.18em] text-gold-700">Aalmaram · the banyan</p>
        <p className="site-statement mx-auto mt-6 max-w-4xl text-center font-display text-[28px] leading-[1.35] text-banyan-900 sm:text-[38px]">
          {words.map((word, i) => (
            <span key={i} className="site-word" style={{ "--w": i / words.length } as React.CSSProperties}>
              {word}{" "}
            </span>
          ))}
        </p>
        <ul className="mt-16 grid gap-8 border-t border-kasavu-200 pt-10 md:grid-cols-3">
          {PROMISES.map((p) => (
            <li key={p.title} className="site-reveal">
              <span className="block h-px w-12 bg-gold-500" aria-hidden="true" />
              <h3 className="mt-4 text-[21px] font-semibold text-ink-900">{p.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-700">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works — the banyan lowers a root for each step */}
      <Section id="how-it-works" eyebrow="How it works" title="Four steps, with a person beside you at each one" tint>
        <BanyanSteps steps={STEPS} />
        <MoreLink href="/how-it-works">More on how it works</MoreLink>
      </Section>

      {/* Explore — your mix */}
      <Section
        id="explore"
        eyebrow="Explore"
        title="Explore by what you need"
        intro="Every trip mixes health, wellness and culture in the proportions you choose. Try a mix and see what it could include. Prices are indicative; your exact quote comes from the provider before you book."
      >
        <YourMix />
      </Section>

      {/* Is it safe */}
      <Section
        id="safety"
        eyebrow="Safety and quality"
        title="Is it safe?"
        intro="Kerala has many good providers, but quality is uneven and their websites rarely tell you who will treat you. So we look closely before we suggest anyone."
        tint
      >
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="site-reveal rounded-[28px] bg-white p-6 ring-1 ring-kasavu-200 sm:p-8">
            <h3 className="flex items-center gap-3 text-[22px] font-semibold text-banyan-900">
              <ShieldCheck className="h-6 w-6 text-gold-700" aria-hidden="true" /> Before we include a provider, we look at
            </h3>
            <div className="mt-6">
              <NumberedList items={VETTING} />
            </div>
          </div>
          <ul className="space-y-6">
            {SAFETY.map((item) => (
              <li key={item.title} className="site-reveal border-b border-kasavu-200 pb-6 last:border-0">
                <h3 className="text-[20px] font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-700">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <MoreLink href="/safety">How we choose providers, in full</MoreLink>
      </Section>

      {/* Sample journeys */}
      <Section
        id="journeys"
        eyebrow="Sample journeys"
        title="What a trip can look like"
        intro="Three shapes our clients choose. Every trip is planned around you; prices are typical ranges for everything on the ground, without flights."
      >
        <ul className="grid gap-6 lg:grid-cols-3">
          {JOURNEYS.map((j) => (
            <li key={j.title} className="site-reveal flex flex-col overflow-hidden rounded-[28px] bg-white ring-1 ring-kasavu-200">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={photoUrl(j.photo.src, 900)} alt={j.photo.alt} fill sizes="(min-width: 1024px) 30vw, 92vw" className="site-zoom object-cover" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-[16px] font-semibold uppercase tracking-[0.14em] text-gold-700">{j.days} days</p>
                <h3 className="mt-2 font-display text-[26px] font-medium leading-tight text-banyan-900">{j.title}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-ink-700">{j.line}</p>
                <MixBar mix={j.mix} className="mt-5" />
                <p className="mt-2 text-[16px] text-ink-700">
                  <span className="sr-only">Mix: {describeMix(j.mix)}.</span>
                  <span aria-hidden="true">
                    {MIX_KEYS.map((k, i) => (
                      <span key={k} className={MIX_STYLE[k].text}>
                        {i > 0 && " · "}
                        {MIX_STYLE[k].label} {j.mix[k]}%
                      </span>
                    ))}
                  </span>
                </p>
                <p className="mt-4 border-t border-kasavu-200 pt-4 text-[17px] text-ink-700">
                  Typically <span className="font-semibold text-ink-900">{formatPriceRange(j.fromEur, j.toEur)}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* Why Kerala — a photo band */}
      <section id="why-kerala" aria-labelledby="why-kerala-title" className="relative scroll-mt-24 overflow-hidden bg-banyan-950">
        <div className="absolute inset-0">
          <Image src={photoUrl(PHOTOS.houseboat.src, 2000)} alt="" fill sizes="100vw" className="site-zoom object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-r from-banyan-950/90 via-banyan-950/55 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="site-reveal max-w-2xl text-white">
            <p className="text-[16px] font-semibold uppercase tracking-[0.18em] text-gold-300">The place</p>
            <h2 id="why-kerala-title" className="mt-3 font-display text-[34px] font-medium leading-[1.15] tracking-tight sm:text-[44px]">
              Why Kerala
            </h2>
            <p className="mt-4 text-[20px] leading-relaxed text-white/95">
              Good private care, a long tradition of Ayurveda and one of India&apos;s best-loved places to travel.
            </p>
            <p className="mt-3 text-[18px] leading-relaxed text-white/85">{HERO.context}</p>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:max-w-4xl">
            {WHY_KERALA.map((item) => (
              <li key={item.title} className="site-reveal rounded-3xl bg-kasavu-50/95 p-6">
                <h3 className="text-[20px] font-semibold text-banyan-900">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-700">{item.text}</p>
              </li>
            ))}
          </ul>
          <Link href="/why-kerala" className="mt-10 inline-flex min-h-12 items-center text-[19px] font-semibold text-white underline underline-offset-4">
            Discover Kerala: care, Ayurveda, places and seasons
          </Link>
        </div>
      </section>

      {/* Is this right for you */}
      <Section id="right-for-you" eyebrow="Is it for me?" title="Is this right for you?">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="site-reveal rounded-[28px] bg-leaf-50 p-6 ring-1 ring-leaf-100 sm:p-8">
            <h3 className="text-[21px] font-semibold text-leaf-700">It suits you if</h3>
            <ul className="mt-5 space-y-4">
              {RIGHT_FOR_YOU.suits.map((line) => (
                <li key={line} className="flex gap-3 leading-relaxed text-ink-800">
                  <Check className="mt-1 h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" /> {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="site-reveal rounded-[28px] bg-white p-6 ring-1 ring-kasavu-200 sm:p-8">
            <h3 className="text-[21px] font-semibold text-ink-900">It is not for</h3>
            <ul className="mt-5 space-y-4">
              {RIGHT_FOR_YOU.notFor.map((line) => (
                <li key={line} className="flex gap-3 leading-relaxed text-ink-800">
                  <X className="mt-1 h-5 w-5 shrink-0 text-laterite-600" aria-hidden="true" /> {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing" eyebrow="Prices" title="Transparent pricing" tint>
        <ul className="grid gap-5 md:grid-cols-3">
          {PRICING.map((item, i) => (
            <li key={item.title} className="site-reveal rounded-[28px] bg-white p-6 ring-1 ring-kasavu-200 sm:p-8">
              <p className="font-display text-[40px] leading-none text-gold-500" aria-hidden="true">
                {i + 1}
              </p>
              <h3 className="mt-4 text-[21px] font-semibold text-ink-900">{item.title}</h3>
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
