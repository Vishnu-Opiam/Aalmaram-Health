"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { buttonClass } from "@/components/portal/kit";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";
import { initials } from "@/lib/utils";

/**
 * The coordinator as a person (monogram, name, two ways to reach them) and
 * their note to the client set as a signed letter beside them. Asking them to
 * get in touch stays on this page (`returnTo`) and comes back with `asked=1`.
 */
export function Coordinator({
  tripId,
  name,
  first,
  email,
  note,
  asked,
  returnTo,
  action,
}: {
  tripId: string | null;
  /** Full name, or null when no coordinator is assigned yet. */
  name: string | null;
  /** "Priya", or "us" without a coordinator. */
  first: string;
  email: string | null;
  note: string | null;
  asked: boolean;
  returnTo: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  const shown = name ? name.replace(/\s*\(.*\)\s*$/, "") : null;

  return (
    <section id="coordinator" aria-labelledby="coordinator-heading" className="pk-frame pk-section scroll-mt-24">
      <div className={note ? "grid gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16" : undefined}>
        <div>
          <h2 id="coordinator-heading" className="pk-label">
            Your coordinator
          </h2>
          <div className="mt-5 flex items-center gap-5">
            <span
              aria-hidden="true"
              className="inline-flex h-22 w-22 shrink-0 items-center justify-center rounded-full bg-night font-display text-[34px] text-night-ink md:h-24 md:w-24"
            >
              {shown ? initials(shown) : "A"}
            </span>
            <div className="min-w-0">
              <p className="font-display text-[30px] leading-[1.05] md:text-[36px]">{name ?? "The Aalmaram team"}</p>
              <p className="mt-2 text-[17px] text-mist-muted">{name ? `${first} plans your trip with you.` : "Here for anything about your trip."}</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:flex-col lg:flex-row">
            {asked ? (
              <p className="flex items-start gap-3 text-[17px] leading-relaxed">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-600 text-white" aria-hidden="true">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                We&apos;ve let {first} know. You&apos;ll hear back shortly.
              </p>
            ) : (
              tripId && (
                <form action={dispatch}>
                  <input type="hidden" name="tripId" value={tripId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <SubmitButton pendingLabel="Letting them know…" className={buttonClass("primary", "w-full sm:w-auto")}>
                    Ask {first} to get in touch
                  </SubmitButton>
                  <FormFeedback state={state} className="mt-2" />
                </form>
              )
            )}
            {email && (
              <a href={`mailto:${email}`} className={buttonClass("secondary")}>
                Email {first}
              </a>
            )}
          </div>
        </div>

        {note && (
          <figure className="border-l border-gold-500 pl-6 md:pl-10">
            <figcaption className="pk-label">A note from {first}</figcaption>
            <blockquote className="mt-5 whitespace-pre-wrap font-display text-[22px] leading-[1.45] md:text-[26px]">{note}</blockquote>
            <p className="mt-6 text-[17px] font-medium">— {first}</p>
          </figure>
        )}
      </div>
    </section>
  );
}
