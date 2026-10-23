import { redirect } from "next/navigation";
import { param } from "@/lib/utils";

/** Booking status now shows on Day by day; old links land there. */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const trip = param(await searchParams, "trip");
  redirect(trip ? `/trip/itinerary?trip=${encodeURIComponent(trip)}` : "/trip/itinerary");
}
