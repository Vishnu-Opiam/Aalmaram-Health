import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, CalendarCheck, Check, Phone, ShieldCheck, X } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { Banyan } from "@/components/site/banyan";
import { DawnScene } from "@/components/site/dawn-scene";
import { ctaClass } from "@/components/site/nav";
import { MIX_STYLE, MixBar, describeMix } from "@/components/site/mix-bar";
import { YourMix } from "@/components/site/your-mix";
import { formatPriceRange } from "@/domain/site/prices";
import { MIX_KEYS } from "@/domain/site/mix";
import { contactEmail, contactPhone } from "@/lib/env";
import { cn } from "@/lib/utils";
import {
  FAQ,
  HERO,
  JOURNEYS,
  NEXT_STEPS,
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

const photoUrl = (src: string, width: number) => `${src}?auto=format&fit=crop&w=${width}&q=70`;

function Section({
  id,
  eyebrow,
  title,
  intro,
  tint,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  tint?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24", tint && "bg-kasavu-100")}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="site-reveal max-w-3xl">
          {eyebrow && <p className="text-[16px] font-semibold uppercase tracking-[0.18em] text-gold-700">{eyebrow}</p>}
          <h2 id={`${id}-title`} className="mt-3 font-display text-[32px] font-medium leading-[1.15] tracking-tight text-banyan-900 sm:text-[42px]">
            {title}
          </h2>
          {intro && <p className="mt-4 text-[19px] leading-relaxed text-ink-700 md:text-[20px]">{intro}</p>}
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

function CallLine({ phone, light }: { phone?: string; light?: boolean }) {
  return (
    <p className={cn("text-[17px]", light ? "text-white/90" : "text-ink-700")}>
      A conversation with a person, free and with no obligation.
      {phone && (
        <>
          {" "}
          Or call{" "}
          <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="font-semibold underline underline-offset-4">
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
 * person. Why Kerala, safety and how-it-works are previews; each becomes its
 * own page later.
 */
export default function HomePage() {
  const email = contactEmail();
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
              <Link href="/talk" className={cn(ctaClass, "min-h-14 bg-gold-300 px-7 text-[18px] text-banyan-950 hover:bg-kasavu-100")}>
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
        <div className="site-steps grid gap-10 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
          <ol className="relative space-y-6 border-l-2 border-kasavu-200 pl-8 lg:space-y-0 lg:border-0 lg:pl-0">
            {STEPS.map((step, i) => (
              <li key={step.title} className="site-step relative lg:flex lg:min-h-[44vh] lg:items-center">
                <span className="site-step-bar absolute -left-[35px] top-1 h-14 w-[4px] rounded-full bg-gold-500 lg:-left-6 lg:top-auto" aria-hidden="true" />
                <div className="site-reveal max-w-xl">
                  <p className="font-display text-[22px] text-gold-700">Step {i + 1}</p>
                  <h3 className="mt-1 font-display text-[28px] font-medium leading-tight text-banyan-900 sm:text-[32px]">{step.title}</h3>
                  <p className="mt-3 text-[19px] leading-relaxed text-ink-700">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="hidden lg:block">
            <Banyan className="sticky top-32 w-full" />
          </div>
        </div>
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
            <ol className="mt-6 space-y-5">
              {VETTING.map((item, i) => (
                <li key={item.title} className="flex gap-4">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-banyan-900 font-display text-[18px] text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[19px] font-semibold text-ink-900">{item.title}</p>
                    <p className="mt-1 leading-relaxed text-ink-700">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
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

      {/* Talk to a person */}
      <section id="talk" aria-labelledby="talk-title" className="scroll-mt-24 bg-banyan-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="site-reveal">
            <p className="text-[16px] font-semibold uppercase tracking-[0.18em] text-gold-300">Free conversation</p>
            <h2 id="talk-title" className="mt-3 font-display text-[34px] font-medium leading-[1.15] tracking-tight sm:text-[44px]">
              Talk to a person — free
            </h2>
            <p className="mt-4 max-w-xl text-[20px] leading-relaxed text-white/90">
              Tell us what you have in mind. We will answer your questions and, if it suits you, start planning together.
            </p>
            <div className="mt-8 flex flex-col gap-4">
              <Link href="/talk" className={cn(ctaClass, "min-h-14 self-start bg-gold-300 px-7 text-[18px] text-banyan-950 hover:bg-kasavu-100")}>
                <CalendarCheck className="h-5 w-5" aria-hidden="true" /> Book a free conversation
              </Link>
              {phone && (
                <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center gap-2 text-[18px] underline underline-offset-4">
                  <Phone className="h-5 w-5 text-gold-300" aria-hidden="true" /> Or call {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}?subject=${encodeURIComponent("Free call with Aalmaram Health")}`} className="inline-flex min-h-11 items-center gap-2 text-[18px] underline underline-offset-4">
                  Or email {email}
                </a>
              )}
            </div>
          </div>
          <div className="site-reveal">
            <h3 className="text-[21px] font-semibold text-gold-300">What happens next</h3>
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
        </div>
      </section>

      {/* FAQ */}
      <Section id="faq" eyebrow="Questions" title="Questions people ask">
        <div className="max-w-3xl divide-y divide-kasavu-200 rounded-[28px] bg-white ring-1 ring-kasavu-200">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-6 py-4 sm:px-8">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-[19px] font-semibold text-ink-900">
                {item.q}
                <span aria-hidden="true" className="text-[26px] leading-none text-gold-700 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 pb-2 leading-relaxed text-ink-700">{item.a}</p>
            </details>
          ))}
        </div>
        <Link href="/talk" className="mt-8 inline-flex min-h-12 items-center gap-2 text-[19px] font-semibold text-banyan-900 underline underline-offset-4">
          Something else? Ask us in a free conversation <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </Section>

      {/* Phones: the free conversation stays one tap away */}
      <div className="sticky bottom-0 z-30 border-t border-kasavu-200 bg-kasavu-50/95 p-3 backdrop-blur md:hidden">
        <Link href="/talk" className={cn(ctaClass, "w-full")}>
          <CalendarCheck className="h-5 w-5" aria-hidden="true" /> Book a free conversation
        </Link>
      </div>
    </>
  );
}
