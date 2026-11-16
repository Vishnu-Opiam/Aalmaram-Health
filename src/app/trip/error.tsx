"use client";

import { useEffect } from "react";
import { Button } from "@/components/portal/kit/button";
import { PortalBrand } from "@/components/portal/ui";

export default function TripError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("trip boundary caught", error);
  }, [error]);

  return (
    <main id="trip-content" className="pk-night flex flex-1 flex-col">
      <div className="pk-frame flex flex-1 flex-col py-6 md:py-8">
        <a href="/trip" className="inline-flex min-h-12 items-center self-start">
          <PortalBrand />
        </a>
        <div className="my-auto max-w-xl py-16">
          <h1 className="pk-h1">We could not load your trip</h1>
          <p className="pk-body mt-5 text-night-muted">
            Something went wrong on our side. Please try again, and tell your Aalmaram coordinator if it keeps happening.
          </p>
          {error.digest && <p className="mt-3 text-[16px] text-night-muted">Reference: {error.digest}</p>}
          <Button onClick={reset} className="mt-8">
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
