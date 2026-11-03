"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DESKTOP, MOTION } from "./motion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Numbered steps with a large step number that stays in view and rolls over
 * to the next as each step reaches the middle of the screen, while a gold
 * line fills to show how far along you are (desktop). Phones get the steps
 * as a simple numbered list.
 */
export function StepsScene({ steps }: { steps: { title: string; text: string; children?: React.ReactNode }[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const mm = gsap.matchMedia();
    mm.add(`${MOTION} and ${DESKTOP}`, () => {
      const digits = q("[data-digit]") as HTMLElement[];
      gsap.set(digits, { yPercent: (i) => (i === 0 ? 0 : 100), opacity: (i) => (i === 0 ? 1 : 0) });
      let active = 0;
      const show = (i: number) => {
        if (i === active) return;
        gsap.to(digits[active], { yPercent: i > active ? -100 : 100, opacity: 0, duration: 0.7, ease: "power3.inOut" });
        gsap.fromTo(digits[i], { yPercent: i > active ? 100 : -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: "power3.inOut" });
        active = i;
      };
      const list = q("ol")[0];
      ScrollTrigger.create({ trigger: list, start: "top 55%", end: "bottom 55%", onUpdate: (self) => show(Math.min(digits.length - 1, Math.floor(self.progress * digits.length))) });
      for (const step of q("[data-step]") as HTMLElement[]) {
        gsap.fromTo(step, { opacity: 0.3 }, { opacity: 1, ease: "none", scrollTrigger: { trigger: step, start: "top 80%", end: "top 50%", scrub: true } });
      }
      gsap.fromTo(q("[data-line]"), { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: q("ol")[0], start: "top 55%", end: "bottom 55%", scrub: true } });
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={root} className="grid gap-10 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-20">
      <div className="hidden lg:block">
        <div className="sticky top-32 flex items-start gap-8">
          <div className="relative h-[260px] w-[2px] bg-kasavu-200">
            <span data-line className="absolute inset-0 origin-top bg-gold-500" />
          </div>
          <div className="relative h-[220px] flex-1 overflow-hidden" aria-hidden="true">
            {steps.map((_, i) => (
              <span key={i} data-digit className="absolute inset-0 font-display text-[220px] font-medium leading-none text-banyan-900 opacity-0 first:opacity-100">
                {String(i + 1).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>
      </div>
      <ol className="space-y-16 lg:space-y-[28vh] lg:py-[12vh]">
        {steps.map((step, i) => (
          <li key={step.title} data-step className="max-w-xl">
            <p className="font-display text-[22px] text-gold-700">Step {i + 1}</p>
            <h3 className="mt-1 font-display text-[32px] font-medium leading-tight text-banyan-900 sm:text-[40px]">{step.title}</h3>
            <p className="mt-4 text-[19px] leading-relaxed text-ink-700 sm:text-[20px]">{step.text}</p>
            {step.children}
          </li>
        ))}
      </ol>
    </div>
  );
}
