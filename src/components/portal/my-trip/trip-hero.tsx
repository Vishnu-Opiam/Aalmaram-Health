import { ArrowRight } from "lucide-react";
import { BigNumeral, ButtonLink, Countdown, Pass, Photo, type CountdownParts, type PhotoSource } from "@/components/portal/kit";
import { cn } from "@/lib/utils";
import type { Action, HeroCopy } from "./moment";

/**
 * My trip's first screen: a full-bleed photo under the transparent header,
 * the greeting and dates on the left, the countdown on the right (big days,
 * then the live hours and minutes), and the trip pass overlapping its foot.
 * The pass only becomes a notched, perforated ticket once the trip is
 * confirmed; while planning it is plain paper.
 */
export function TripHero({
  photo,
  greeting,
  dates,
  copy,
  countdown,
  pass,
}: {
  photo: PhotoSource;
  greeting: string | null;
  dates: { long: string; short: string } | null;
  copy: HeroCopy;
  countdown: { target: string; parts: CountdownParts } | null;
  /** Null: no trip yet, the hero stands alone. */
  pass: {
    title: string;
    confirmed: boolean;
    cells: { value: string; label: string }[];
    primary: Action;
    secondary: Action | null;
  } | null;
}) {
  const ticker = copy.ticker && countdown && !countdown.parts.past ? countdown : null;
  const { hours, minutes } = ticker?.parts ?? { hours: 0, minutes: 0 };
  const big = copy.big && (
    copy.numeric ? (
      <BigNumeral value={copy.big} label={copy.bigLabel} size="hero" align="end" settle />
    ) : (
      <span className={cn("pk-settle block max-w-[11ch] text-balance font-display leading-[0.95] tracking-[-0.02em]", pass ? "text-[52px] md:text-[104px]" : "mb-4 text-[48px] md:text-[96px]")}>
        <span>{copy.big}</span>
      </span>
    )
  );

  return (
    <section data-portal-hero aria-labelledby={pass ? "trip-title" : "welcome-title"}>
      <Photo
        photo={photo}
        sizes="100vw"
        priority
        shutter
        scrim={["bottom", "right"]}
        className={cn(pass ? "h-[max(440px,54svh)] md:h-[min(80svh,780px)]" : "h-[max(480px,68svh)] md:h-[min(80svh,780px)]")}
        overlayClassName="items-end"
      >
        {/* A soft pool of night behind the numeral, so it reads on a bright sky as well as on dark water. */}
        {pass && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "radial-gradient(ellipse 60% 55% at 92% 78%, rgb(14 21 24 / 0.5), rgb(14 21 24 / 0) 70%)" }}
          />
        )}
        <div className={cn("pk-frame relative flex items-end justify-between gap-5", pass ? "pb-14 md:pb-28" : "pb-12 md:pb-20")}>
          <div className="min-w-0 pb-1 text-[17px] leading-snug md:text-[19px]">
            {!pass && <h1 id="welcome-title">{big}</h1>}
            {greeting && <p className="font-medium">{greeting}</p>}
            {dates && (
              <p className="mt-1">
                <span className="whitespace-nowrap md:hidden">{dates.short}</span>
                <span className="max-md:hidden">{dates.long}</span>
              </p>
            )}
          </div>
          {pass ? (
            <div className="flex shrink-0 flex-col items-end text-right">
              {big}
              {ticker && (
                <>
                  <span className="my-4 h-px w-24 bg-gold-300 md:my-5 md:w-30" aria-hidden="true" />
                  <Countdown
                    target={ticker.target}
                    initial={ticker.parts}
                    prefix={copy.ticker === "and" ? "and" : ""}
                    srText={`${copy.ticker === "and" ? "and " : ""}${hours} hours ${minutes} minutes, until Day 1 begins in Kerala.`}
                    className="text-[22px] md:text-[28px]"
                  />
                  <span className="mt-1 text-[15px] text-night-muted md:text-[16px]" aria-hidden="true">
                    <span className="md:hidden">Kerala time</span>
                    <span className="max-md:hidden">until Day 1 begins, Kerala time</span>
                  </span>
                </>
              )}
            </div>
          ) : null}
        </div>
      </Photo>
      {!pass && <p className="pk-frame pk-body mt-8 text-mist-muted md:mt-12">{copy.line}</p>}
      {pass && <TripPass {...pass} line={copy.line} />}
    </section>
  );
}

function TripPass({
  title,
  confirmed,
  cells,
  primary,
  secondary,
  line,
}: {
  title: string;
  confirmed: boolean;
  cells: { value: string; label: string }[];
  primary: Action;
  secondary: Action | null;
  line: string;
}) {
  const actions = (
    <div className="flex flex-col items-stretch gap-1 md:items-center">
      <ButtonLink href={primary.href} className="whitespace-nowrap">
        {primary.label} <ArrowRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </ButtonLink>
      {secondary && (
        <ButtonLink href={secondary.href} variant="quiet" className="self-center">
          {secondary.label}
        </ButtonLink>
      )}
    </div>
  );
  const strip = (
    <dl className="grid auto-cols-fr grid-flow-col">
      {cells.map((cell, i) => (
        <div key={cell.label} className={cn("relative flex flex-col-reverse justify-end", i > 0 && "pl-4 md:pl-8", i < cells.length - 1 && "pr-4 md:pr-8")}>
          {i > 0 &&
            (confirmed ? (
              <span aria-hidden="true" className="pk-perf-y absolute inset-y-0 left-0" />
            ) : (
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-paper-line" />
            ))}
          <dt className="mt-2.5 text-[15px] font-medium leading-snug text-mist-muted md:text-[16px]">{cell.label}</dt>
          <dd className="pk-numeral pk-numeral-stat whitespace-nowrap max-[389px]:text-[38px]">{cell.value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div className="pk-frame relative -mt-8 md:-mt-16">
      <Pass
        stub={confirmed ? <div className="flex h-full items-center justify-center">{actions}</div> : undefined}
        stubClassName="md:w-72"
        mainClassName="flex flex-col"
      >
        <h1 id="trip-title" className="max-w-[30ch] text-balance font-display text-[28px] leading-[1.05] tracking-[-0.015em] md:text-[44px]">
          {title}
        </h1>
        <p className="pk-body mt-4 max-w-[56ch] text-mist-muted max-md:hidden">{line}</p>
        <div className={cn("mt-7 grid gap-y-6 md:mt-9", !confirmed && "md:grid-cols-[1fr_auto] md:items-center md:gap-x-8")}>
          {strip}
          {!confirmed && actions}
        </div>
      </Pass>
      {/* On phones the sentence follows the pass, so the countdown and the next step share the first screen. */}
      <p className="pk-body mt-6 text-mist-muted md:hidden">{line}</p>
    </div>
  );
}
