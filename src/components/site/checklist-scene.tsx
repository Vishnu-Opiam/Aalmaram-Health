"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { DESKTOP, MOTION } from "./motion";

/**
 * Scene — "so we go and look". The problem is set out in large type, then
 * each thing we check is ticked off in turn as you scroll (desktop pins the
 * section). Phones and reduced motion see the finished list.
 */
export function ChecklistScene({
  id,
  eyebrow,
  problem,
  answer,
  items,
  children,
}: {
  id: string;
  eyebrow: string;
  problem: string;
  answer: string;
  items: { title: string; text: string }[];
  children?: React.ReactNode;
}) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const mm = gsap.matchMedia();

    mm.add(`${MOTION} and ${DESKTOP}`, () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=180%",
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
        defaults: { ease: "none" },
      });
      tl.fromTo(
        q("[data-problem] [data-word]"),
        { opacity: 0.18 },
        { opacity: 1, stagger: 0.05, duration: 0.5 },
      )
        .fromTo(
          q("[data-answer]"),
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.3 },
        )
        .fromTo(
          q("[data-item]"),
          { opacity: 0.25 },
          { opacity: 1, stagger: 0.35, duration: 0.3 },
          "+=0.1",
        );
      for (const [i, tick] of (
        q("[data-tick]") as unknown as SVGPathElement[]
      ).entries()) {
        const length = tick.getTotalLength();
        tick.style.strokeDasharray = `${length}`;
        tl.fromTo(
          tick,
          { strokeDashoffset: length },
          { strokeDashoffset: 0, duration: 0.25 },
          `<${i === 0 ? "" : "-0.2"}`,
        );
      }
      tl.to({}, { duration: 0.3 });
    });

    mm.add(`${MOTION} and (max-width: 1023px)`, () => {
      gsap.from(q("[data-item]"), {
        opacity: 0,
        y: 40,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: q("[data-items]")[0],
          start: "top 85%",
          once: true,
        },
      });
    });

    return () => mm.revert();
  }, []);

  // GSAP wraps a pinned section in its own spacer; this wrapper keeps the
  // element React removes on navigation the one React put there.
  return (
    <div>
      <section
        ref={root}
        id={id}
        aria-labelledby={`${id}-title`}
        className="scroll-mt-24 bg-kasavu-100 lg:flex lg:h-[100svh] lg:items-center"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-0">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.22em] text-gold-700">
              {eyebrow}
            </p>
            <h2
              id={`${id}-title`}
              data-problem
              className="mt-5 font-display text-[32px] font-medium leading-[1.2] tracking-tight text-banyan-900 sm:text-[44px]"
            >
              {problem.split(" ").map((w, i) => (
                <span key={i} data-word="">
                  {w}{" "}
                </span>
              ))}
            </h2>
            <p
              data-answer
              className="mt-8 font-display text-[40px] italic leading-tight text-laterite-600 sm:text-[56px]"
            >
              {answer}
            </p>
            {children}
          </div>
          <ol data-items className="space-y-5 self-center">
            {items.map((item) => (
              <li
                key={item.title}
                data-item
                className="flex gap-5 border-b border-kasavu-200 pb-5 last:border-0"
              >
                <svg
                  viewBox="0 0 40 40"
                  className="h-10 w-10 shrink-0"
                  aria-hidden="true"
                  focusable="false"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="#b08a3e"
                    strokeWidth="1.5"
                  />
                  <path
                    data-tick
                    d="M12 21 L18 27 L29 14"
                    fill="none"
                    stroke="#1f3b2d"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <h3 className="text-[20px] font-semibold text-ink-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 leading-relaxed text-ink-700">
                    {item.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
