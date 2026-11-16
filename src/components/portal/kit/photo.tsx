"use client";

import Image, { type ImageLoader } from "next/image";
import { cn } from "@/lib/utils";
import { ModuleDot, type Kind } from "./module";

/**
 * A photograph as data: where it is, what it shows, who took it and the point
 * to keep in frame (CSS object-position). The site's PHOTOS entries fit as-is.
 */
export type PhotoSource = {
  src: string;
  alt: string;
  focus?: string | null;
  credit?: string | null;
  href?: string | null;
  w?: number;
  h?: number;
};

export type Scrim = "top" | "bottom" | "left" | "right";

// Unsplash's CDN resizes from the original, so ask it directly (as the site's SiteImage does).
const unsplashLoader: ImageLoader = ({ src, width, quality }) =>
  `${src}${src.includes("?") ? "&" : "?"}auto=format&fit=max&w=${width}&q=${quality ?? 80}`;

// Functional scrims: on the text side only, never a full tint.
const SCRIM: Record<Scrim, string> = {
  bottom: "linear-gradient(to top, rgb(14 21 24 / 0.78) 0%, rgb(14 21 24 / 0) 55%)",
  top: "linear-gradient(to bottom, rgb(14 21 24 / 0.7) 0%, rgb(14 21 24 / 0) 38%)",
  left: "linear-gradient(to right, rgb(14 21 24 / 0.78) 0%, rgb(14 21 24 / 0) 55%)",
  right: "linear-gradient(to left, rgb(14 21 24 / 0.78) 0%, rgb(14 21 24 / 0) 55%)",
};

const sourceOf = (src: string) =>
  src.startsWith("/") ? "local" : src.startsWith("https://images.unsplash.com/") ? "unsplash" : "remote";

/**
 * A square-cornered photograph at a fixed ratio. next/image for local
 * `/partners/...` files and Unsplash; a plain lazy <img> for any other host
 * (feed media, whose hosts we don't know). With no photo it shows the
 * typographic card: the name in Gambarino on night with the module dot —
 * never a gradient and an icon. `children` sit on the photo (on the scrim's
 * side) in the night ground's colours; keep them to big type, two lines.
 */
export function Photo({
  photo,
  ratio,
  sizes,
  priority,
  scrim,
  fit = "cover",
  fallback,
  children,
  overlayClassName,
  className,
  shutter,
  zoom,
  reveal,
}: {
  photo?: PhotoSource | null;
  /** CSS aspect-ratio, e.g. "16/9", "4/5", "3/2", "1/1". Omit to fill a sized parent. */
  ratio?: string;
  sizes: string;
  priority?: boolean;
  scrim?: Scrim | Scrim[];
  fit?: "cover" | "contain";
  /** The typographic card shown when there is no photo. */
  fallback?: { title: string; kind?: Kind; line?: string };
  children?: React.ReactNode;
  overlayClassName?: string;
  className?: string;
  /** Hero intro: opens bottom-up on first paint, once per session. */
  shutter?: boolean;
  /** Slow 4% push on hover / keyboard focus (pointer devices). */
  zoom?: boolean;
  /** Wipes open from the left as it scrolls into view, once. */
  reveal?: boolean;
}) {
  const sides = scrim ? ([] as Scrim[]).concat(scrim) : [];
  const imgClass = cn("absolute inset-0 h-full w-full", fit === "contain" ? "object-contain" : "object-cover");
  const style = { objectPosition: photo?.focus ?? undefined };
  const source = photo ? sourceOf(photo.src) : null;

  return (
    <div
      className={cn("relative overflow-hidden bg-night", zoom && "pk-zoom", shutter && "pk-shutter", className)}
      style={ratio ? { aspectRatio: ratio } : undefined}
      data-reveal={reveal ? "wipe" : undefined}
    >
      {photo && source === "remote" && (
        // Unknown remote hosts can't go through next/image without opening the optimiser to them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.src} alt={photo.alt} loading={priority ? "eager" : "lazy"} decoding="async" className={imgClass} style={style} />
      )}
      {photo && source !== "remote" && (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          loader={source === "unsplash" ? unsplashLoader : undefined}
          className={imgClass}
          style={style}
        />
      )}
      {!photo && fallback && (
        <div className="pk-night absolute inset-0 flex flex-col justify-end gap-3 p-5 md:p-7">
          {fallback.kind && <ModuleDot kind={fallback.kind} className="text-[16px] font-medium text-night-muted" />}
          <p className="font-display text-[28px] md:text-[32px] leading-[1.05] tracking-[-0.015em] text-balance">{fallback.title}</p>
          {fallback.line && <p className="text-[16px] text-night-muted">{fallback.line}</p>}
        </div>
      )}
      {sides.length > 0 && (photo || !fallback) && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: sides.map((s) => SCRIM[s]).join(",") }} />
      )}
      {children && <div className={cn("pk-on-photo absolute inset-0 flex", overlayClassName)}>{children}</div>}
    </div>
  );
}
