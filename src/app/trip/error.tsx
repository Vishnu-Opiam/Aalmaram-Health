"use client";

import { useEffect } from "react";
import { PortalBrand, pill } from "@/components/portal/ui";

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
    <div className="mx-auto max-w-xl px-5 py-12 text-center sm:py-16">
      <PortalBrand />
      <h1 className="mt-10 font-display text-[32px] font-semibold text-ink-900">
        We could not load your trip
      </h1>
      <p className="mt-3 text-[18px] leading-relaxed text-ink-700">
        Something went wrong on our side. Please try again, and contact your
        Aalmaram coordinator if it keeps happening.
      </p>
      {error.digest && (
        <p className="mt-3 text-[16px] text-ink-600">Reference: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className={pill("primary", "mt-6")}
      >
        Try again
      </button>
    </div>
  );
}
