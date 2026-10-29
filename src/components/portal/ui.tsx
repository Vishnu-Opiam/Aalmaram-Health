import { Check, CheckCheck, Landmark, Leaf, Sparkles, Stethoscope } from "lucide-react";
import type { BuilderBlock } from "@/domain/trips/builder-view";
import { cn } from "@/lib/utils";
import { PROGRESS_LABELS } from "./progress-tick";

/**
 * Client-portal building blocks. Bigger and rounder than the admin's: pill
 * buttons at least 52 px tall, words beside every symbol (most clients are
 * 50+). Server-safe; the interactive pieces live in sheet.tsx.
 */

type PillVariant = "primary" | "secondary" | "quiet" | "danger";

export function pill(variant: PillVariant = "primary", className?: string) {
  return cn(
    "inline-flex min-h-13 items-center justify-center gap-2 rounded-full px-6 text-[17px] font-semibold leading-tight transition-[background-color,border-color,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" && "bg-forest-900 text-white shadow-[0_10px_24px_-14px_rgb(11_31_26/0.7)] hover:bg-forest-800",
    variant === "secondary" && "border-2 border-sand-300 bg-white text-ink-900 hover:border-forest-800",
    variant === "quiet" && "px-4 text-forest-800 underline-offset-4 hover:underline",
    variant === "danger" && "bg-danger-600 text-white hover:bg-danger-500",
    className,
  );
}

export type Kind = "health" | "wellness" | "culture";

export const kindOf = (moduleName: string): Kind =>
  /health|medical/i.test(moduleName) ? "health" : /wellness|spa/i.test(moduleName) ? "wellness" : "culture";

export const KIND = {
  health: { label: "Health", Icon: Stethoscope, tile: "bg-lagoon-50 text-lagoon-700", ring: "ring-lagoon-100" },
  wellness: { label: "Wellness", Icon: Leaf, tile: "bg-leaf-50 text-leaf-700", ring: "ring-leaf-100" },
  culture: { label: "Culture & sights", Icon: Landmark, tile: "bg-marigold-50 text-marigold-700", ring: "ring-marigold-100" },
} as const;

export function KindIcon({ moduleName, size = "md" }: { moduleName: string; size?: "md" | "lg" }) {
  const kind = KIND[kindOf(moduleName)];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-2xl",
        kind.tile,
        size === "lg" ? "h-14 w-14" : "h-11 w-11",
      )}
      aria-hidden="true"
    >
      <kind.Icon className={size === "lg" ? "h-7 w-7" : "h-5.5 w-5.5"} />
    </span>
  );
}

/**
 * What a block's status means to the client, in words. While planning: who
 * put it there (nothing for their own choices). After confirming: ✓✓ being
 * booked, then the green ✓ once the provider has confirmed.
 */
export function StatusPill({ block, className }: { block: Pick<BuilderBlock, "progress" | "addedBy">; className?: string }) {
  const base = "inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[15px] font-semibold";
  if (block.progress === "booked") {
    return (
      <span className={cn(base, "bg-success-50 pl-1 text-success-600", className)} title={PROGRESS_LABELS.booked}>
        <span className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-full bg-success-600 text-white">
          <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </span>
        Booked
      </span>
    );
  }
  if (block.progress === "confirmed") {
    return (
      <span className={cn(base, "bg-teal-50 text-teal-700", className)} title={PROGRESS_LABELS.confirmed}>
        <CheckCheck className="h-5 w-5" aria-hidden="true" /> Being booked
      </span>
    );
  }
  if (block.addedBy === "TEAM") return <span className={cn(base, "bg-lagoon-50 text-lagoon-700", className)}>Arranged for you</span>;
  if (block.addedBy === "AI") {
    return (
      <span className={cn(base, "bg-marigold-50 text-marigold-700", className)}>
        <Sparkles className="h-4 w-4" aria-hidden="true" /> Suggestion
      </span>
    );
  }
  return null;
}

/** A banyan ("aalmaram") tree: canopy, trunk and aerial roots. */
export function PortalBrand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true" focusable="false">
        <circle cx="20" cy="20" r="20" fill="#12302a" />
        <path d="M9 19c-2-5 3-9 7-8 1-4 7-5 9-1 4-1 8 3 6 7 3 2 1 6-3 6H12c-3 0-5-2-3-4z" fill="#9cc4a4" />
        <path d="M19.2 24h1.6v8h-1.6z M14 24v6 M26 24v6 M17 24v4 M23 24v4" stroke="#f3e6cf" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-[22px] font-semibold tracking-tight text-forest-900">Aalmaram</span>
        <span className="mt-0.5 block text-[12px] font-semibold uppercase tracking-[0.22em] text-ink-600">Health · Kerala</span>
      </span>
    </span>
  );
}

/** "Arjun Nair (demo RM)" → "Arjun", for warm, short copy. */
export function firstName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").split(/\s+/)[0] || name;
}
