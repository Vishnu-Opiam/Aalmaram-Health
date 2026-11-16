"use client";

import { Lightbox, Photo } from "@/components/portal/kit";
import { useUrlPanel } from "@/components/portal/sheet";
import type { PlacePhoto } from "@/domain/trips/builder-view";
import { cn } from "@/lib/utils";
import { isRender, toPhoto } from "./model";

const ratio = (p: PlacePhoto) => Math.min(Math.max(p.width / p.height, 0.75), 3);

/** Rows of `size`, never leaving a single photo alone on the last row. */
function rows<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  const last = out[out.length - 1];
  if (out.length > 1 && last.length === 1) {
    const prev = out[out.length - 2];
    out[out.length - 2] = prev.slice(0, -1);
    out[out.length - 1] = [prev[prev.length - 1], ...last];
  }
  return out;
}

/**
 * A place's photographs as justified rows: every photo at its own shape
 * (panoramas stay wide, portraits stay tall), all in a row the same height,
 * so nothing is cropped into a shape it wasn't taken in. Each opens the
 * lightbox (`?photo=`, so Back closes it). Design renders say so on the photo.
 * `skip` leaves out the photos already shown above (the hero) from the rows,
 * not from the lightbox.
 */
export function PlaceGallery({ photos, name, skip = 0 }: { photos: PlacePhoto[]; name: string; skip?: number }) {
  const [open, setOpen, close] = useUrlPanel("photo");
  const sources = photos.map(toPhoto);
  const rest = photos.map((p, i) => ({ p, i })).slice(skip);
  if (rest.length === 0) return null;
  const index = open === null ? null : Math.min(Math.max(Number(open) || 0, 0), photos.length - 1);

  // Rows are as tall as their photos need to share the width, up to `maxH`; a row with a portrait in it then crops a little instead of towering.
  const grid = (max: number, per: number, maxH: number, className: string) => {
    const shown = rest.slice(0, max);
    const hidden = photos.length - shown.length - skip;
    const lines = rows(shown, per);
    return (
      <div className={cn("space-y-2 @container", className)}>
        {lines.map((row, r) => (
          <div
            key={row[0].i}
            className="flex gap-2"
            style={{ height: `min(${maxH}px, calc((100cqw - ${(row.length - 1) * 8}px) / ${row.reduce((sum, t) => sum + ratio(t.p), 0)}))` }}
          >
            {row.map(({ p, i }, j) => {
              const lastTile = r === lines.length - 1 && j === row.length - 1;
              return (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => setOpen(String(i))}
                  aria-label={`Open photo ${i + 1} of ${photos.length}: ${p.alt}`}
                  className="relative block h-full min-w-0"
                  style={{ flex: `${ratio(p)} 1 0%` }}
                >
                  <Photo photo={sources[i]} sizes={`(min-width: 768px) ${Math.round(100 / per)}vw, 50vw`} zoom className="h-full" />
                  {isRender(p) && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-night/80 px-3 py-1 text-[15px] font-medium text-night-ink">Design render</span>
                  )}
                  {lastTile && hidden > 0 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-night/55 text-[17px] font-medium text-night-ink">
                      See all {photos.length} photos
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {grid(4, 2, 300, "md:hidden")}
      {grid(6, 3, 380, "hidden md:block")}
      {index !== null && <Lightbox photos={sources} index={index} onIndex={(i) => setOpen(String(i))} onClose={close} label={`Photos of ${name}`} />}
    </>
  );
}
