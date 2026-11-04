import type { Metadata } from "next";
import { BookButton, ClosingCta, Faq, frame, MoreLink, Photo } from "@/components/site/blocks";
import { ExploreList } from "@/components/site/explore-list";
import { JourneyTrack, PlaceBand } from "@/components/site/journey-track";
import { WhyChapters } from "@/components/site/why-chapters";
import { YourMix } from "@/components/site/your-mix";
import { formatPrice, formatPriceRange } from "@/domain/site/prices";
import { cn } from "@/lib/utils";
import {
  FAQ,
  HERO,
  JOURNEY_DAYS,
  JOURNEYS,
  MORE_EXPERIENCES,
  NEEDS,
  PHOTOS,
  PLACE_NAMES,
  PRICING,
  PROMISES,
  RIGHT_FOR_YOU,
  STATEMENT,
  STEPS,
  VETTING,
  WHY_CHAPTERS,
} from "./content";

export const metadata: Metadata = {
  title: { absolute: "Aalmaram Health · Health journeys in Kerala, arranged for you" },
  description: HERO.line,
};

const EXPLORE = [...NEEDS, ...MORE_EXPERIENCES.slice(0, 3)];

/** How we choose providers, set as plain names in columns, one kind per column. */
const PROOF = [
  { kind: "We check", names: VETTING.map((v) => v.title) },
  { kind: "We never", names: ["Give medical advice or a diagnosis", "Book before you have confirmed and paid", "Add a markup to providers' prices"] },
  { kind: "You can", names: ["Involve your own doctor", "See every price before you decide", "Change your plan until you confirm it"] },
];

/**
 * Homepage and landing page in one. The argument, in order: this is Kerala and
 * someone looks after you (hero, intro); why Kerala at all (five chapters);
 * what you can do and what it costs (explore, your mix); how it works; how we
 * keep it safe; whether it suits you; prices in full; questions; a person.
 */
