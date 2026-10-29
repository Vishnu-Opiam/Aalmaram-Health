import type { BlockProgress } from "@/domain/bookings/status";

/** The client's words for a block's progress: planned → ✓✓ confirmed → green ✓ booked. */
export const PROGRESS_LABELS: Record<BlockProgress, string> = {
  planned: "Planned",
  confirmed: "Confirmed — we are booking it",
  booked: "Booked and ready",
};
