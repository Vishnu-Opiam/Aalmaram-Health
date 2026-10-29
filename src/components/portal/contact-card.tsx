"use client";

import { useActionState } from "react";
import { CircleCheck, Mail, PhoneCall } from "lucide-react";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { idleState, type FormState } from "@/lib/validation/form";
import { initials } from "@/lib/utils";
import { firstName, pill } from "./ui";

/**
 * The client's relationship manager, as a person: name, a way to ask them to
 * get in touch, and their email. Premium service means a human is always one
 * tap away (notebook §3).
 */
export function ContactCard({
  tripId,
  name,
  email,
  asked,
  action,
}: {
  tripId: string | null;
  name: string | null;
  email: string | null;
  asked: boolean;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionRedirect(state);
  const first = name ? firstName(name) : "your team";
  return (
    <section aria-labelledby="contact-heading" className="portal-card p-6 sm:p-7">
      <h2 id="contact-heading" className="text-[17px] font-semibold text-ink-600">
        Your personal contact
      </h2>
      <div className="mt-4 flex items-center gap-4">
        <span
          className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-forest-900 font-display text-[24px] font-semibold text-white"
          aria-hidden="true"
        >
          {name ? initials(name.replace(/\s*\(.*\)\s*$/, "")) : "A"}
        </span>
        <div className="min-w-0">
          <p className="text-[22px] font-semibold leading-tight text-ink-900">{name ?? "Your Aalmaram team"}</p>
          <p className="mt-1 text-[16px] text-ink-600">Here for anything about your trip</p>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {asked ? (
          <p role="status" className="flex items-start gap-3 rounded-2xl bg-success-50 px-4 py-3 text-[17px] text-ink-800">
            <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-600" aria-hidden="true" />
            We have let {first} know. They will be in touch with you shortly.
          </p>
        ) : (
          tripId && (
            <form action={dispatch}>
              <input type="hidden" name="tripId" value={tripId} />
              <SubmitButton size="lg" pendingLabel="Letting them know…" className={pill("primary", "w-full")}>
                <PhoneCall className="h-5 w-5" aria-hidden="true" /> Ask {first} to get in touch
              </SubmitButton>
              <FormFeedback state={state} className="mt-2" />
            </form>
          )
        )}
        {email && (
          <a href={`mailto:${email}`} className={pill("secondary", "w-full")}>
            <Mail className="h-5 w-5" aria-hidden="true" /> Email {first}
          </a>
        )}
      </div>
    </section>
  );
}
