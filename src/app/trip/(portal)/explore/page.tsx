import type { Metadata } from "next";
import { Suspense } from "react";
import { requireClientPage } from "@/lib/auth/guards";
import { ChoosingBanner } from "@/components/portal/explore/choosing";
import { ExploreLanding } from "@/components/portal/explore/landing";
import { ExploreToasts } from "@/components/portal/explore/toasts";
import { loadPlaces } from "@/domain/trips/queries";
import { loadExploreContext } from "./context";
import ExploreLoading from "./loading";

export const metadata: Metadata = { title: "Explore" };

/** The places we work with and what can be added from them, to wander through before (and while) planning. */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const search = await searchParams;
  const [{ context, added }, places] = await Promise.all([loadExploreContext(client.id, search), loadPlaces()]);

  return (
    <>
      <ChoosingBanner context={context} />
      {/* useSearchParams in the browser part needs a Suspense boundary. */}
      <Suspense fallback={<ExploreLoading />}>
        <ExploreLanding places={places} context={context} />
        <ExploreToasts added={added} coordinator={context.coordinator} />
      </Suspense>
    </>
  );
}
