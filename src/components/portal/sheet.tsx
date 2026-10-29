"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { pill } from "./ui";

/**
 * A panel that slides in from the right (full screen on a phone). Esc, the
 * backdrop and a large "Close" button all close it; focus returns to whatever
 * opened it.
 */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        className="portal-fade absolute inset-0 bg-forest-950/45"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="portal-panel relative ml-auto flex h-full w-full flex-col overflow-y-auto bg-sand-50 shadow-2xl sm:max-w-[580px] sm:rounded-l-[2rem]"
      >
        <div className="sticky top-0 z-10 flex justify-end bg-sand-50/95 px-4 py-3 backdrop-blur sm:px-6">
          <button type="button" onClick={onClose} className={pill("secondary", "min-h-12 px-5 text-[16px]")}>
            <X className="h-5 w-5" aria-hidden="true" /> Close
          </button>
        </div>
        <div className="px-5 pb-12 sm:px-9">{children}</div>
      </div>
    </div>
  );
}

/**
 * Keeps an open panel in the URL (`?item=…`), so the browser's Back button
 * closes it instead of leaving the page — the most natural "undo" for people
 * who aren't sure where they are. Uses the history API, which Next keeps in
 * sync with useSearchParams without a server round trip.
 */
export function useUrlPanel(key: string) {
  const value = useSearchParams().get(key);

  const open = useCallback(
    (next: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set(key, next);
      // Switching from one open panel to another replaces it: one Back still closes.
      // Pass only our own key: Next copies its router state in itself, and skips
      // syncing useSearchParams for state that already carries it.
      const replace = window.history.state?.panel === key;
      window.history[replace ? "replaceState" : "pushState"]({ panel: key }, "", url);
    },
    [key],
  );

  const close = useCallback(() => {
    if (window.history.state?.panel === key) return window.history.back();
    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    window.history.replaceState(null, "", url);
  }, [key]);

  return [value, open, close] as const;
}
