"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Send, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/primitives";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import type { ChatMessage } from "@/domain/ai/chat";
import type { ChatState } from "@/app/trip/actions";
import { formatMoney } from "@/domain/itineraries/pricing";
import { formatDuration } from "@/domain/vendors/profile";
import type { BuilderDay, Library, LibraryComponent } from "@/domain/trips/builder-view";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { pill } from "./ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

// Phrased so the assistant can match them to experiences ("art", "eat", "boat"…).
const PROMPTS = ["Art and dance", "The backwaters by boat", "Somewhere nice to eat", "Ayurveda and massage"];

/**
 * The trip assistant on its own page: one conversation, large type, ready-made
 * questions to tap, and ideas that go straight into a chosen day. Everything
 * said is kept on the trip's AI_CHAT conversation for the team.
 */
export function ChatPanel({
  tripId,
  greeting,
  initial,
  send,
  build,
  place,
  editable,
  days,
  library,
  contact,
  about,
}: {
  tripId: string;
  greeting: string;
  initial: ChatMessage[];
  send: (prev: ChatState, formData: FormData) => Promise<ChatState>;
  build: Action;
  place: Action;
  editable: boolean;
  days: BuilderDay[];
  library: Library;
  contact: string;
  about: string | null;
}) {
  const [chat, dispatch, pending] = useActionState(send, { messages: initial, readyToBuild: false, suggestions: [], error: null });
  const [buildState, buildDispatch] = useActionState(build, idleState);
  const [placeState, placeDispatch, placing] = useActionState(place, idleState);
  useActionRedirect(buildState);
  useActionRedirect(placeState);

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const components = useMemo(() => {
    const map = new Map<string, LibraryComponent>();
    for (const m of library.modules) for (const c of m.catalogues) for (const comp of c.components) map.set(comp.id, comp);
    return map;
  }, [library]);

  useEffect(() => {
    if (!about || !inputRef.current) return;
    inputRef.current.value = `About “${about}”: `;
    inputRef.current.focus();
  }, [about]);

  const seen = useRef(initial.length);
  useEffect(() => {
    if (chat.messages.length > seen.current) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    seen.current = chat.messages.length;
    if (!pending) formRef.current?.reset();
  }, [chat.messages.length, pending]);

  function ask(text: string) {
    if (!inputRef.current) return;
    inputRef.current.value = text;
    formRef.current?.requestSubmit();
  }

  function placeIdea(componentId: string, day: string) {
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("componentId", componentId);
    fd.set("day", day);
    startTransition(() => placeDispatch(fd));
  }

  const messages: ChatMessage[] = [{ role: "assistant", text: greeting }, ...chat.messages];
  const ideas = chat.suggestions.filter((s) => components.has(s.componentId));

  return (
    <section aria-labelledby="assistant-heading" className="portal-card p-5 sm:p-7">
      <h2 id="assistant-heading" className="flex items-center gap-3 font-display text-[26px] font-semibold text-ink-900">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-marigold-50 text-marigold-700" aria-hidden="true">
          <Sparkles className="h-5.5 w-5.5" />
        </span>
        Our trip assistant
      </h2>
      <p className="mt-2 text-[17px] leading-relaxed text-ink-700">
        It suggests things to do around your appointments. For anything about your health or your appointments, please ask {contact}.
      </p>

      <ol className="mt-6 space-y-4" aria-live="polite" aria-label="Conversation">
        {messages.map((message, index) => (
          <li key={index} className={cn("flex", message.role === "client" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[88%] whitespace-pre-wrap rounded-[1.5rem] px-5 py-3.5 text-[18px] leading-relaxed sm:max-w-[80%]",
                message.role === "client" ? "rounded-br-md bg-forest-900 text-white" : "rounded-bl-md bg-sand-100 text-ink-900",
              )}
            >
              <span className="sr-only">{message.role === "client" ? "You:" : "Assistant:"} </span>
              {message.text}
            </div>
          </li>
        ))}
        {pending && (
          <li className="text-[17px] text-ink-600" role="status">
            The assistant is writing…
          </li>
        )}
      </ol>

      {ideas.length > 0 && (
        <ul className="mt-5 space-y-3" aria-label="Ideas from the assistant">
          {ideas.map((s) => (
            <li key={s.componentId}>
              <IdeaCard component={components.get(s.componentId)!} reason={s.reason} days={days} editable={editable} onPlace={placeIdea} />
            </li>
          ))}
        </ul>
      )}
      {placing && (
        <p role="status" className="mt-3 text-[17px] font-semibold text-ink-800">
          Adding to your trip…
        </p>
      )}
      <FormFeedback state={placeState} className="mt-3" />
      {chat.error && (
        <Alert tone="danger" className="mt-4">
          {chat.error}
        </Alert>
      )}
      <div ref={endRef} />

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Ask about">
        {PROMPTS.map((text) => (
          <button
            key={text}
            type="button"
            disabled={pending}
            onClick={() => ask(text)}
            className="min-h-12 rounded-full border-2 border-sand-200 bg-white px-5 text-[16px] font-semibold text-ink-800 hover:border-forest-800 disabled:opacity-50"
          >
            {text}
          </button>
        ))}
      </div>

      <form ref={formRef} action={dispatch} className="mt-4">
        <input type="hidden" name="tripId" value={tripId} />
        <label htmlFor="chat-text" className="text-[17px] font-semibold text-ink-900">
          Your message
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            ref={inputRef}
            id="chat-text"
            name="text"
            rows={2}
            required
            maxLength={2000}
            placeholder="For example: we love music and quiet places"
            className="block min-h-16 flex-1 resize-y rounded-3xl border-2 border-sand-200 bg-white px-5 py-3.5 text-[18px] leading-snug text-ink-900 placeholder:text-ink-600/70 focus:border-forest-800 focus:outline-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <SubmitButton size="lg" pendingLabel="Sending…" className={pill("primary", "min-h-14")}>
            <Send className="h-5 w-5" aria-hidden="true" /> Send
          </SubmitButton>
        </div>
      </form>

      {editable && (
        <form action={buildDispatch} className="mt-6 border-t border-sand-200 pt-5">
          <input type="hidden" name="tripId" value={tripId} />
          <p className="text-[17px] text-ink-700">When you have told the assistant what you enjoy, it can fill your free days with suggestions.</p>
          <SubmitButton size="lg" pendingLabel="Finding ideas…" className={pill("secondary", "mt-3")}>
            <Sparkles className="h-5 w-5" aria-hidden="true" /> Suggest things for my free days
          </SubmitButton>
          <FormFeedback state={buildState} className="mt-2" />
        </form>
      )}
    </section>
  );
}

