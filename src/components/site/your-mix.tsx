"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { EXPERIENCES, PHOTOS } from "@/app/(site)/content";
import { adjustMix, MIX_KEYS, MIX_PRESETS, pickExamples, type Mix, type MixKey } from "@/domain/site/mix";
import { formatPrice } from "@/domain/site/prices";
import { cn } from "@/lib/utils";
import { MOTION } from "./motion";

export const MIX_LABEL: Record<MixKey, string> = { health: "Health", wellness: "Wellness", culture: "Culture" };
const PANEL_PHOTO = { health: PHOTOS.eyeClinic, wellness: PHOTOS.dhara, culture: PHOTOS.kathakali } as const;
const describeMix = (mix: Mix) => MIX_KEYS.map((k) => `${mix[k]}% ${MIX_LABEL[k].toLowerCase()}`).join(", ");

/**
 * The page's one live thing: three photographs side by side whose widths are
 * your split between health, wellness and culture. Pick a starting point, then
 * fine-tune in 10% steps with large buttons (no sliders: hard for many older
 * visitors) and the examples below follow. Changes are announced politely.
 */
export function YourMix() {
  const [mix, setMix] = useState<Mix>(MIX_PRESETS[1].mix);
  const examples = pickExamples(mix, EXPERIENCES);
  const preset = MIX_PRESETS.find((p) => MIX_KEYS.every((k) => p.mix[k] === mix[k]));
  const panels = useRef<Record<string, HTMLDivElement | null>>({});

  // The panels slide wider and narrower with the mix, like doors.
  useEffect(() => {
    const animate = window.matchMedia(MOTION).matches;
    for (const k of MIX_KEYS) {
      const el = panels.current[k];
      if (el) gsap.to(el, { flexGrow: Math.max(mix[k], 8), duration: animate ? 1 : 0, ease: "power3.inOut" });
    }
  }, [mix]);

  return (
    <div>
      <div className="flex h-[46svh] min-h-[320px] gap-2 sm:gap-3" aria-hidden="true">
        {MIX_KEYS.map((k) => (
          <div
            key={k}
            ref={(el) => {
              panels.current[k] = el;
            }}
            style={{ flexGrow: Math.max(MIX_PRESETS[1].mix[k], 8), flexBasis: 0 }}
            className="relative min-w-0 overflow-hidden bg-night-raised"
          >
            <Image src={`${PANEL_PHOTO[k].src}?auto=format&fit=crop&w=1200&q=72`} alt="" fill sizes="60vw" className="object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(transparent_35%,rgb(8_12_14/0.75))]" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <p className="site-display text-[clamp(2.5rem,6vw,5.5rem)] tabular-nums">{mix[k]}%</p>
              <p className="mt-1 truncate text-[16px] sm:text-[18px]">{MIX_LABEL[k]}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <fieldset className="lg:col-span-5">
          <legend className="text-[19px] font-medium">Start from</legend>
          <div className="mt-4 space-y-2">
            {MIX_PRESETS.map((p) => {
              const active = preset?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMix(p.mix)}
                  className={cn(
                    "block w-full cursor-pointer px-5 py-4 text-left transition-colors duration-200",
                    active ? "bg-mist text-mist-ink" : "bg-night-raised hover:bg-[#1f2b31]",
                  )}
                >
                  <span className="block text-[19px] font-medium">{p.label}</span>
                  <span className={cn("mt-1 block text-[16px] leading-snug", active ? "text-mist-muted" : "text-night-muted")}>{p.line}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="lg:col-span-6 lg:col-start-7">
          <legend className="text-[19px] font-medium">Then adjust, if you like</legend>
          <div className="mt-4 space-y-2">
            {MIX_KEYS.map((k) => (
              <div key={k} className="flex items-center justify-between gap-4 bg-night-raised py-2 pl-5 pr-2">
                <span className="text-[19px]">
                  {MIX_LABEL[k]} <span className="ml-2 tabular-nums text-night-muted">{mix[k]}%</span>
                </span>
                <span className="flex gap-2">
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
            ))}
          </div>
        </fieldset>
      </div>

      <h3 className="mt-16 text-[19px] font-medium">A trip like this could include</h3>
      <p className="sr-only" aria-live="polite">
        Your mix: {describeMix(mix)}. Showing {examples.map((e) => e.title).join(", ")}.
      </p>
      <ul className="mt-6 grid gap-x-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {examples.map((item) => (
          <li key={item.title} className="animate-[site-rise_600ms_ease-out_both] motion-reduce:animate-none">
            <h4 className="site-display text-[30px] leading-tight">{item.title}</h4>
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
