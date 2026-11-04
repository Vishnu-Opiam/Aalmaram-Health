"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { EXPERIENCES, PHOTOS, type Photo } from "@/app/(site)/content";
import { adjustMix, MIX_KEYS, MIX_PRESETS, MIX_STEP, pickExamples, type Mix, type MixKey } from "@/domain/site/mix";
import { formatPrice } from "@/domain/site/prices";
import { cn } from "@/lib/utils";
import { SiteImage } from "./site-image";

export const MIX_LABEL: Record<MixKey, string> = { health: "Health", wellness: "Wellness", culture: "Culture" };
/** "4 days for your health": how each share reads as days. */
const DAYS_FOR: Record<MixKey, string> = { health: "for your health", wellness: "of rest and Ayurveda", culture: "of Kerala itself" };
/** Several photographs per kind, so neighbouring days never repeat one. */
const DAY_PHOTOS: Record<MixKey, Photo[]> = {
  health: [PHOTOS.check, PHOTOS.heart, PHOTOS.joints, PHOTOS.dental, PHOTOS.eyeClinic],
  wellness: [PHOTOS.dhara, PHOTOS.treatmentRoom, PHOTOS.mortar, PHOTOS.tea, PHOTOS.palms, PHOTOS.hills],
  culture: [PHOTOS.kathakali, PHOTOS.kochi, PHOTOS.houseboat, PHOTOS.sadya, PHOTOS.nets, PHOTOS.kathakaliStage, PHOTOS.river],
};
const describeMix = (mix: Mix) => MIX_KEYS.map((k) => `${mix[k]}% ${MIX_LABEL[k].toLowerCase()}`).join(", ");
const daysOf = (mix: Mix, k: MixKey) => mix[k] / MIX_STEP;

/** The trip as ten days in order: health first, then rest, then Kerala. */
function tripDays(mix: Mix): { kind: MixKey; photo: Photo }[] {
  return MIX_KEYS.flatMap((k) => Array.from({ length: daysOf(mix, k) }, (_, j) => ({ kind: k, photo: DAY_PHOTOS[k][j % DAY_PHOTOS[k].length] })));
}

/**
 * The page's one live thing: a ten-day trip drawn as ten photographs, one per
 * day. Choose a starting point, then move days between health, rest and
 * culture with large buttons (no sliders: hard for many older visitors).
 * Each day that changes turns over to its new photograph, left to right, and
 * the examples below follow. Changes are announced politely.
 */
