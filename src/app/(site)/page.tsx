import type { Metadata } from "next";
import { CalendarCheck, Check, X } from "lucide-react";
import { KeralaScene } from "@/components/portal/kerala-scene";
import { KIND, pill } from "@/components/portal/ui";
import { contactEmail } from "@/lib/env";
import { cn } from "@/lib/utils";
import { FAQ, GUIDES, HERO, NEEDS, PRICING, RIGHT_FOR_YOU, SAFETY, STEPS, WHY_KERALA } from "./content";

export const metadata: Metadata = {
  title: { absolute: "Aalmaram Health · Health journeys in Kerala, arranged for you" },
  description: HERO.line,
};

function Section({ id, title, intro, tint, children }: { id: string; title: string; intro?: string; tint?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-20", tint && "bg-sand-100")}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 id={`${id}-title`} className="font-display text-[32px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[40px]">
          {title}
        </h2>
        {intro && <p className="mt-3 max-w-2xl text-[19px] leading-relaxed text-ink-700">{intro}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/**
 * Homepage and landing page in one: answers "what is this, is it safe, is it
 * for me" and turns visitors into a free call with a person. Why Kerala,
 * safety and how-it-works are previews; each becomes its own page later.
 */
export default function HomePage() {
  const contact = contactEmail();
  const callHref = contact ? `mailto:${contact}?subject=${encodeURIComponent("Free call with Aalmaram Health")}` : "#talk";

  return (
    <>
      {/* What is this */}
      <section className="relative overflow-hidden bg-forest-950 text-white">
        <KeralaScene className="absolute inset-0 h-full w-full opacity-35" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="max-w-3xl font-display text-[38px] font-semibold leading-[1.1] tracking-tight sm:text-[54px]">{HERO.title}</h1>
          <p className="mt-5 max-w-2xl text-[20px] leading-relaxed text-white/90">{HERO.line}</p>
          <p className="mt-3 max-w-2xl text-[18px] leading-relaxed text-white/80">{HERO.forWhom}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href={callHref} className={pill("primary", "bg-marigold-300 text-forest-950 hover:bg-marigold-100")}>
              <CalendarCheck className="h-5 w-5" aria-hidden="true" /> Book a free call
            </a>
            <span className="text-[16px] text-white/80">A conversation with a person, no obligation.</span>
          </div>
          <p className="mt-10 max-w-2xl border-l-2 border-marigold-300 pl-4 text-[17px] leading-relaxed text-white/85">{HERO.context}</p>
        </div>
      </section>

      <Section id="how-it-works" title="How it works" intro="Four steps, with a person beside you at each one.">
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-3xl bg-white p-6 ring-1 ring-sand-200">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-forest-900 font-display text-[20px] font-semibold text-white">{i + 1}</span>
              <h3 className="mt-4 text-[20px] font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-700">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="why-kerala" title="Why Kerala" intro="Good private care, a long tradition of Ayurveda and one of India's best-loved places to travel." tint>
        <ul className="grid gap-5 sm:grid-cols-2">
          {WHY_KERALA.map((item) => (
            <li key={item.title} className="rounded-3xl bg-white p-6 ring-1 ring-sand-200">
              <h3 className="text-[20px] font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-700">{item.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="explore" title="Explore by what you need" intro="A few of the things we arrange. Prices are indicative; your exact quote comes from the provider before you book.">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {NEEDS.map((need) => {
            const kind = KIND[need.kind];
            return (
              <li key={need.title} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-sand-200">
                <div className="flex items-center gap-3">
                  <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl", kind.tile)} aria-hidden="true">
                    <need.Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-[20px] font-semibold text-ink-900">{need.title}</h3>
                    <p className="text-[15px] font-semibold uppercase tracking-wide text-ink-500">{kind.label}</p>
                  </div>
                </div>
                <p className="mt-4 flex-1 leading-relaxed text-ink-700">{need.line}</p>
                <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-sand-200 pt-4 text-[16px]">
                  <dt className="text-ink-500">Time</dt>
                  <dd className="text-ink-800">{need.duration}</dd>
                  <dt className="text-ink-500">You receive</dt>
                  <dd className="text-ink-800">{need.receive}</dd>
                  <dt className="text-ink-500">Indicative</dt>
                  <dd className="font-semibold text-ink-900">{need.price}</dd>
                </dl>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section id="safety" title="Is it safe?" tint>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SAFETY.map((item) => (
            <li key={item.title} className="rounded-3xl bg-white p-6 ring-1 ring-sand-200">
              <h3 className="text-[20px] font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-700">{item.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="right-for-you" title="Is this right for you?">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-leaf-50 p-6 ring-1 ring-leaf-100">
            <h3 className="text-[20px] font-semibold text-leaf-700">It suits you if</h3>
            <ul className="mt-4 space-y-3">
              {RIGHT_FOR_YOU.suits.map((line) => (
                <li key={line} className="flex gap-3 leading-relaxed text-ink-800">
                  <Check className="mt-1 h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" /> {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-6 ring-1 ring-sand-200">
            <h3 className="text-[20px] font-semibold text-ink-900">It is not for</h3>
            <ul className="mt-4 space-y-3">
              {RIGHT_FOR_YOU.notFor.map((line) => (
                <li key={line} className="flex gap-3 leading-relaxed text-ink-800">
                  <X className="mt-1 h-5 w-5 shrink-0 text-danger-500" aria-hidden="true" /> {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="learn" title="Learn" intro="Guides and articles from the people we work with." tint>
        <ul className="grid gap-5 md:grid-cols-3">
          {GUIDES.map((guide) => (
            <li key={guide.title} className="rounded-3xl bg-white p-6 ring-1 ring-sand-200">
              <p className="text-[15px] font-semibold uppercase tracking-wide text-teal-600">{guide.kind}</p>
              <h3 className="mt-2 text-[20px] font-semibold leading-snug text-ink-900">{guide.title}</h3>
              <p className="mt-3 text-[16px] text-ink-500">Coming soon</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="pricing" title="Transparent pricing">
        <ul className="grid gap-5 md:grid-cols-3">
          {PRICING.map((item) => (
            <li key={item.title} className="rounded-3xl bg-white p-6 ring-1 ring-sand-200">
              <h3 className="text-[20px] font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-700">{item.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <section id="talk" aria-labelledby="talk-title" className="scroll-mt-20 bg-forest-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <h2 id="talk-title" className="font-display text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">
            Talk to a person — free
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[19px] leading-relaxed text-white/85">
            Tell us what you have in mind. We will answer your questions and, if it suits you, start planning together.
          </p>
          {contact ? (
            <a href={callHref} className={pill("primary", "mt-8 bg-marigold-300 text-forest-950 hover:bg-marigold-100")}>
              <CalendarCheck className="h-5 w-5" aria-hidden="true" /> Book a free call
            </a>
          ) : (
            <p className="mt-8 text-[18px] font-semibold text-marigold-300">Call booking opens soon.</p>
          )}
        </div>
      </section>

      <Section id="faq" title="Questions people ask">
        <div className="max-w-3xl divide-y divide-sand-200 rounded-3xl bg-white ring-1 ring-sand-200">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-6 py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[19px] font-semibold text-ink-900">
                {item.q}
                <span aria-hidden="true" className="text-[24px] leading-none text-ink-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 leading-relaxed text-ink-700">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
