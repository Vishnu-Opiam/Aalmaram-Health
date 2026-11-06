import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookButton, ClosingCta, frame, MoreLink, PageHero, Photo } from "@/components/site/blocks";
import { formatPrice } from "@/domain/site/prices";
import { cn } from "@/lib/utils";
import { EXPERIENCES, experienceSlug, MODULES, PHOTOS } from "../content";

// Only /health, /wellness and /culture; every other single segment stays a 404.
export const dynamicParams = false;
export const generateStaticParams = () => MODULES.map((m) => ({ module: m.kind }));

type Props = { params: Promise<{ module: string }> };

const findModule = (kind: string) => MODULES.find((m) => m.kind === kind);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mod = findModule((await params).module);
  return mod ? { title: { absolute: `${mod.word} in Kerala · Aalmaram Health` }, description: mod.intro } : {};
}

/**
 * One module (5 Nov call): what we arrange under health, wellness or culture,
 * each item with its own anchor so the homepage can link straight to it.
 */
export default async function ModulePage({ params }: Props) {
  const mod = findModule((await params).module);
  if (!mod) notFound();
  const items = EXPERIENCES.filter((item) => item.kind === mod.kind);
  const others = MODULES.filter((m) => m.kind !== mod.kind);

  return (
    <>
      <PageHero title={mod.word} intro={mod.intro} photo={mod.photo} veil={mod.veil}>
        <BookButton />
      </PageHero>

      <section aria-labelledby="items-title" className={cn(frame, "bg-mist py-28 text-mist-ink md:py-36")}>
        <h2 id="items-title" className="site-head">What we arrange</h2>
        <p className="mt-6 max-w-[36rem] leading-relaxed text-mist-muted">
          Prices are where they start; your exact quote comes from the provider before you book.
        </p>
        <div className="mt-20 space-y-24 md:space-y-32">
          {items.map((item, i) => (
            <article key={item.title} id={experienceSlug(item.title)} className="grid scroll-mt-28 gap-8 md:grid-cols-12 md:items-center md:gap-x-6">
              <Photo
                photo={item.photo ?? mod.photo}
                sizes="(min-width: 768px) 45vw, 100vw"
                className={cn("aspect-[4/3] md:col-span-6", i % 2 === 1 && "md:order-last md:col-start-7")}
              />
              <div data-rise className={cn("md:col-span-5", i % 2 === 1 ? "md:col-start-1 md:row-start-1" : "md:col-start-8")}>
                <h3 className="site-display text-[clamp(2rem,1.5rem+1.6vw,3rem)] leading-tight">{item.title}</h3>
                <p className="mt-4 leading-relaxed">{item.line}</p>
                <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[17px]">
                  <dt className="text-mist-muted">How long</dt>
                  <dd>{item.duration}</dd>
                  <dt className="text-mist-muted">You receive</dt>
                  <dd>{item.receive}</dd>
                  <dt className="text-mist-muted">From</dt>
                  <dd className="tabular-nums">{formatPrice(item.priceFromEur)}</dd>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </section>

      <nav aria-label="Also in Kerala" className={cn(frame, "grid gap-6 py-20 md:grid-cols-12 md:gap-x-6 md:py-28")}>
        <p className="site-head md:col-span-4">Also in Kerala</p>
        {others.map((m) => (
          <div key={m.kind} className="md:col-span-4">
            <MoreLink href={m.href} className="site-display text-[clamp(1.75rem,1.3rem+1.2vw,2.4rem)]">{m.word}</MoreLink>
            <p className="mt-2 leading-relaxed text-night-muted">{m.text}</p>
          </div>
        ))}
      </nav>

      <ClosingCta photo={PHOTOS.hills} />
    </>
  );
}
