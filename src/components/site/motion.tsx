"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);

export const MOTION = "(prefers-reduced-motion: no-preference)";

const EASE = "power4.out";
/** Fires as the element's top passes 88% of the screen, once. */
const onEnter = (trigger: Element, start = "top 88%") => ({ trigger, start, once: true });

/**
 * The site's motion, driven by data attributes so pages stay server components.
 * The server-rendered page is already the finished state: nothing is hidden if
 * this script never runs, and reduced motion skips all of it (Lenis included).
 *
 * Text
 *   .site-head            headings rise line by line out of a mask
 *   data-split="chars"    big words rise letter by letter, each tipping upright
 *   data-split="words"    a paragraph arrives word by word
 *   data-scrub            a statement lights up word by word as you scroll through it
 *   data-rise             its other children rise and fade in, one after another
 *   data-rise="left"      ... sliding in from the left instead
 * Pictures
 *   data-photo            wipes open upwards while the picture settles, then drifts with the scroll
 *   data-wipe             a picture opens from its left edge
 *   data-shutter          the page's first photograph opens on arrival
 *   data-drift            a photograph slowly enlarges as its section scrolls away
 * Scenes
 *   data-hero             the homepage title: letters rise after the shutter, then lift away on scroll
 *   data-chapter          a Why Kerala chapter: photo settles, word assembles, sentence follows
 *   data-hscroll          a sticky track that moves sideways as you scroll down
 *   data-marquee          a line of words that slides sideways with the scroll
 *   data-progress         a bar that fills as its section is read
 *   data-count            a number that counts up to its value
 */
export function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const mm = gsap.matchMedia();
    let lenis: Lenis | undefined;

    mm.add(MOTION, () => {
      // Smooth, weighted scrolling with the wheel; touch scrolling stays native.
      lenis = new Lenis({ lerp: 0.1, anchors: { offset: -96 } });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      heroScene();
      chapterScenes();

      for (const el of gsap.utils.toArray<HTMLElement>("[data-shutter]")) {
        gsap
          .timeline()
          .fromTo(el, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "power4.inOut" })
          .fromTo(el.querySelector("img"), { scale: 1.15 }, { scale: 1, duration: 2, ease: "power3.out" }, 0);
      }
      for (const el of gsap.utils.toArray<HTMLElement>("[data-drift]")) {
        gsap.fromTo(el, { scale: 1 }, { scale: 1.12, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top top", end: "bottom top", scrub: true } });
      }

      // Headings: each line slides up out of its own mask.
      for (const el of gsap.utils.toArray<HTMLElement>(".site-head:not([data-hero] *)")) {
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, { yPercent: 110, duration: 1.2, ease: EASE, stagger: 0.12, scrollTrigger: onEnter(el) }),
        });
      }
      for (const el of gsap.utils.toArray<HTMLElement>('[data-split="chars"]:not([data-chapter] *)')) {
        SplitText.create(el, {
          type: "chars",
          mask: "chars",
          onSplit: (self) =>
            gsap.from(self.chars, { yPercent: 115, rotate: 8, duration: 1.1, ease: EASE, stagger: 0.035, scrollTrigger: onEnter(el, "top 92%") }),
        });
      }
      for (const el of gsap.utils.toArray<HTMLElement>('[data-split="words"]')) {
        SplitText.create(el, {
          type: "words",
          onSplit: (self) =>
            gsap.from(self.words, { opacity: 0, y: 14, filter: "blur(6px)", duration: 0.9, ease: "power3.out", stagger: 0.025, scrollTrigger: onEnter(el) }),
        });
      }
      // Statements light up as you read them; they start dim but legible.
      for (const el of gsap.utils.toArray<HTMLElement>("[data-scrub]")) {
        SplitText.create(el, {
          type: "words",
          onSplit: (self) =>
            gsap.fromTo(self.words, { opacity: 0.28 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true } }),
        });
      }

      for (const el of gsap.utils.toArray<HTMLElement>("[data-rise]")) {
        if (el.matches(".site-head, [data-split], [data-scrub]")) continue;
        const children = [...el.children].filter((c) => !c.matches(".site-head, [data-split], [data-scrub]"));
        const left = el.dataset.rise === "left";
        gsap.from(children, { x: left ? -48 : 0, y: left ? 0 : 32, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.09, scrollTrigger: onEnter(el, "top 92%") });
      }

      // Photographs wipe open from the bottom edge, then drift against the scroll.
      for (const el of gsap.utils.toArray<HTMLElement>("[data-photo]")) {
        const inner = el.firstElementChild as HTMLElement;
        gsap.set(inner, { scale: 1.12 });
        gsap
          .timeline({ scrollTrigger: onEnter(el, "top 90%") })
          .fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "power4.inOut" })
          .from(inner, { scale: 1.4, duration: 1.8, ease: "power3.out" }, 0);
        gsap.fromTo(inner, { yPercent: -5 }, { yPercent: 5, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      }

      for (const el of gsap.utils.toArray<HTMLElement>("[data-wipe]")) {
        gsap.fromTo(el, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "power4.inOut", scrollTrigger: onEnter(el) });
      }
      for (const el of gsap.utils.toArray<HTMLElement>("[data-marquee]")) {
        const dir = el.dataset.marquee === "right" ? 1 : -1;
        gsap.fromTo(el, { xPercent: dir === -1 ? 0 : -30 }, { xPercent: dir === -1 ? -30 : 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.4 } });
      }
      for (const el of gsap.utils.toArray<HTMLElement>("[data-progress]")) {
        gsap.fromTo(el, { scaleY: 0 }, { scaleY: 1, ease: "none", transformOrigin: "top", scrollTrigger: { trigger: el.closest("section"), start: "top 60%", end: "bottom 70%", scrub: true } });
      }
      for (const el of gsap.utils.toArray<HTMLElement>("[data-count]")) {
        const target = Number(el.dataset.count);
        const counter = { v: 0 };
        gsap.to(counter, { v: target, duration: 1.6, ease: "power2.out", scrollTrigger: onEnter(el), onUpdate: () => (el.textContent = String(Math.round(counter.v))) });
      }

      return () => {
        gsap.ticker.remove(raf);
        lenis?.destroy();
        lenis = undefined;
      };
    });

    // Sideways journeys need the room of a wide screen; phones keep the swipeable row.
    mm.add(`${MOTION} and (min-width: 768px)`, () => {
      const sections = gsap.utils.toArray<HTMLElement>("[data-hscroll]");
      for (const el of sections) {
        el.setAttribute("data-on", "");
        const track = el.querySelector<HTMLElement>("[data-track]");
        if (!track) continue;
        gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true },
        });
        // Each card's picture eases into place as the row slides.
        for (const img of gsap.utils.toArray<HTMLElement>(track.querySelectorAll("[data-card-photo]"))) {
          gsap.fromTo(img, { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: true } });
        }
      }
      ScrollTrigger.refresh();
      return () => sections.forEach((el) => el.removeAttribute("data-on"));
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

