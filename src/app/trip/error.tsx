"use client";

import { useEffect } from "react";

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
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="font-serif text-2xl text-ink-900">
        We could not load your journey
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
        Something went wrong on our side. Please try again, and contact your
        Aalmaram coordinator if it keeps happening.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs text-ink-400">Reference: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700"
      >
        Try again
      </button>
    </div>
  );
}
