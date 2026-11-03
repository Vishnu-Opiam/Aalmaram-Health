"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import Image from "next/image";
import { Minus, Plus, Stethoscope } from "lucide-react";
import { EXPERIENCES, PHOTOS } from "@/app/(site)/content";
import { adjustMix, MIX_KEYS, MIX_PRESETS, pickExamples, type Mix } from "@/domain/site/mix";
import { formatPrice } from "@/domain/site/prices";
import { cn } from "@/lib/utils";
import { describeMix, MIX_STYLE, MixBar } from "./mix-bar";
import { MOTION } from "./motion";

const PANEL_PHOTO = { health: PHOTOS.check, wellness: PHOTOS.oils, culture: PHOTOS.kathakali } as const;

/**
 * Pick a starting mix, fine-tune it in 10% steps with large buttons (no
 * sliders: they are hard to use for many older visitors) and watch the
 * examples change. The new examples are announced politely.
 */
export function YourMix() {
  const [mix, setMix] = useState<Mix>(MIX_PRESETS[1].mix);
  const examples = pickExamples(mix, EXPERIENCES);
  const preset = MIX_PRESETS.find((p) => MIX_KEYS.every((k) => p.mix[k] === mix[k]));
  const panels = useRef<Record<string, HTMLDivElement | null>>({});

  // The three panels widen and narrow with the mix, like doors sliding open.
  useEffect(() => {
    const animate = window.matchMedia(MOTION).matches;
    for (const k of MIX_KEYS) {
      const el = panels.current[k];
      if (el) gsap.to(el, { flexGrow: Math.max(mix[k], 6), duration: animate ? 1.1 : 0, ease: "power3.inOut" });
    }
  }, [mix]);

  return (
    <div>
      <div className="mb-10 flex h-[300px] gap-3 sm:h-[420px]" aria-hidden="true">
        {MIX_KEYS.map((k) => {
          const photo = PANEL_PHOTO[k];
          return (
            <div
              key={k}
              ref={(el) => {
                panels.current[k] = el;
              }}
              style={{ flexGrow: Math.max(MIX_PRESETS[1].mix[k], 6), flexBasis: 0 }}
              className={cn("relative min-w-0 overflow-hidden rounded-[28px]", MIX_STYLE[k].tile)}
            >
              {photo ? (
                <Image src={`${photo.src}?auto=format&fit=crop&w=1000&q=70`} alt="" fill sizes="50vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#d3e8ea,#1f6670)]">
                  <Stethoscope className="absolute right-6 top-6 h-16 w-16 text-white/80" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                <p className="font-display text-[44px] leading-none sm:text-[72px]">{mix[k]}%</p>
                <p className="mt-2 whitespace-nowrap text-[18px] font-semibold uppercase tracking-[0.18em]">{MIX_STYLE[k].label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <fieldset>
        <legend className="text-[19px] font-semibold text-ink-900">1. Choose a starting point</legend>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {MIX_PRESETS.map((p) => {
            const active = preset?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => setMix(p.mix)}
                className={cn(
                  "rounded-3xl border-2 p-5 text-left transition-colors",
                  active ? "border-banyan-900 bg-white shadow-[0_18px_40px_-28px_rgb(20_39_30/0.6)]" : "border-kasavu-200 bg-kasavu-50 hover:border-banyan-800",
                )}
              >
                <span className="block text-[20px] font-semibold text-ink-900">{p.label}</span>
                <span className="mt-1 block text-[17px] leading-snug text-ink-700">{p.line}</span>
                <MixBar mix={p.mix} className="mt-4" />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-[19px] font-semibold text-ink-900">2. Adjust it, if you like</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {MIX_KEYS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-3 rounded-3xl bg-white p-3 pl-5 ring-1 ring-kasavu-200">
              <span>
                <span className={cn("block text-[17px] font-semibold", MIX_STYLE[k].text)}>{MIX_STYLE[k].label}</span>
                <span className="block font-display text-[28px] leading-none text-ink-900">{mix[k]}%</span>
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMix((m) => adjustMix(m, k, -1))}
                  disabled={mix[k] === 0}
                  aria-label={`Less ${MIX_STYLE[k].label.toLowerCase()}`}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-kasavu-200 text-ink-900 hover:border-banyan-800 disabled:opacity-40"
                >
                  <Minus className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setMix((m) => adjustMix(m, k, 1))}
                  disabled={mix[k] === 100}
                  aria-label={`More ${MIX_STYLE[k].label.toLowerCase()}`}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-kasavu-200 text-ink-900 hover:border-banyan-800 disabled:opacity-40"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </button>
              </span>
            </div>
          ))}
        </div>
        <MixBar mix={mix} className="mt-5 h-4" />
      </fieldset>

      <h3 className="mt-10 text-[19px] font-semibold text-ink-900">3. Things a trip like this could include</h3>
      <p className="sr-only" aria-live="polite">
        Your mix: {describeMix(mix)}. Showing {examples.map((e) => e.title).join(", ")}.
      </p>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {examples.map((item) => (
          <li key={item.title} className="flex animate-[site-rise_600ms_ease-out_both] flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-kasavu-200 motion-reduce:animate-none">
            <div className={cn("relative flex h-40 items-center justify-center", MIX_STYLE[item.kind].tile)}>
              {item.photo ? (
                <Image src={`${item.photo.src}?auto=format&fit=crop&w=800&q=70`} alt={item.photo.alt} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" className="object-cover" />
              ) : (
                <item.Icon className="h-12 w-12" aria-hidden="true" />
              )}
              <span className={cn("absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[15px] font-semibold", MIX_STYLE[item.kind].text)}>
                {MIX_STYLE[item.kind].label}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h4 className="text-[20px] font-semibold text-ink-900">{item.title}</h4>
              <p className="mt-2 flex-1 leading-relaxed text-ink-700">{item.line}</p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-kasavu-200 pt-4 text-[17px]">
                <dt className="text-ink-600">Time</dt>
                <dd className="text-ink-800">{item.duration}</dd>
                <dt className="text-ink-600">You receive</dt>
                <dd className="text-ink-800">{item.receive}</dd>
                <dt className="text-ink-600">From</dt>
                <dd className="font-semibold text-ink-900">{formatPrice(item.priceFromEur)}</dd>
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
