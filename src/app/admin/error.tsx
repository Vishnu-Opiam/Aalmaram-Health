"use client";

import { useEffect } from "react";
import {
  Alert,
  AppLink as Link,
  Button,
  buttonClasses,
} from "@/components/ui/primitives";

/**
 * Admin error boundary.
 *
 * Next.js strips the message of a server-thrown error in production and gives
 * us only a digest, so the user gets a safe generic message plus the digest to
 * quote to support. The real stack is in the server log.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("admin boundary caught", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16">
      <Alert tone="danger" title="Something went wrong">
        <p>
          {error.message && process.env.NODE_ENV !== "production"
            ? error.message
            : "We could not complete that action. Nothing has been changed."}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs opacity-80">Reference: {error.digest}</p>
        )}
      </Alert>

      <div className="mt-5 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/admin" className={buttonClasses("secondary", "md")}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