export default function HomePage() {
  return (
    <>
      {/* Hero: the lake at dawn, and the place's name along the bottom like a film title. */}
      <section data-hero className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-night text-night-ink">
        <div data-shutter className="absolute inset-0 -z-10">
          <Photo photo={PHOTOS.lake} sizes="100vw" priority drift className="h-full w-full" />
        </div>
        <div className="absolute inset-x-0 top-0 -z-10 h-44 bg-[linear-gradient(rgb(8_12_14/0.5),transparent)]" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-[62%] bg-[linear-gradient(transparent,rgb(8_12_14/0.7))]" aria-hidden="true" />

        <div className={cn(frame, "grid items-end gap-8 pb-6 pt-40 md:grid-cols-12 md:pb-4")}>
          <h1 className="site-display text-[30vw] md:col-span-8 md:text-[22vw]">
            <span data-hero-rest className="site-lead block font-[family-name:var(--font-site-sans)] tracking-normal">Health journeys to</span>
            <span data-hero-word className="-ml-[0.04em] block leading-[0.8]">Kerala</span>
          </h1>
          <div data-hero-rest className="md:col-span-4 md:col-start-9 md:pb-[2vw]">
            <p className="max-w-[26rem] leading-relaxed">{HERO.line}</p>
            <BookButton className="mt-7" />
            <p className="mt-3 text-[15px] text-night-ink/90">Free, with a person, no obligation.</p>
          </div>
        </div>
      </section>

      {/* Who we are: one paragraph in the right half, a photograph hanging on the left. */}
      <section aria-labelledby="intro-title" className={cn(frame, "grid gap-12 py-28 md:grid-cols-12 md:gap-x-6 md:py-40")}>
        <div className="md:col-span-6 md:col-start-7">
          <h2 id="intro-title" className="site-head">Deep roots, wide shelter</h2>
          <p data-scrub className="site-lead mt-8 indent-[3em]">{STATEMENT}</p>
          <ul data-rise className="mt-12 grid gap-8 sm:grid-cols-3">
            {PROMISES.map((p) => (
              <li key={p.title}>
                <h3 className="font-medium">{p.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-night-muted">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-end gap-6 md:col-span-5 md:row-start-1 md:block">
          <Photo photo={PHOTOS.prow} sizes="(min-width: 768px) 30vw, 62vw" className="ml-auto aspect-[4/5] w-[62%] md:ml-0 md:mt-[18vh] md:aspect-square md:w-[72%]" />
          <p data-split="words" className="order-first w-[30%] text-[15px] leading-relaxed text-night-muted md:mt-10 md:w-56">
            Aalmaram is Malayalam for the banyan, the tree a village gathers under.
          </p>
        </div>
      </section>

      <PlaceBand names={PLACE_NAMES} />

      {/* Why Kerala: five words, five photographs, one page-turn each. */}
      <section id="why-kerala" aria-labelledby="why-title" className="scroll-mt-0">
        <div className={cn(frame, "grid gap-8 pb-20 md:grid-cols-12 md:gap-x-6")}>
          <h2 id="why-title" className="site-head md:col-span-5">Why Kerala</h2>
          <div data-rise className="md:col-span-6 md:col-start-7">
            <p className="site-lead">
              A green strip of south-west India between the mountains and the Arabian Sea, with established hospitals, an
              old tradition of Ayurveda and some of India&apos;s best-loved places to travel.
            </p>
            <MoreLink href="/why-kerala" className="mt-6">Discover Kerala</MoreLink>
          </div>
        </div>
        <WhyChapters chapters={WHY_CHAPTERS} />
      </section>

      {/* Explore: what you can do, with a starting price for each. */}
      <section id="explore" aria-labelledby="explore-title" className={cn(frame, "relative z-10 scroll-mt-20 bg-mist py-28 text-mist-ink md:py-36")}>
        <div className="grid gap-6 md:grid-cols-12 md:gap-x-6">
          <h2 id="explore-title" className="site-head md:col-span-5">Choose what you need</h2>
          <p data-rise className="text-mist-muted md:col-span-5 md:col-start-7">
            {HERO.forWhom} Prices are where they start; your exact quote comes from the provider before you book.
          </p>
        </div>
        <div className="mt-14">
          <ExploreList items={EXPLORE} />
        </div>
      </section>

      {/* Your mix: the one thing to try on the page. */}
      <section aria-labelledby="mix-title" className={cn(frame, "py-28 md:py-36")}>
        <div className="mb-14 grid gap-6 md:grid-cols-12 md:gap-x-6">
          <h2 id="mix-title" className="site-head md:col-span-5">Your own mix</h2>
          <p data-rise className="site-lead md:col-span-6 md:col-start-7">
            Most people want some of each. Choose how much health, rest and Kerala, and see what a trip could hold.
          </p>
        </div>
        <YourMix />
      </section>

      {/* One journey, day by day, travelled sideways. */}
      <JourneyTrack
        title="Ten days, as one journey"
        intro={`${JOURNEYS[0].title}. Every trip is planned around one person; this is the shape of one.`}
        days={JOURNEY_DAYS}
        aside={
          <div data-rise>
            <p className="text-[16px] text-night-muted">Everything on the ground, flights not included</p>
            <p className="site-display mt-3 text-[clamp(2rem,1.5rem+1.5vw,3rem)] leading-tight">{formatPriceRange(JOURNEYS[0].fromEur, JOURNEYS[0].toEur)}</p>
            <BookButton className="mt-8">Plan one like it</BookButton>
          </div>
        }
      />

      {/* How it works: four verbs, in order. */}
      <section id="how-it-works" aria-labelledby="how-title" className={cn(frame, "scroll-mt-20 bg-mist py-28 text-mist-ink md:py-36")}>
        <div className="grid gap-14 md:grid-cols-12 md:gap-x-6">
          <div className="relative md:sticky md:top-32 md:col-span-4 md:self-start md:pl-8">
            {/* Fills as the steps are read. */}
            <span className="absolute inset-y-0 left-0 hidden w-[3px] bg-mist-raised md:block" aria-hidden="true">
              <span data-progress className="block h-full w-full origin-top bg-mist-ink" />
            </span>
            <h2 id="how-title" className="site-head">How it works</h2>
            <p className="mt-6 leading-relaxed text-mist-muted">One person looks after you at every step. Nothing is booked until you have seen every price, confirmed and paid.</p>
            <MoreLink href="/how-it-works" className="mt-4 max-md:hidden">More on how it works</MoreLink>
          </div>
          <ol className="space-y-16 md:col-span-7 md:col-start-6 md:space-y-24">
            {STEPS.map((step) => (
              <li key={step.verb} data-rise className="grid gap-3 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:items-baseline sm:gap-10">
                <p data-split="chars" className="site-display text-[clamp(4rem,8vw,8rem)]" aria-hidden="true">{step.verb}</p>
                <div>
                  <h3 className="text-[21px] font-medium">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-mist-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <MoreLink href="/how-it-works" className="md:hidden">More on how it works</MoreLink>
        </div>
      </section>

      {/* Is it safe: what we check, what we never do, what you can do. */}
      <section id="safety" aria-labelledby="safety-title" className={cn(frame, "grid scroll-mt-20 gap-14 py-28 md:grid-cols-12 md:gap-x-6 md:py-36")}>
        <div className="md:col-span-4">
          <h2 id="safety-title" className="site-head">Choosing providers</h2>
          <p className="mt-6 leading-relaxed text-night-muted">
            Kerala has many good providers, but quality is uneven, and their websites rarely tell you who will treat you or
            what it costs. So we go and look.
          </p>
          <MoreLink href="/safety" className="mt-4">How we keep it safe</MoreLink>
        </div>
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-8 md:col-span-7 md:col-start-6">
          {PROOF.map((group) => (
            <ul key={group.kind} data-rise="left" className="space-y-3 text-[20px] leading-snug">
              <li className="text-night-muted">{group.kind}</li>
              {group.names.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* Is this right for you: an honest filter, beside a quiet photograph. */}
      <section aria-labelledby="fit-title" className={cn(frame, "grid gap-12 bg-night-raised py-28 md:grid-cols-12 md:gap-x-6 md:py-36")}>
        <Photo photo={PHOTOS.palms} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[4/5] md:col-span-5" />
        <div className="md:col-span-6 md:col-start-7 md:self-center">
          <h2 id="fit-title" className="site-head">Is this right for you?</h2>
          <h3 className="mt-10 text-[21px] font-medium">It suits you if</h3>
          <ul data-rise="left" className="mt-3 space-y-2 leading-relaxed text-night-muted">
            {RIGHT_FOR_YOU.suits.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3 className="mt-10 text-[21px] font-medium">It is not for</h3>
          <ul data-rise="left" className="mt-3 space-y-2 leading-relaxed text-night-muted">
            {RIGHT_FOR_YOU.notFor.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Prices, set like a menu. */}
      <section id="pricing" aria-labelledby="pricing-title" className={cn(frame, "grid scroll-mt-20 gap-14 bg-mist py-28 text-mist-ink md:grid-cols-12 md:gap-x-6 md:py-36")}>
        <div className="md:col-span-3">
          <h2 id="pricing-title" className="site-head">What it costs</h2>
          <p className="mt-6 text-[16px] leading-relaxed text-mist-muted">Indicative, in euros with pounds alongside. Flights are not included.</p>
          <Photo photo={PHOTOS.mortar} sizes="(min-width: 768px) 22vw, 60vw" className="mt-10 aspect-[4/5] w-3/5 md:w-full" />
        </div>
        <div className="grid gap-x-16 gap-y-14 md:col-span-8 md:col-start-5 lg:grid-cols-2">
          <PriceGroup title="How we charge">
            {PRICING.map((p, i) => (
              <PriceRow key={p.title} name={p.title} price={["No markup", "Shown first", "Then we book"][i]} text={p.text} />
            ))}
          </PriceGroup>
          <PriceGroup title="Care, from">
            {NEEDS.map((n) => (
              <PriceRow key={n.title} name={n.title} price={formatPrice(n.priceFromEur)} />
            ))}
          </PriceGroup>
          <PriceGroup title="Whole journeys, on the ground" className="lg:col-span-2">
            <div className="grid gap-x-16 lg:grid-cols-2">
              {JOURNEYS.map((j) => (
                <PriceRow key={j.title} name={`${j.title}, ${j.days} days`} price={formatPriceRange(j.fromEur, j.toEur)} text={j.line} stacked />
              ))}
            </div>
          </PriceGroup>
        </div>
      </section>

      {/* Questions, beside a tall photograph. */}
      <section id="faq" aria-labelledby="faq-title" className={cn(frame, "grid scroll-mt-20 gap-14 py-28 md:grid-cols-12 md:gap-x-6 md:py-36")}>
        <div className="md:col-span-6">
          <h2 id="faq-title" className="site-head">Questions people ask</h2>
          <ul data-rise className="mt-8 space-y-1 text-[18px] text-night-muted">
            <li>Kerala, south-west India. Fly into Kochi or Thiruvananthapuram.</li>
            <li>For clients from the UK, Austria and Slovenia, and from anywhere.</li>
            <li>It starts with a free conversation, by phone or video.</li>
          </ul>
          <div data-rise>
            <Faq items={FAQ} tone="night" className="mt-10" />
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            <BookButton />
            <MoreLink href="/safety">Is it safe?</MoreLink>
          </div>
        </div>
        <div className="relative hidden md:col-span-5 md:col-start-8 md:block">
          <Photo photo={PHOTOS.nets} sizes="40vw" className="sticky top-28 aspect-[3/4]" />
        </div>
      </section>

      <ClosingCta photo={PHOTOS.hills} />
    </>
  );
}

function PriceGroup({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <h3 data-split="words" className="text-[24px] font-medium">{title}</h3>
      <div data-rise className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

function PriceRow({ name, price, text, stacked }: { name: string; price: string; text?: string; stacked?: boolean }) {
  return (
    <div className={cn(stacked && "pb-4")}>
      <p className={cn("flex justify-between gap-6 text-[19px]", stacked && "flex-col gap-1")}>
        <span>{name}</span>
        <span className="shrink-0 tabular-nums">{price}</span>
      </p>
      {text && <p className="mt-1 max-w-[36ch] text-[16px] leading-relaxed text-mist-muted">{text}</p>}
    </div>
  );
}