export function YourMix() {
  const [mix, setMix] = useState<Mix>(MIX_PRESETS[1].mix);
  const examples = pickExamples(mix, EXPERIENCES);
  const preset = MIX_PRESETS.find((p) => MIX_KEYS.every((k) => p.mix[k] === mix[k]));
  const days = tripDays(mix);

  // What each day showed before this change, so it can turn over from it.
  const before = useRef(days);
  const previous = before.current;
  useEffect(() => {
    before.current = days;
  });

  return (
    <div>
      <div role="group" aria-label="Start from" className="grid gap-x-10 gap-y-2 md:grid-cols-3">
        {MIX_PRESETS.map((p) => {
          const active = preset?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active}
              onClick={() => setMix(p.mix)}
              className={cn(
                "group min-h-12 cursor-pointer py-3 text-left transition-colors duration-300",
                active ? "text-night-ink" : "text-night-muted hover:text-night-ink",
              )}
            >
              <span
                className={cn(
                  "site-display block text-[clamp(1.9rem,1.4rem+1.4vw,2.75rem)] leading-tight decoration-brass decoration-2 underline-offset-[10px]",
                  active && "underline",
                )}
              >
                {p.label}
              </span>
              <span className="mt-2 block max-w-[30ch] text-[16px] leading-snug text-night-muted">{p.line}</span>
            </button>
          );
        })}
      </div>

      {/* Ten days, ten photographs. Decorative: the counts below say the same in words. */}
      <ol data-days aria-hidden="true" className="mt-12 grid h-[clamp(300px,44svh,620px)] grid-cols-10 gap-1 sm:gap-2 md:h-[clamp(360px,60svh,640px)]">
        {days.map((day, i) => {
          const was = previous[i];
          const turned = was && was.photo.src !== day.photo.src;
          return (
            <li key={i} className="relative min-w-0 overflow-hidden bg-night-raised">
              {turned && <SiteImage photo={was.photo} alt="" sizes="10vw" />}
              <div
                key={day.photo.src}
                className={cn("absolute inset-0", turned && "animate-[site-turn_1s_cubic-bezier(0.7,0,0.2,1)_both] motion-reduce:animate-none")}
                style={turned ? { animationDelay: `${i * 60}ms` } : undefined}
              >
                <SiteImage photo={day.photo} alt="" sizes="10vw" />
              </div>
              <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(rgb(8_12_14/0.55),transparent)]" />
              <span className="absolute left-0 top-0 p-1.5 text-[13px] tabular-nums sm:p-3 sm:text-[15px]">
                <span className="max-lg:hidden">Day </span>
                {i + 1}
              </span>
            </li>
          );
        })}
      </ol>
      {/* Which days are which, under their stretch of the strip. */}
      <div aria-hidden="true" className="mt-3 hidden grid-cols-10 gap-2 md:grid">
        {MIX_KEYS.map((k) =>
          daysOf(mix, k) > 0 ? (
            <p key={k} style={{ gridColumn: `span ${daysOf(mix, k)}` }} className="truncate text-[16px] text-night-muted">
              {MIX_LABEL[k]}
            </p>
          ) : null,
        )}
      </div>

      <div className="mt-10 grid gap-2 md:grid-cols-3 md:gap-3">
        {MIX_KEYS.map((k) => {
          const n = daysOf(mix, k);
          return (
            <div key={k} className="flex items-end justify-between gap-4 bg-night-raised p-5 sm:p-6">
              <p>
                <span className="site-display block text-[clamp(3rem,2.4rem+2vw,4.5rem)] leading-none tabular-nums">{n}</span>
                <span className="mt-2 block text-[18px]">
                  {n === 1 ? "day" : "days"} {DAYS_FOR[k]}
                </span>
              </p>
              <span className="flex shrink-0 gap-2">
                {([-1, 1] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setMix((m) => adjustMix(m, k, dir))}
                    disabled={dir === -1 ? mix[k] === 0 : mix[k] === 100}
                    aria-label={`${dir === -1 ? "Less" : "More"} ${MIX_LABEL[k].toLowerCase()}`}
                    className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-night text-night-ink transition-[background-color,transform] duration-200 hover:bg-brass hover:text-night active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-night disabled:hover:text-night-ink"
                  >
                    {dir === -1 ? <Minus className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}
                  </button>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[16px] text-night-muted">
        Ten days is only the example; your trip can be as long as you like, in the same proportions.
      </p>

      <h3 className="mt-20 text-[19px] font-medium">A trip like this could include</h3>
      <p className="sr-only" aria-live="polite">
        Your mix: {describeMix(mix)}. Showing {examples.map((e) => e.title).join(", ")}.
      </p>
      <ul className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {examples.map((item) => (
          <li key={item.title} className="animate-[site-rise_600ms_ease-out_both] motion-reduce:animate-none">
            {item.photo && (
              <div className="relative aspect-[3/2] overflow-hidden bg-night-raised">
                <SiteImage photo={item.photo} alt="" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" />
              </div>
            )}
            <h4 className="site-display mt-5 text-[30px] leading-tight">{item.title}</h4>
            <p className="mt-2 leading-relaxed text-night-muted">{item.line}</p>
            <p className="mt-3 text-[16px] tabular-nums">
              {MIX_LABEL[item.kind]} · {item.duration} · from {formatPrice(item.priceFromEur)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
