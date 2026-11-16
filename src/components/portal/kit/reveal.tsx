"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mounted once by the portal layout. Marks below-the-fold `[data-reveal]`
 * elements ("wipe" for photos, "rise" for sections) as pending, then plays
 * them once as their top passes 88% of the screen. Anything already on screen
 * is left exactly as the server rendered it; reduced motion skips all of it.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.revealState = "in";
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-reveal-state])")) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.88) continue;
      el.dataset.revealState = "pending";
      io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
