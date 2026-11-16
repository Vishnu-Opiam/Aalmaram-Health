"use client";

import { useEffect } from "react";
import { Button } from "@/components/portal/kit";

/** Explore failed to load: say so plainly, keep the tabs, offer to try again. */
export default function ExploreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("explore boundary caught", error);
  }, [error]);

  return (
    <section className="pk-night py-20 md:py-28">
      <div className="pk-frame max-w-xl">
        <h1 className="pk-h1">We could not load Explore</h1>
        <p className="pk-body mt-5 text-night-muted">
          Something went wrong on our side. Please try again; your trip is not affected.
        </p>
        {error.digest && <p className="mt-3 text-[16px] text-night-muted">Reference: {error.digest}</p>}
        <Button onClick={reset} className="mt-8">
          Try again
        </Button>
      </div>
    </section>
  );
}
