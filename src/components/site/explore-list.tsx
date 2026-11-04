"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PHOTOS, type Experience } from "@/app/(site)/content";
import { formatPrice } from "@/domain/site/prices";
import { cn } from "@/lib/utils";

const photoUrl = (src: string, width: number) => `${src}?auto=format&fit=crop&w=${width}&q=72`;
const FALLBACK = { health: PHOTOS.check, wellness: PHOTOS.dhara, culture: PHOTOS.kathakaliStage } as const;

/**
 * What you can do in Kerala, as a list beside one photograph. The row in the
 * middle of the screen (or the one you point at, tap or tab to) opens its
 * details and brings its photograph forward. Without script every row is a
 * plain disclosure button and the first one is open.
 */
export function ExploreList({ items }: { items: Experience[] }) {
  const [active, setActive] = useState(0);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const photos = items.map((item) => item.photo ?? FALLBACK[item.kind]);

  // The row crossing the middle band of the screen becomes the open one.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    for (const row of rows.current) if (row) io.observe(row);
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 md:grid-cols-12 md:gap-0">
      {/* Phones: a band pinned under the header. Wider screens: a 4:5 print that stays put. */}
      <div data-wipe className="sticky top-20 z-10 -mx-5 h-[38svh] sm:-mx-8 md:top-[14vh] md:col-span-5 md:mx-0 md:aspect-[4/5] md:h-auto md:self-start">
        {photos.map((photo, i) => (
          <Image
            key={`${photo.src}-${i}`}
            src={photoUrl(photo.src, 1400)}
            alt={i === active ? photo.alt : ""}
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className={cn("object-cover transition-[opacity,transform] duration-700 ease-out", i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0")}
          />
        ))}
      </div>

      <ul data-rise className="md:col-span-6 md:col-start-7 md:py-[14vh]">
        {items.map((item, i) => {
          const open = i === active;
          return (
            <li
              key={item.title}
              ref={(el) => {
                rows.current[i] = el;
              }}
              data-index={i}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`explore-${i}`}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={cn(
                  "flex min-h-[64px] w-full cursor-pointer items-baseline justify-between gap-6 py-3 text-left transition-colors duration-300",
                  open ? "text-mist-ink" : "text-mist-muted hover:text-mist-ink",
                )}
              >
                <span className="site-display text-[clamp(1.75rem,1.2rem+1.6vw,2.6rem)] leading-tight">{item.title}</span>
                <span className="shrink-0 text-[15px] tabular-nums">from {formatPrice(item.priceFromEur)}</span>
              </button>
              <div id={`explore-${i}`} hidden={!open} className="max-w-[34rem] pb-6 text-mist-ink">
                <p className="leading-relaxed">
                  {item.line} <span className="text-mist-muted">{item.duration}. {item.receive}.</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
