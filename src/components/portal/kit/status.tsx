import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Progress = "planned" | "confirmed" | "booked";

/**
 * A block's state in words, on paper (replaces the pastel pills). Booked: a
 * green check and "Booked". Confirmed: "Being booked" in gold text with a
 * dotted ring (visibly "not yet"). Planned: who put it there, quietly, or
 * nothing for the client's own choices.
 */
export function StatusMark({
  progress,
  addedBy,
  className,
}: {
  progress: Progress;
  addedBy?: string | null;
  className?: string;
}) {
  const base = "inline-flex items-center gap-2 whitespace-nowrap text-[16px] font-medium leading-none";
  if (progress === "booked") {
    return (
      <span className={cn(base, "pk-stamp-mark text-success-600", className)}>
        <span className="inline-flex h-5.5 w-5.5 items-center justify-center rounded-full bg-success-600 text-white" aria-hidden="true">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        Booked
      </span>
    );
  }
  if (progress === "confirmed") {
    return (
      <span className={cn(base, "text-gold-700", className)}>
        <span className="h-5.5 w-5.5 rounded-full border-2 border-dotted border-gold-500" aria-hidden="true" />
        Being booked
      </span>
    );
  }
  if (addedBy === "TEAM") return <span className={cn(base, "text-mist-muted", className)}>Arranged for you</span>;
  if (addedBy === "AI") return <span className={cn(base, "text-mist-muted", className)}>Suggested for you</span>;
  return null;
}