function IdeaCard({
  component,
  reason,
  days,
  editable,
  onPlace,
}: {
  component: LibraryComponent;
  reason: string;
  days: BuilderDay[];
  editable: boolean;
  onPlace: (componentId: string, day: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="rounded-3xl border-2 border-sand-200 bg-white p-5">
      <p className="text-[18px] font-semibold leading-snug text-ink-900">{component.name}</p>
      <p className="mt-1 text-[16px] text-ink-600">
        {component.vendorName} · {formatDuration(component.durationMinutes)} · {formatMoney(component.price, component.currency)}{" "}
        {component.priceUnitLabel}
      </p>
      <p className="mt-2 text-[16px] font-medium text-marigold-700">{reason}</p>
      {editable &&
        (picking ? (
          <div className="mt-4" role="group" aria-label={`Choose a day for ${component.name}`}>
            <p className="text-[17px] font-semibold text-ink-900">Which day?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {days.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => onPlace(component.id, d.key)}
                  className="min-h-12 rounded-full border-2 border-forest-900 bg-white px-4 text-[16px] font-semibold text-forest-900 hover:bg-forest-900 hover:text-white"
                >
                  Day {d.dayNumber}
                </button>
              ))}
              <button type="button" onClick={() => setPicking(false)} className={pill("quiet", "min-h-12")}>
                Cancel
              </button>
            </div>
            <p className="mt-2 text-[15px] text-ink-600">We choose a good time; you can change it afterwards.</p>
          </div>
        ) : (
          <button type="button" onClick={() => setPicking(true)} className={pill("secondary", "mt-4")}>
            <Plus className="h-5 w-5" aria-hidden="true" /> Add to my trip
          </button>
        ))}
    </div>
  );
}
