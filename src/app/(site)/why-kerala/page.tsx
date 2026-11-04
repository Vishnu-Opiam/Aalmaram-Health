import type { Metadata } from "next";
import { Band, BookButton, ClosingCta, Faq, frame, PageHero, Photo, Points } from "@/components/site/blocks";
import { cn } from "@/lib/utils";
import { faqFor, HERO, PHOTOS, WHY_KERALA_PAGE as PAGE } from "../content";

export const metadata: Metadata = {
  title: { absolute: "Why Kerala · Aalmaram Health" },
  description: PAGE.intro,
};

const PLACE_PHOTOS = { "The backwaters": PHOTOS.canal, "The coast": PHOTOS.coast, "Arts and festivals": PHOTOS.kathakaliStage, Kochi: PHOTOS.nets } as Record<string, typeof PHOTOS.lake>;

/** The page that sells the place: care first, then Ayurveda, the places themselves, the seasons and the practical things. */
export default function WhyKeralaPage() {
  const places = PAGE.places.map((p) => ({ ...p, photo: PLACE_PHOTOS[p.title] ?? p.photo }));
  return (
    <>
      <PageHero title={PAGE.title} intro={PAGE.intro} photo={PHOTOS.river}>
        <BookButton />
      </PageHero>

      <Band id="care" title="Good private care, explained plainly" intro={HERO.context} tone="mist">
        <Points items={PAGE.care} tone="mist" />
      </Band>

      {/* Ayurveda: the treatment itself, large, beside a plain description. */}
      <section aria-labelledby="ayurveda-title" className={cn(frame, "grid gap-12 py-28 md:grid-cols-12 md:gap-x-6 md:py-36")}>
        <Photo photo={PHOTOS.dhara} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[4/5] md:col-span-6" />
        <div className="md:col-span-5 md:col-start-8 md:self-center">
          <h2 id="ayurveda-title" className="site-head">{PAGE.ayurveda.title}</h2>
          <p data-scrub className="site-lead mt-8">{PAGE.ayurveda.text}</p>
          <p data-split="words" className="mt-8 text-[16px] leading-relaxed text-night-muted">{PAGE.ayurveda.note}</p>
        </div>
      </section>

      {/* Places: photographs at uneven sizes, alternating sides. */}
      <section aria-labelledby="places-title" className={cn(frame, "bg-night-raised py-28 md:py-36")}>
        <h2 id="places-title" className="site-head max-w-[36rem]">Backwaters, hills, coast and history</h2>
        <div className="mt-20 space-y-24 md:space-y-32">
          {places.map((place, i) => (
            <article key={place.title} className="grid gap-8 md:grid-cols-12 md:items-end md:gap-x-6">
              {place.photo && (
                <Photo
                  photo={place.photo}
                  sizes="(min-width: 768px) 60vw, 100vw"
                  className={cn("aspect-[3/2] md:col-span-7", i % 2 === 1 && "md:order-2 md:col-start-6", i % 3 === 2 && "md:col-span-6 md:aspect-[4/5]")}
                />
              )}
              <div data-rise className={cn("md:col-span-4", i % 2 === 1 ? "md:order-1 md:col-start-1" : "md:col-start-9", !place.photo && "md:col-span-6 md:col-start-1")}>
                <h3 data-split="chars" className="site-display text-[clamp(2.25rem,1.5rem+2vw,3.5rem)]">{place.title}</h3>
                <p className="mt-4 leading-relaxed text-night-muted">{place.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Seasons, set like a timetable. */}
      <Band id="seasons" title="Kerala through the year" tone="mist">
        <dl data-rise="left" className="space-y-10">
          {PAGE.seasons.map((s) => (
            <div key={s.months} className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8">
              <dt className="site-display text-[clamp(1.75rem,1.3rem+1.2vw,2.4rem)] leading-tight">{s.months}</dt>
              <dd className="leading-relaxed text-mist-muted">{s.text}</dd>
            </div>
          ))}
        </dl>
      </Band>

      <Band id="getting-there" title="Practical things to know">
        <Points items={PAGE.travel} />
      </Band>

      <Band id="faq" title="Questions about travelling" tone="raised">
        <Faq items={faqFor(["Is Kerala safe to travel to?", "Do I need a visa?", "What does a whole trip cost?"])} tone="night" />
      </Band>

      <ClosingCta photo={PHOTOS.hills} />
    </>
  );
}