/** The homepage title: "Kerala" assembles after the shutter, then lifts away as you scroll on. */
function heroScene() {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;
  const word = hero.querySelector<HTMLElement>("[data-hero-word]");
  const rest = hero.querySelectorAll<HTMLElement>("[data-hero-rest]");
  if (!word) return;
  const split = SplitText.create(word, { type: "chars", mask: "chars" });
  gsap
    .timeline({ delay: 0.5 })
    .from(split.chars, { yPercent: 110, duration: 1.3, ease: EASE, stagger: 0.06 })
    .from(rest, { y: 28, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.12 }, 0.4);
  gsap.to(word, { yPercent: -35, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
  gsap.to(rest, { y: -80, opacity: 0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "60% top", scrub: true } });
}

/** Why Kerala: each chapter's photo settles while its word assembles and its sentence follows. */
function chapterScenes() {
  for (const ch of gsap.utils.toArray<HTMLElement>("[data-chapter]")) {
    const photo = ch.querySelector<HTMLElement>("[data-chapter-photo]");
    const word = ch.querySelector<HTMLElement>("[data-chapter-word]");
    const text = ch.querySelector<HTMLElement>("[data-chapter-text]");
    if (!photo || !word || !text) continue;
    gsap.fromTo(photo, { scale: 1.3 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ch, start: "top bottom", end: "bottom bottom", scrub: true } });
    const split = SplitText.create(word, { type: "chars", mask: "chars" });
    gsap
      .timeline({ scrollTrigger: { trigger: ch, start: "top 35%", toggleActions: "play none none reverse" } })
      .from(split.chars, { yPercent: 120, rotate: 10, duration: 1.1, ease: EASE, stagger: { each: 0.045, from: "center" } })
      .from(text, { y: 30, opacity: 0, duration: 0.9, ease: "power3.out" }, 0.35);
  }
}
