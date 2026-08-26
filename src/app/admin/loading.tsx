import { Skeleton } from "@/components/ui/primitives";

export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2 border-b border-sand-200 pb-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-64" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
