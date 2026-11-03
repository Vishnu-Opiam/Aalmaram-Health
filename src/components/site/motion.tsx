"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const MOTION = "(prefers-reduced-motion: no-preference)";

/**
 * Site-wide motion, driven by data attributes so pages stay server components:
 *   data-shutter   the page's first photograph opens upwards from its bottom edge
 *                  while the picture settles from 1.12x (the one loud moment)
 *   data-drift     a photograph slowly enlarges as its section scrolls away
 *   data-rise      its children rise 24px and fade in, one after another, once
 * The server-rendered page is already the finished state, so nothing is hidden
 * if this script never runs; reduced motion skips all of it.
 */
export function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      for (const el of gsap.utils.toArray<HTMLElement>("[data-shutter]")) {
        gsap
          .timeline()
          .fromTo(el, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power4.inOut" })
          .fromTo(el.querySelector("img"), { scale: 1.12 }, { scale: 1, duration: 1.8, ease: "power3.out" }, 0);
      }
      for (const el of gsap.utils.toArray<HTMLElement>("[data-drift]")) {
        gsap.fromTo(el, { scale: 1 }, { scale: 1.12, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top top", end: "bottom top", scrub: true } });
      }
      for (const el of gsap.utils.toArray<HTMLElement>("[data-rise]")) {
        gsap.from(el.children, {
          y: 24,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top bottom", once: true },
        });
      }
    });
    // Measure again once fonts and photographs have settled the layout.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh);
    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, [pathname]);

  return null;
}
