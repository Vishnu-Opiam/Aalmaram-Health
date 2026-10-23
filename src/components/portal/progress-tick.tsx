import { Check, CheckCheck } from "lucide-react";
import type { BlockProgress } from "@/domain/bookings/status";
import { cn } from "@/lib/utils";

export const PROGRESS_LABELS: Record<BlockProgress, string> = {
  planned: "Planned",
  confirmed: "Confirmed — we are booking it",
  booked: "Booked and ready",
};

/**
 * ✓✓ once the client has confirmed the itinerary, a big green ✓ once the
 * provider has confirmed the booking. Nothing while planning.
 */
export function ProgressTick({ progress, size = "md" }: { progress: BlockProgress; size?: "md" | "lg" }) {
  if (progress === "planned") return null;
  if (progress === "confirmed") {
    return (
      <span className="inline-flex shrink-0 text-teal-600" title={PROGRESS_LABELS.confirmed}>
        <CheckCheck className={size === "lg" ? "h-7 w-7" : "h-5 w-5"} aria-hidden="true" />
        <span className="sr-only">{PROGRESS_LABELS.confirmed}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-success-600 text-white shadow-sm",
        size === "lg" ? "h-10 w-10" : "h-7 w-7",
      )}
      title={PROGRESS_LABELS.booked}
    >
      <Check className={size === "lg" ? "h-6 w-6" : "h-4.5 w-4.5"} strokeWidth={3} aria-hidden="true" />
      <span className="sr-only">{PROGRESS_LABELS.booked}</span>
    </span>
  );
}
