import { Skeleton } from "@/components/ui/primitives";

export default function TripLoading() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your journey…</span>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-4 h-10 w-3/4" />
      <Skeleton className="mt-6 h-24 w-full" />
      <Skeleton className="mt-10 h-6 w-48" />
      <div className="mt-6 space-y-6">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
