import type { Metadata } from "next";
import { Band, BookButton, ClosingCta, Faq, frame, PageHero, Photo, Points } from "@/components/site/blocks";
import { cn } from "@/lib/utils";
import { faqFor, PHOTOS, SAFETY, SAFETY_PAGE as PAGE, VETTING } from "../content";

export const metadata: Metadata = {
  title: { absolute: "Is it safe? · Aalmaram Health" },
  description: PAGE.intro,
};

export default function SafetyPage() {
  return (
    <>
      <PageHero title={PAGE.title} intro={PAGE.intro} photo={PHOTOS.palms} short>
        <BookButton />
      </PageHero>

      <Band id="vetting" title="What we check before we suggest anyone" intro="Placeholder until our formal vetting process is written down and published." tone="mist">
        <Points items={VETTING} tone="mist" />
      </Band>

      <Band id="promises" title="What you can rely on">
        <Points items={SAFETY} />
      </Band>

      {/* Who does what, as two plain columns of names. */}
      <section aria-labelledby="roles-title" className={cn(frame, "bg-mist py-28 text-mist-ink md:py-36")}>
        <h2 id="roles-title" data-rise className="site-head max-w-[40rem]">We arrange. Doctors decide.</h2>
        <div className="mt-16 grid gap-14 md:grid-cols-12 md:gap-x-6">
          {[
            { title: "Aalmaram Health", items: PAGE.roles.we, span: "md:col-span-5" },
            { title: "The doctors you see", items: PAGE.roles.doctors, span: "md:col-span-5 md:col-start-7" },
          ].map((col) => (
            <div key={col.title} data-rise className={col.span}>
              <h3 className="text-[21px] text-mist-muted">{col.title}</h3>
              <ul className="mt-4 space-y-3 text-[clamp(1.25rem,1.1rem+0.5vw,1.5rem)] leading-snug">
                {col.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Before you go: the four things, beside a quiet photograph. */}
      <section aria-labelledby="before-title" className={cn(frame, "grid gap-12 py-28 md:grid-cols-12 md:gap-x-6 md:py-36")}>
        <div className="md:col-span-6">
          <h2 id="before-title" data-rise className="site-head">Four things to do before you go</h2>
          <div className="mt-14">
            <Points items={PAGE.beforeYouGo} />
          </div>
        </div>
        <Photo photo={PHOTOS.treatmentRoom} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[3/4] md:col-span-5 md:col-start-8" />
      </section>

      <Band id="if-something-goes-wrong" title="If something goes wrong" tone="raised">
        <Points items={PAGE.ifSomethingGoesWrong} />
      </Band>

      <Band id="faq" title="Questions about safety" tone="mist">
        <Faq items={faqFor(PAGE.faq)} />
      </Band>

      <ClosingCta photo={PHOTOS.prow} />
    </>
  );
}
