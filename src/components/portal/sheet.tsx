"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { buttonClass } from "./kit/button";

/**
 * A panel on paper: a bottom sheet on phones (sliding up, 20px top corners),
 * a 680px drawer from the right on wider screens. Esc, the backdrop and a
 * large "Close" button close it; focus goes to its first heading, Tab stays
 * inside, and focus returns to whatever opened it. An optional `footer` sticks
 * to the bottom, so the price and the main action never scroll away.
 */
export function Sheet({
  label,
  onClose,
  children,
  footer,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    const opener = document.activeElement as HTMLElement | null;
    const heading = panel?.querySelector<HTMLElement>("h1, h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.style.outline = "none"; // a starting point for screen readers, not a control
      heading.focus({ preventScroll: true });
    } else panel?.querySelector<HTMLButtonElement>("button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      // A lightbox opened from inside the sheet handles its own keys.
      if (document.querySelectorAll("[role=dialog][aria-modal=true]").length > 1) return;
      if (e.key === "Escape") close.current();
      if (e.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex='0']")].filter(
        (el) => el.offsetParent !== null,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" className="portal-fade absolute inset-0 bg-night/50" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div
        ref={panelRef}
        className="pk-paper pk-sheet-up relative flex max-h-[calc(100svh-24px)] w-full flex-col overflow-hidden rounded-t-[20px] shadow-float md:ml-auto md:h-full md:max-h-none md:max-w-[680px] md:rounded-none"
      >
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-10 flex justify-end border-b border-paper-line bg-paper px-4 py-2 md:px-6">
            <button type="button" onClick={onClose} className={buttonClass("quiet", "gap-1.5 px-3 no-underline")}>
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" /> Close
            </button>
          </div>
          <div className="px-5 pb-12 pt-6 md:px-10">{children}</div>
        </div>
        {footer && (
          <div className="border-t border-paper-line bg-paper-raised px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:px-10 md:py-4">
            {footer}
          </div>
        )}
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
