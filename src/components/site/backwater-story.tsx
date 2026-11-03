"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CalendarCheck } from "lucide-react";
import { AppLink as Link } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Backwater } from "./three/backwater";
import { MOTION } from "./motion";

gsap.registerPlugin(ScrollTrigger);

export type StoryChapter = {
  time: string;
  eyebrow?: string;
  title: string;
  text: string;
  align?: "left" | "right" | "centre";
  cta?: boolean;
  /** The first chapter is the page's h1. */
  heading?: "h1" | "h2";
};

/**
 * The homepage story: one day on the backwaters, rendered in 3D behind the
 * chapters. The canvas stays fixed while the chapters scroll over it; scroll
 * position moves the canoe up the canal and the sun across the sky. The words
 * are ordinary page content in normal flow, so they read the same without
 * WebGL, without JavaScript and with reduced motion (which keeps the camera
 * still and only changes the hour from chapter to chapter).
 */
export function BackwaterStory({ chapters, phone }: { chapters: StoryChapter[]; phone?: string }) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef<HTMLParagraphElement>(null);
  const scrim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = section.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    let scene: Backwater | null = null;
    let frame = 0;
    let visible = true;
    let target = 0;
    let current = 0;
    let disposed = false;
    const still = !window.matchMedia(MOTION).matches;
    const start = performance.now();

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        // Reduced motion: hold each hour, no glide in between.
        target = still ? Math.round(self.progress * (chapters.length - 1)) / (chapters.length - 1) : self.progress;
        const i = Math.min(chapters.length - 1, Math.round(self.progress * (chapters.length - 1)));
        if (clock.current) clock.current.textContent = chapters[i].time;
        // The opening words sit on a soft shade that lifts as the journey begins.
        if (scrim.current) scrim.current.style.opacity = String(Math.max(0, 1 - self.progress * 9));
      },
    });

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && scene && !frame) frame = requestAnimationFrame(loop);
    });
    observer.observe(el);

    // Slow machines (software WebGL, or long frames) draw only while the
    // journey is actually moving, so the page itself stays responsive.
    let onDemand = false;
    let last = 0;
    let slowFrames = 0;
    function loop(now = performance.now()) {
      frame = 0;
      if (!scene || !visible) return;
      if (last && now - last > 50 && ++slowFrames === 20 && !onDemand) {
        scene.setPixelRatio(0.75);
        onDemand = true;
      }
      last = now;
      const moving = Math.abs(target - current) > 0.0004;
      current = still ? target : current + (target - current) * 0.06;
      if (!onDemand || moving) scene.update(current, still || onDemand ? 0 : (now - start) / 1000);
      frame = requestAnimationFrame(loop);
    }

    const resize = () => scene?.resize(cv.clientWidth, cv.clientHeight);
    window.addEventListener("resize", resize);

    import("./three/backwater")
      .then(({ createBackwater }) => {
        if (disposed) return;
        const lite = window.innerWidth < 768 || (navigator as Navigator & { deviceMemory?: number }).deviceMemory! < 4;
        scene = createBackwater(cv, { lite });
        onDemand = still || scene.software;
        resize();
        scene.update(0, 0);
        cv.dataset.ready = "";
        frame = requestAnimationFrame(loop);
      })
      .catch(() => {
        // No WebGL: the painted dawn behind the canvas stays.
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      trigger.kill();
      window.removeEventListener("resize", resize);
      scene?.dispose();
    };
  }, [chapters]);

  return (
    <section ref={section} aria-label="A day on the backwaters" className="relative bg-banyan-950 text-white">
      <div className="sticky top-0 -mb-[100svh] h-[100svh] overflow-hidden" aria-hidden="true">
        {/* Shown until the 3D scene is ready, or instead of it without WebGL */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#c9d0c6_0%,#efcfae_42%,#f6e2bf_55%,#3b5546_56%,#1a2c22_100%)]" />
        <canvas ref={canvas} className="absolute inset-0 h-full w-full opacity-0 data-[ready]:opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(10_20_15/0.45)_100%)]" />
        <div ref={scrim} className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-banyan-950/90 via-banyan-950/50 to-transparent" />
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3">
          <span className="h-px w-10 bg-gold-300/70" />
          <p ref={clock} className="font-display text-[22px] italic text-kasavu-50 [text-shadow:0_1px_12px_rgb(0_0_0/0.5)]">
            {chapters[0].time}
          </p>
          <span className="h-px w-10 bg-gold-300/70" />
        </div>
      </div>

      <div className="relative">
        {chapters.map((c, i) => {
          const Heading = c.heading ?? "h2";
          return (
            <div
              key={c.title}
              className={cn(
                "mx-auto flex max-w-7xl px-4 sm:px-8",
                i === 0 ? "min-h-[100svh] items-end pb-16 pt-40 sm:pb-20" : "min-h-[140svh] items-center",
                c.align === "right" && "justify-end",
                c.align === "centre" && "justify-center text-center",
              )}
            >
              <div
                data-reveal={i === 0 ? undefined : ""}
                className={cn(
                  "max-w-2xl rounded-[32px] p-7 sm:p-10",
                  i === 0 ? "max-w-4xl p-0 sm:p-0 [text-shadow:0_2px_24px_rgb(0_0_0/0.45)]" : "bg-banyan-950/45 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8)] ring-1 ring-white/10 backdrop-blur-md",
                )}
              >
                <p className="text-[16px] font-semibold uppercase tracking-[0.22em] text-gold-300">{c.eyebrow ?? c.time}</p>
                <Heading className={cn("mt-4 font-display font-medium leading-[1.05] tracking-tight", i === 0 ? "text-[44px] sm:text-[68px] lg:text-[84px]" : "text-[36px] sm:text-[52px]")}>
                  {c.title}
                </Heading>
                <p className={cn("mt-6 leading-relaxed text-white/95", i === 0 ? "max-w-2xl text-[20px] sm:text-[23px]" : "text-[19px] sm:text-[21px]")}>{c.text}</p>
                {c.cta && (
                  <div className={cn("mt-9 flex flex-col gap-4 sm:flex-row sm:items-center", c.align === "centre" && "sm:justify-center")}>
                    <Link href="/talk" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-gold-300 px-8 text-[18px] font-semibold text-banyan-950 transition-colors hover:bg-kasavu-50">
                      <CalendarCheck className="h-5 w-5" aria-hidden="true" /> Book a free conversation
                    </Link>
                    <p className="text-[17px] text-white/90">
                      Free, with a person, no obligation.
                      {phone && (
                        <>
                          {" "}Or call{" "}
                          <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="font-semibold underline underline-offset-4">
                            {phone}
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
