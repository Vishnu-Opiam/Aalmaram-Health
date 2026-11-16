"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A short confirmation after an action ("Added to Day 4"), read from a URL
 * marker the action's redirect sets (`?done=added`). It removes the marker
 * (so a refresh doesn't repeat it), speaks once through a polite live region
 * and fades after `duration`, pausing while hovered or focused. `undo` holds an
 * Undo button or form per marker. Sits above the tab bar on phones, and
 * above a StickyBar too with `aboveBar`.
 */
export function Toast({
  param = "done",
  messages,
  undo,
  duration = 12_000,
  aboveBar,
}: {
  param?: string;
  /** Marker value → message, e.g. { added: "Added to your trip" }. */
  messages: Record<string, string>;
  /** Marker value → an Undo button or form (a slot, so server pages can pass it). */
  undo?: Partial<Record<string, React.ReactNode>>;
  duration?: number;
  aboveBar?: boolean;
}) {
  const marker = useSearchParams().get(param);
  const [shown, setShown] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const shownRef = useRef<string | null>(null);

  // Fill the (already present, empty) live region after mount, so it is announced.
  useEffect(() => {
    if (!marker || !messages[marker] || shownRef.current === marker) return;
    shownRef.current = marker;
    setShown(marker);
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.replaceState(window.history.state, "", url);
  }, [marker, messages, param]);

  useEffect(() => {
    if (!shown || paused) return;
    const t = setTimeout(() => setShown(null), duration);
    return () => clearTimeout(t);
  }, [shown, paused, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 md:bottom-8",
        aboveBar ? "bottom-[calc(64px+env(safe-area-inset-bottom)+96px)]" : "bottom-[calc(64px+env(safe-area-inset-bottom)+16px)]",
      )}
    >
      {shown && (
        <div
          className="pk-night pk-rise pointer-events-auto flex w-full max-w-xl items-center gap-4 rounded-[6px] py-2 pl-5 pr-2 shadow-float ring-1 ring-night-ink/15"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <p className="flex-1 py-2 text-[17px] font-medium leading-snug">{messages[shown]}</p>
          {undo?.[shown]}
          <button
            type="button"
            onClick={() => setShown(null)}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full px-3 text-[16px] text-night-muted hover:text-night-ink"
          >
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /> Close
          </button>
        </div>
      )}
    </div>
  );
}
