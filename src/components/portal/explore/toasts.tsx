"use client";

import { useEffect } from "react";
import { Toast } from "@/components/portal/kit";

/** The two confirmations Explore comes back with: `added=<blockId>` and `asked=1`. */
export function ExploreToasts({
  added,
  coordinator,
}: {
  added: { marker: string; text: string; href: string; dayNumber: number; componentId: string } | null;
  coordinator: string;
}) {
  // Back after an add: bring the card that was added into view (the page reloads at the top).
  useEffect(() => {
    if (added) document.getElementById(`exp-${added.componentId}`)?.scrollIntoView({ block: "center" });
  }, [added]);
  return (
    <>
      {added && (
        <Toast
          param="added"
          messages={{ [added.marker]: added.text }}
          undo={{
            [added.marker]: (
              <a
                href={added.href}
                className="inline-flex min-h-12 shrink-0 items-center rounded-full px-3 text-[17px] font-medium text-brass underline decoration-brass/50 underline-offset-[6px] hover:decoration-brass"
              >
                View day {added.dayNumber}
              </a>
            ),
          }}
        />
      )}
      <Toast param="asked" messages={{ "1": `We've let ${coordinator} know. You'll hear back soon.` }} />
    </>
  );
}
