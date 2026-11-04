"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useActionRedirect } from "@/components/ui/form-status";
import { CALL_TIMES } from "@/domain/site/talk";
import { idleState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "../content";
import { requestConversationAction } from "./actions";

const control =
  "mt-2 block min-h-14 w-full border-2 border-mist-muted bg-white px-4 text-[19px] text-mist-ink transition-colors focus:border-mist-ink focus:outline-none aria-[invalid=true]:border-laterite-600";

function Errors({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-2 text-[17px] font-medium text-laterite-600">
      {errors.join(" ")}
    </p>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center rounded-full bg-night px-8 text-[19px] font-medium text-night-ink transition-[background-color,transform] duration-200 hover:bg-night-raised active:scale-[0.98] disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Sending…" : "Ask for my free conversation"}
    </button>
  );
}

/** Six questions at most; labels above fields, plain errors next to them, values kept on error. */
export function TalkForm() {
  const [state, formAction] = useActionState(requestConversationAction, idleState);
  useActionRedirect(state);
  // Move focus to the error summary so it is seen and announced, wherever the visitor was on the form.
  const summary = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error") summary.current?.focus();
  }, [state]);
  const v = state.values ?? {};
  const err = state.fieldErrors;
  const field = (name: string) => ({
    id: `talk-${name}`,
    name,
    "aria-invalid": err[name] ? true : undefined,
    "aria-describedby": err[name] ? `talk-${name}-error` : undefined,
  });

  return (
    <form action={formAction} noValidate className="space-y-7">
      {state.status === "error" && state.message && (
        <p ref={summary} tabIndex={-1} role="alert" className="scroll-mt-28 bg-laterite-50 p-4 text-[18px] font-medium text-laterite-600">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="talk-name" className="text-[19px] font-medium text-mist-ink">Your name</label>
        <input {...field("name")} autoComplete="name" required defaultValue={v.name} className={control} />
        <Errors id="talk-name-error" errors={err.name} />
      </div>

      <div>
        <label htmlFor="talk-email" className="text-[19px] font-medium text-mist-ink">Email</label>
        <p className="text-[17px] text-mist-muted">We use it to agree a time with you.</p>
        <input {...field("email")} type="email" autoComplete="email" required defaultValue={v.email} className={control} />
        <Errors id="talk-email-error" errors={err.email} />
      </div>

      <div>
        <label htmlFor="talk-phone" className="text-[19px] font-medium text-mist-ink">
          Phone <span className="font-normal text-mist-muted">(if you would like us to call)</span>
        </label>
        <input {...field("phone")} type="tel" autoComplete="tel" defaultValue={v.phone} className={control} />
        <Errors id="talk-phone-error" errors={err.phone} />
      </div>

      <div className="grid gap-7 sm:grid-cols-2">
        <div>
          <label htmlFor="talk-country" className="text-[19px] font-medium text-mist-ink">Where you live</label>
          <select {...field("country")} required defaultValue={v.country ?? ""} className={control}>
            <option value="" disabled>Choose…</option>
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <Errors id="talk-country-error" errors={err.country} />
        </div>
        <div>
          <label htmlFor="talk-callTime" className="text-[19px] font-medium text-mist-ink">Best time to talk</label>
          <select {...field("callTime")} required defaultValue={v.callTime ?? ""} className={control}>
            <option value="" disabled>Choose…</option>
            {CALL_TIMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <Errors id="talk-callTime-error" errors={err.callTime} />
        </div>
      </div>

      <fieldset>
        <legend className="text-[19px] font-medium text-mist-ink">What interests you? <span className="font-normal text-mist-muted">(any, or none yet)</span></legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { name: "health", label: "Health" },
            { name: "wellness", label: "Wellness & Ayurveda" },
            { name: "culture", label: "Culture & travel" },
          ].map((o) => (
            <label key={o.name} className="flex min-h-14 cursor-pointer items-center gap-3 border-2 border-transparent bg-white px-4 text-[18px] transition-colors hover:border-mist-muted has-[:checked]:border-mist-ink">
              <input type="checkbox" name={o.name} defaultChecked={v[o.name] === "on"} className="h-6 w-6 accent-[#0e1518]" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="talk-message" className="text-[19px] font-medium text-mist-ink">
          Anything you would like us to know? <span className="font-normal text-mist-muted">(optional)</span>
        </label>
        <p className="text-[17px] text-mist-muted">For example when you hope to travel. Please don&apos;t include medical records.</p>
        <textarea {...field("message")} rows={4} defaultValue={v.message} className={cn(control, "py-3 leading-relaxed")} />
        <Errors id="talk-message-error" errors={err.message} />
      </div>

      {/* Honeypot: hidden from people and screen readers. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="talk-website">Website</label>
        <input id="talk-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label className="flex cursor-pointer gap-3 text-[18px] leading-relaxed text-mist-ink">
          <input
            type="checkbox"
            name="consent"
            required
            defaultChecked={v.consent === "on"}
            aria-invalid={err.consent ? true : undefined}
            aria-describedby={err.consent ? "talk-consent-error" : undefined}
            className="mt-1 h-6 w-6 shrink-0 accent-[#0e1518]"
          />
          You may contact me about my trip. We use your details only to arrange this conversation and plan your trip.
        </label>
        <Errors id="talk-consent-error" errors={err.consent} />
      </div>

      <Submit />
    </form>
  );
}
