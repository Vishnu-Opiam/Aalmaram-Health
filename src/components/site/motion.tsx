"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const MOTION = "(prefers-reduced-motion: no-preference)";
export const DESKTOP = "(min-width: 1024px)";

/**
 * Site-wide motion, driven by data attributes so pages stay server components:
 *   data-reveal            rises and fades in once
 *   data-stagger           its children rise in one after another
 *   data-parallax="0.3"    drifts against the scroll (desktop)
 *   data-zoom              a photo settles from 1.2x to 1x as it passes
 *   data-clip              a photo opens from a framed window to its full size
 * Scenes (hero, banyan, journey) set up their own timelines. Nothing runs for
 * reduced motion, and the server-rendered page is already the finished state.
 */
export function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add({ motion: MOTION, desktop: DESKTOP }, (context) => {
      const { motion, desktop } = context.conditions as { motion: boolean; desktop: boolean };
      if (!motion) return;

      for (const el of gsap.utils.toArray<HTMLElement>("[data-reveal], .site-reveal")) {
        gsap.from(el, { y: 48, opacity: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      }
      for (const el of gsap.utils.toArray<HTMLElement>("[data-stagger]")) {
        gsap.from(el.children, { y: 56, opacity: 0, duration: 1.1, ease: "power3.out", stagger: 0.12, scrollTrigger: { trigger: el, start: "top 85%", once: true } });
      }
      for (const el of gsap.utils.toArray<HTMLElement>("[data-zoom], .site-zoom")) {
        gsap.fromTo(el, { scale: 1.22 }, { scale: 1, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      }
      for (const el of gsap.utils.toArray<HTMLElement>("[data-clip]")) {
        gsap.fromTo(
          el,
          { clipPath: "inset(14% 10% 14% 10% round 32px)" },
          { clipPath: "inset(0% 0% 0% 0% round 28px)", ease: "none", scrollTrigger: { trigger: el, start: "top 95%", end: "top 25%", scrub: 1 } },
        );
      }
      if (desktop) {
        for (const el of gsap.utils.toArray<HTMLElement>("[data-parallax]")) {
          const speed = Number(el.dataset.parallax) || 0.2;
          gsap.fromTo(el, { yPercent: -speed * 50 }, { yPercent: speed * 50, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
        }
      }
    });
    // Scenes above may have pinned sections; measure everything again once fonts and images settle.
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
