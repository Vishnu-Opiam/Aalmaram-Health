import type { Metadata } from "next";
import { Suspense } from "react";
import { requireClientPage } from "@/lib/auth/guards";
import { ExploreBrowser } from "@/components/portal/explore-browser";
import { loadLibrary } from "@/domain/trips/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { param } from "@/lib/utils";

export const metadata: Metadata = { title: "Explore" };

/** Every health, wellness and culture experience we can arrange, to browse before planning. */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const [trips, library] = await Promise.all([loadPortalTrips(client.id), loadLibrary()]);
  const trip = pickTrip(trips, param(await searchParams, "trip") || undefined);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
      <h1 className="font-display text-[38px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[46px]">
        Explore what we offer
      </h1>
      <p className="mt-3 max-w-2xl text-[19px] leading-relaxed text-ink-700">
        Every check-up, treatment, class and outing we can arrange in Kerala, with who provides it. Open any of them to read
        more.
      </p>
      {/* useUrlPanel reads the URL, which needs a Suspense boundary when prerendered. */}
      <Suspense fallback={null}>
        <ExploreBrowser library={library} tripId={trip?.id ?? null} />
      </Suspense>
    </div>
  );
}
