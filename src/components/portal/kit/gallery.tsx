"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUrlPanel } from "../sheet";
import { buttonClass } from "./button";
import { type Kind } from "./module";
import { Photo, type PhotoSource } from "./photo";

const round =
  "inline-flex h-12 w-12 items-center justify-center rounded-full bg-night/70 text-night-ink transition-colors hover:bg-night";

/**
 * A place's photographs. Desktop: a 3:2 lead with two squares beside it, "See
 * all N photos" on the last. Phones: a swipeable 4:5 strip (native scroll-snap)
 * with a "1 / 7" counter and ‹ › buttons. Any photo opens the Lightbox, kept in
 * the URL (`?photo=2`, or `panelKey`) so Back closes it. No photos: the typographic card.
 */
export function Gallery({
  photos,
  name,
  kind,
  panelKey = "photo",
  className,
}: {
  photos: PhotoSource[];
  name: string;
  kind?: Kind;
  /** The URL key for the open photo; give each gallery on a page its own. */
  panelKey?: string;
  className?: string;
}) {
  const [open, setOpen, close] = useUrlPanel(panelKey);
  const strip = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const index = open === null ? null : Math.min(Math.max(Number(open) || 0, 0), photos.length - 1);

  if (photos.length === 0) return <Photo ratio="3/2" sizes="100vw" fallback={{ title: name, kind }} className={className} />;

  const go = (i: number) => {
    const el = strip.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const tile = (i: number, ratio: string | undefined, sizes: string, extra?: string) => (
    <button
      type="button"
      onClick={() => setOpen(String(i))}
      className={cn("block w-full", extra)}
      aria-label={`Open photo ${i + 1} of ${photos.length}: ${photos[i].alt}`}
    >
      <Photo photo={photos[i]} ratio={ratio} sizes={sizes} zoom className={ratio ? undefined : "h-full"} />
    </button>
  );

  return (
    <div className={className}>
      {/* Phones */}
      <div className="relative md:hidden">
        <div
          ref={strip}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
          onScroll={(e) => setAt(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {photos.map((p, i) => (
            <div key={p.src} className="w-full shrink-0 snap-start">
              {tile(i, "4/5", "100vw")}
            </div>
          ))}
        </div>
        {photos.length > 1 && (
          <>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-night/70 px-3 py-1 text-[15px] font-medium tabular-nums text-night-ink">
              {at + 1} / {photos.length}
            </span>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button type="button" className={round} onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous photo">
                <ChevronLeft className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button type="button" className={round} onClick={() => go(at + 1)} disabled={at === photos.length - 1} aria-label="Next photo">
                <ChevronRight className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Desktop */}
      <div className={cn("hidden gap-2 md:grid", photos.length > 2 ? "grid-cols-[3fr_1fr]" : photos.length === 2 ? "grid-cols-2" : "")}>
        {tile(0, photos.length === 1 ? "3/2" : photos.length === 2 ? "1/1" : undefined, "(min-width: 768px) 75vw, 100vw", "row-span-2 h-full")}
        {photos.length === 2 && tile(1, "1/1", "50vw")}
        {photos.length > 2 && (
          <>
            {tile(1, "1/1", "25vw")}
            <div className="relative">
              {tile(2, "1/1", "25vw")}
              {photos.length > 3 && (
                <button
                  type="button"
                  onClick={() => setOpen("2")}
                  className={buttonClass("primary", "pk-on-photo absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap")}
                >
                  See all {photos.length} photos
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {index !== null && <Lightbox photos={photos} index={index} onIndex={(i) => setOpen(String(i))} onClose={close} label={`Photos of ${name}`} />}
    </div>
  );
}

/**
 * One photograph at a time on night: ‹ › buttons (56px), the counter, the
 * caption and credit. ← → step, Esc closes, Tab stays inside, focus returns
 * to whatever opened it. Never advances by itself.
 */
export function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
  label,
}: {
  photos: PhotoSource[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const keys = useRef({ index, onIndex, onClose, count: photos.length });
  keys.current = { index, onIndex, onClose, count: photos.length };

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      if (e.key === "Escape") k.onClose();
      else if (e.key === "ArrowLeft" && k.index > 0) k.onIndex(k.index - 1);
      else if (e.key === "ArrowRight" && k.index < k.count - 1) k.onIndex(k.index + 1);
      else if (e.key === "Tab" && ref.current) {
        // Only what is actually showing: the ‹ › pair differs between phone and desktop.
        const all = [...ref.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")].filter((el) => el.getClientRects().length > 0);
        const first = all[0];
        const last = all[all.length - 1];
        const wrapTo = e.shiftKey ? (document.activeElement === first ? last : null) : document.activeElement === last ? first : null;
        if (wrapTo) {
          e.preventDefault();
          wrapTo.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  const photo = photos[index];
  const step = "inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-night-ink/40 text-night-ink transition-colors hover:border-night-ink disabled:opacity-30";
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className="pk-night portal-fade fixed inset-0 z-[70] flex flex-col">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8">
        <p className="text-[17px] font-medium tabular-nums text-night-muted" aria-live="polite">
          {index + 1} / {photos.length}
        </p>
        <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-[17px] font-medium hover:bg-night-raised">
          <X className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" /> Close
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center gap-2 px-2 md:gap-6 md:px-8">
        <button type="button" className={cn(step, "max-md:hidden")} onClick={() => onIndex(index - 1)} disabled={index === 0} aria-label="Previous photo">
          <ChevronLeft className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
        </button>
        <Photo key={photo.src} photo={photo} fit="contain" sizes="100vw" className="portal-fade h-full flex-1 bg-transparent" />
        <button type="button" className={cn(step, "max-md:hidden")} onClick={() => onIndex(index + 1)} disabled={index === photos.length - 1} aria-label="Next photo">
          <ChevronRight className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-end justify-between gap-4 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 md:px-8 md:pb-8">
        <div className="min-w-0 max-w-[60ch]">
          <p className="text-[17px] leading-snug">{photo.alt}</p>
          {photo.credit && (
            <p className="mt-1 text-[15px] text-night-muted">
              Photograph:{" "}
              {photo.href ? (
                <a href={photo.href} className="underline underline-offset-2 hover:text-night-ink" rel="noopener noreferrer" target="_blank">
                  {photo.credit}
                </a>
              ) : (
                photo.credit
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2 md:hidden">
          <button type="button" className={step} onClick={() => onIndex(index - 1)} disabled={index === 0} aria-label="Previous photo">
            <ChevronLeft className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button type="button" className={step} onClick={() => onIndex(index + 1)} disabled={index === photos.length - 1} aria-label="Next photo">
            <ChevronRight className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
