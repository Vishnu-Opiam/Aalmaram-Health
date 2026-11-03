import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { ChecklistScene } from "@/components/site/checklist-scene";
import { Faq, MobileCta, NumberedList, PageHero, Section, TalkBand } from "@/components/site/blocks";
import { faqFor, PHOTOS, RIGHT_FOR_YOU, SAFETY, SAFETY_PAGE as PAGE, VETTING } from "../content";

export const metadata: Metadata = {
  title: { absolute: "Is it safe? · Aalmaram Health" },
  description: PAGE.intro,
};

/** Safety and quality: how we choose providers, who does what, and what to do before and during the trip. */
export default function SafetyPage() {
  return (
    <>
      <PageHero eyebrow="Safety and quality" title={PAGE.title} intro={PAGE.intro} photo={PHOTOS.spout} />

      <ChecklistScene
        id="vetting"
        eyebrow="How we choose providers"
        problem="A good website is not the same as a good doctor. Before we suggest anyone, we check what matters."
        answer="We go and look."
        items={VETTING}
      />

      <Section id="promises" eyebrow="Our commitments" title="What you can rely on" tint>
        <ul data-stagger className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {SAFETY.map((item) => (
            <li key={item.title} className="border-t-2 border-gold-500 pt-6">
              <h3 className="text-[21px] font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-700">{item.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="roles" eyebrow="Who does what" title="We arrange your care. Doctors decide it, with you.">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { title: "Aalmaram Health", items: PAGE.roles.we, tone: "bg-leaf-50 ring-leaf-100" },
            { title: "The doctors you see", items: PAGE.roles.doctors, tone: "bg-white ring-kasavu-200" },
          ].map((col) => (
            <div key={col.title} className={`site-reveal rounded-[28px] p-6 ring-1 sm:p-8 ${col.tone}`}>
              <h3 className="text-[21px] font-semibold text-ink-900">{col.title}</h3>
              <ul className="mt-5 space-y-4">
                {col.items.map((line) => (
                  <li key={line} className="flex gap-3 leading-relaxed text-ink-800">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" /> {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="before-you-go" eyebrow="Before you travel" title="Four things to do before you go" tint>
        <NumberedList items={PAGE.beforeYouGo} />
      </Section>

      <Section id="if-something-goes-wrong" eyebrow="While you are there" title="If something goes wrong">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <NumberedList items={PAGE.ifSomethingGoesWrong} />
          <div className="site-reveal self-start rounded-[28px] bg-kasavu-100 p-6 sm:p-8">
            <h3 className="text-[21px] font-semibold text-ink-900">This is not for</h3>
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

      <TalkBand />

      <Section id="faq" eyebrow="Questions" title="Questions about safety">
        <Faq items={faqFor(PAGE.faq)} />
      </Section>

      <MobileCta />
    </>
  );
}
