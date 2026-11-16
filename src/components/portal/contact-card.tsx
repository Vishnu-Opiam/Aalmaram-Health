"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { useFormStatus } from "react-dom";
import { FormFeedback, useActionRedirect } from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn, initials } from "@/lib/utils";
import { firstName } from "./ui";
import { buttonClass } from "./kit";

/**
 * The client's relationship manager, as a person: name large, what they help
 * with, a way to ask them to get in touch, and their email. A human is always
 * one tap away (notebook §3). A night panel; `bleed` makes it a full-width
 * band (the Ask us page) instead of a box.
 */
export function ContactCard({
  tripId,
  name,
  email,
  asked,
  action,
  bleed,
}: {
  tripId: string | null;
  name: string | null;
  email: string | null;
  asked: boolean;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  bleed?: boolean;
}) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  const first = name ? firstName(name) : "your team";
  const displayName = name?.replace(/\s*\(.*\)\s*$/, "") ?? "Your Aalmaram team";
  return (
    <section aria-labelledby="contact-heading" className={cn("pk-night", bleed ? "py-10 md:py-16" : "p-6 md:p-8")}>
      <div className={cn(bleed && "pk-frame")}>
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between md:gap-12">
          <div className="flex items-center gap-5 md:gap-8">
            <span
              className="inline-flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full border border-gold-500 font-display text-[34px] text-brass-bright md:h-[120px] md:w-[120px] md:text-[44px]"
              aria-hidden="true"
            >
              {name ? initials(displayName) : "A"}
            </span>
            <div className="min-w-0">
              <p className="pk-label">Your coordinator for this trip</p>
              <h2 id="contact-heading" className="mt-1 font-display text-[34px] leading-[1.05] md:text-[48px]">
                {displayName}
              </h2>
              <p className="mt-2 text-[17px] text-(--pk-muted)">Here for anything about your trip, large or small.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:shrink-0 md:flex-col lg:flex-row">
            {asked ? (
              <p role="status" className="flex items-start gap-3 text-[18px] md:max-w-xs">
                <Check className="mt-1 h-5 w-5 shrink-0 text-brass-bright" aria-hidden="true" />
                We have let {first} know. They will be in touch with you shortly.
              </p>
            ) : (
              tripId && (
                <form action={dispatch} className="contents">
                  <input type="hidden" name="tripId" value={tripId} />
                  <KitSubmit pendingLabel="Letting them know…" className={buttonClass("primary", "w-full sm:w-auto")}>
                    Ask {first} to get in touch
                  </KitSubmit>
                </form>
              )
            )}
            {email && (
              <a href={`mailto:${email}`} className={buttonClass("secondary", "w-full sm:w-auto")}>
                Email {first}
              </a>
            )}
          </div>
        </div>
        <FormFeedback state={state} className="mt-4" />
      </div>
    </section>
  );
}

/** A submit button in kit styling that shows its pending label (the shared SubmitButton forces the old teal colours). */
export function KitSubmit({ children, pendingLabel, className }: { children: React.ReactNode; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
