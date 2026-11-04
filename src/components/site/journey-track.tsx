import type { Photo as PhotoData } from "@/app/(site)/content";
import { cn } from "@/lib/utils";
import { frame } from "./blocks";
import { SiteImage } from "./site-image";

/**
 * One journey, day by day, travelled sideways: the section is as tall as the
 * row of days is wide, and the row slides left while it stays on screen.
 * The tall, sticky mode switches on only when the script sets `data-on`
 * (wide screens, motion allowed); otherwise the days are a swipeable row, so
 * nothing depends on the animation.
 */
export function JourneyTrack({
  title,
  intro,
  days,
  aside,
}: {
  title: string;
  intro: string;
  days: { when: string; title: string; text: string; photo: PhotoData }[];
  aside: React.ReactNode;
}) {
  return (
    <section aria-labelledby="journey-title" data-hscroll className="relative bg-night-raised md:data-on:h-[340svh]">
      <div className="md:in-data-on:sticky md:in-data-on:top-0 md:in-data-on:flex md:in-data-on:h-svh md:in-data-on:flex-col md:in-data-on:justify-center md:in-data-on:overflow-hidden">
        <div className={cn(frame, "grid gap-6 pt-28 md:grid-cols-12 md:gap-x-6 md:pt-24")}>
          <h2 id="journey-title" className="site-head md:col-span-6">{title}</h2>
          <p data-rise className="text-night-muted md:col-span-4 md:col-start-9 md:self-end">
            <span>{intro}</span>
          </p>
        </div>
        <ol
          data-track
          className={cn(frame, "mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-24 md:gap-10 md:in-data-on:w-max md:in-data-on:snap-none md:in-data-on:overflow-visible md:in-data-on:pb-0")}
        >
          {days.map((day) => (
            <li key={day.when} className="w-[78vw] shrink-0 snap-start sm:w-[46vw] md:w-[30vw]">
              <div className="relative aspect-[4/5] overflow-hidden bg-night md:aspect-[4/3]">
                <div data-card-photo className="absolute inset-0">
                  <SiteImage photo={day.photo} sizes="(min-width: 768px) 30vw, 78vw" />
                </div>
              </div>
              <p className="mt-5 text-[16px] text-night-muted">{day.when}</p>
              <h3 className="site-display mt-1 text-[clamp(1.9rem,1.4rem+1.4vw,2.75rem)] leading-tight">{day.title}</h3>
              <p className="mt-2 max-w-[28rem] leading-relaxed text-night-muted">{day.text}</p>
            </li>
          ))}
          <li className="flex w-[78vw] shrink-0 snap-start flex-col justify-center sm:w-[46vw] md:w-[34vw] md:pr-[5vw]">{aside}</li>
        </ol>
      </div>
    </section>
  );
}

/** A line of Kerala's place names that slides with the scroll, in two opposite rows. */
export function PlaceBand({ names }: { names: string[] }) {
  const line = [...names, ...names].join("  ·  ");
  return (
    <div aria-hidden="true" className="overflow-hidden py-16 md:py-24">
      <p data-marquee className="site-display whitespace-nowrap text-[clamp(3.5rem,9vw,9rem)] text-night-ink">{line}</p>
      <p data-marquee="right" className="site-display mt-2 whitespace-nowrap text-[clamp(3.5rem,9vw,9rem)] text-night-muted">{line}</p>
    </div>
  );
}
