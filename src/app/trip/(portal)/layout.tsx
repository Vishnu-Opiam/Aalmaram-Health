import { Suspense } from "react";
import { requireClientPage } from "@/lib/auth/guards";
import { PortalNav } from "./portal-nav";

/**
 * The client's four sections (product notebook §4): Feed, Itinerary,
 * Calendar, Chat. Large targets and plain words — most clients are 50+.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireClientPage();
  return (
    <>
      <Suspense fallback={<div className="h-14 border-b border-sand-200 bg-white" />}>
        <PortalNav />
      </Suspense>
      {children}
    </>
  );
}
