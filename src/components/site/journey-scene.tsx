"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { Ship, Stethoscope } from "lucide-react";
import type { Photo } from "@/app/(site)/content";
import { DESKTOP, MOTION } from "./motion";

export type JourneyPanel = {
  when: string;
  title: string;
  text: string;
  photo?: Photo;
};

const photoUrl = (src: string, width: number) =>
  `${src}?auto=format&fit=crop&w=${width}&q=72`;

/**
 * Scene — a journey, day by day. Desktop pins the section and scrolls the
 * days sideways while a little boat travels the route along the top; each
 * photo drifts inside its frame. Phones and reduced motion get the same days
 * as a plain vertical story.
 */
export function JourneyScene({
  id,
  eyebrow,
  title,
  intro,
  panels,
  footer,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  panels: JourneyPanel[];
  footer?: React.ReactNode;
}) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const mm = gsap.matchMedia();

    mm.add(`${MOTION} and ${DESKTOP}`, () => {
      el.dataset.pinned = "";
      const track = q("[data-track]")[0] as HTMLElement;
      const distance = () => track.scrollWidth - window.innerWidth;
      const move = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${distance()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      const route = q("[data-route]")[0] as HTMLElement;
      gsap.fromTo(
        q("[data-boat]"),
        { x: 0 },
        {
          x: () => route.offsetWidth,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        },
      );
      gsap.fromTo(
        q("[data-route]"),
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 1,
          },
        },
      );
      for (const img of q("[data-panel-photo]") as HTMLElement[]) {
        gsap.fromTo(
          img,
          { xPercent: -8 },
          {
            xPercent: 8,
            ease: "none",
            scrollTrigger: {
              trigger: img.parentElement,
              containerAnimation: move,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );
      }
      return () => delete el.dataset.pinned;
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
        className="group relative overflow-hidden bg-kasavu-50 data-[pinned]:h-[100svh]"
      >
        <div className="flex h-full flex-col">
          <div className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 group-data-[pinned]:pt-24">
            <p className="text-[16px] font-semibold uppercase tracking-[0.22em] text-gold-700">
              {eyebrow}
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <h2
                id={`${id}-title`}
                className="max-w-2xl font-display text-[36px] font-medium leading-[1.08] tracking-tight text-banyan-900 sm:text-[52px]"
              >
                {title}
              </h2>
              <p className="max-w-md text-[19px] leading-relaxed text-ink-700">
                {intro}
              </p>
            </div>
            {/* The route: a line that fills as you travel, and the boat on it */}
            <div
              aria-hidden="true"
              className="relative mt-8 hidden h-8 group-data-[pinned]:block"
            >
              <div className="absolute inset-x-0 top-1/2 h-px bg-kasavu-200" />
              <div
                data-route
                className="absolute inset-x-0 top-1/2 h-[2px] origin-left bg-gold-500"
              />
              <span
                data-boat
                className="absolute -left-3 top-0 rounded-full bg-banyan-900 p-1.5 text-gold-300"
              >
                <Ship className="h-4 w-4" />
              </span>
            </div>
          </div>

          <ol
            data-track
            className="mt-10 grid gap-6 px-4 pb-16 sm:px-6 group-data-[pinned]:mt-8 group-data-[pinned]:flex group-data-[pinned]:flex-1 group-data-[pinned]:gap-8 group-data-[pinned]:pb-14 group-data-[pinned]:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] group-data-[pinned]:pr-[20vw] md:grid-cols-2"
          >
            {panels.map((p) => (
              <li
                key={p.title}
                className="flex flex-col overflow-hidden rounded-[28px] bg-white ring-1 ring-kasavu-200 group-data-[pinned]:w-[min(560px,42vw)] group-data-[pinned]:shrink-0"
              >
                <div className="relative min-h-56 flex-1 overflow-hidden bg-lagoon-50">
                  {p.photo ? (
                    <div data-panel-photo className="absolute inset-[-10%]">
                      <Image
                        src={photoUrl(p.photo.src, 1200)}
                        alt={p.photo.alt}
                        fill
                        sizes="(min-width: 1024px) 42vw, (min-width: 768px) 45vw, 92vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-lagoon-700">
                      <Stethoscope className="h-20 w-20" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="p-6 sm:p-7">
                  <p className="text-[16px] font-semibold uppercase tracking-[0.18em] text-gold-700">
                    {p.when}
                  </p>
                  <h3 className="mt-2 font-display text-[28px] font-medium leading-tight text-banyan-900">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[18px] leading-relaxed text-ink-700">
                    {p.text}
                  </p>
                </div>
              </li>
            ))}
            {footer && (
              <li className="flex flex-col justify-center rounded-[28px] bg-banyan-900 p-8 text-white group-data-[pinned]:w-[min(460px,34vw)] group-data-[pinned]:shrink-0">
                {footer}
              </li>
            )}
          </ol>
        </div>
      </section>
    </div>
  );
}
