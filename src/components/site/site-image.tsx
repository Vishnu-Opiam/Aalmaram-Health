"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type ImageLoader } from "next/image";
import type { Photo } from "@/app/(site)/content";

/**
 * Unsplash's own image CDN resizes from the original, so we ask it directly
 * rather than re-encoding an already-compressed copy through Next.
 */
const unsplashLoader: ImageLoader = ({ src, width, quality }) => `${src}?auto=format&fit=max&w=${width}&q=${quality ?? 80}`;

/** Headroom for the settle-and-drift scale the motion layer puts on photographs. */
const MOTION_SCALE = 1.15;

/**
 * A site photograph filling its box (object-cover). `sizes` is only the first
 * guess, used before the page is interactive. After that the image measures
 * its box: a box narrower than the photograph's shape crops its sides, so it
 * needs an image wider than the box itself, or the browser blows a small one
 * up and it looks soft.
 */
export function SiteImage({
  photo,
  sizes,
  alt = photo.alt,
  priority,
  className,
}: {
  photo: Photo;
  sizes: string;
  alt?: string;
  priority?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [needed, setNeeded] = useState<string>();

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const px = Math.max(width, (height * photo.w) / photo.h) * MOTION_SCALE;
      // Round up to a 100px step so small layout shifts don't re-render.
      setNeeded(`${Math.ceil(px / 100) * 100}px`);
    });
    ro.observe(img);
    return () => ro.disconnect();
  }, [photo.w, photo.h]);

  return (
    <Image
      ref={ref}
      loader={unsplashLoader}
      src={photo.src}
      alt={alt}
      fill
      sizes={needed ?? sizes}
      priority={priority}
      className={className ?? "object-cover"}
      style={{ objectPosition: photo.focus }}
    />
  );
}
