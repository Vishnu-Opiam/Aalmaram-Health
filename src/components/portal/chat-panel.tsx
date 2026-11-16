"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Send } from "lucide-react";
import { Alert } from "@/components/ui/primitives";
import { FormFeedback, useActionRedirect } from "@/components/ui/form-status";
import type { ChatMessage } from "@/domain/ai/chat";
import type { ChatState } from "@/app/trip/actions";
import { formatMoney } from "@/domain/itineraries/pricing";
import { formatDuration } from "@/domain/vendors/profile";
import type { BuilderDay, Library, LibraryComponent } from "@/domain/trips/builder-view";
import { idleState, type FormState } from "@/lib/validation/form";
import { KitSubmit } from "./contact-card";
import { Button, Chip, ModuleDot, SectionHeading, buttonClass } from "./kit";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

// Phrased so the assistant can match them to experiences ("art", "eat", "boat"…).
const PROMPTS = ["Art and dance", "The backwaters by boat", "Somewhere nice to eat", "Ayurveda and massage"];

/**
 * The trip assistant on its own page: one conversation as a calm transcript,
 * ready-made questions to tap, and ideas that go straight into a chosen day.
 * Everything said is kept on the trip's AI_CHAT conversation for the team.
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
  const [asking, setAsking] = useState<string | null>(null);
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
    setAsking(text);
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
    <section aria-labelledby="assistant-heading" className="max-w-[760px]">
      <SectionHeading
        id="assistant-heading"
        label="Planning assistant"
        title="Ideas for your free days"
        lead={`An assistant that suggests things to do around your appointments. It can be wrong, and it never gives medical advice. For anything about your health or your appointments, please ask ${contact}.`}
      />

      <ol className="mt-10 border-b border-paper-line" aria-live="polite" aria-label="Conversation">
        {messages.map((message, index) => (
          <li key={index} className="border-t border-paper-line py-6">
            <p className="pk-label">{message.role === "client" ? "You" : "Assistant"}</p>
            <p className="pk-body mt-1 whitespace-pre-wrap text-mist-ink">{message.text}</p>
          </li>
        ))}
        {pending && (
          <li className="border-t border-paper-line py-6 text-[17px] text-mist-muted" role="status">
            The assistant is writing…
          </li>
        )}
      </ol>

      {ideas.length > 0 && (
        <ul className="mt-8 border-b border-paper-line" aria-label="Ideas from the assistant">
          {ideas.map((s) => (
            <li key={s.componentId} className="border-t border-paper-line py-6">
              <IdeaCard component={components.get(s.componentId)!} reason={s.reason} days={days} editable={editable} onPlace={placeIdea} />
            </li>
          ))}
        </ul>
      )}
      {placing && (
        <p role="status" className="mt-3 text-[17px] font-medium text-mist-ink">
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

      {editable && (
        <form action={buildDispatch} className="mt-10">
          <input type="hidden" name="tripId" value={tripId} />
          <p className="pk-body text-mist-muted">When you have told the assistant what you enjoy, it can fill your free days with suggestions.</p>
          <KitSubmit pendingLabel="Finding ideas…" className={buttonClass("secondary", "mt-4")}>
            Suggest things for my free days
          </KitSubmit>
          <FormFeedback state={buildState} className="mt-2" />
        </form>
      )}

      <div className="-mx-4 mt-10 flex gap-3 overflow-x-auto px-4 pb-1 min-[390px]:-mx-5 min-[390px]:px-5 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Ask about">
        {PROMPTS.map((text) => (
          <Chip key={text} pressed={pending && asking === text} disabled={pending} onClick={() => ask(text)}>
            {text}
          </Chip>
        ))}
      </div>

      {/* Sticks above the phone tab bar; on desktop to the bottom of the viewport. */}
      <div className="pk-paper sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 -mx-4 mt-4 border-t border-paper-line px-4 pb-3 pt-3 min-[390px]:-mx-5 min-[390px]:px-5 md:bottom-0 md:mx-0 md:px-0">
        <form ref={formRef} action={dispatch}>
          <input type="hidden" name="tripId" value={tripId} />
          <label htmlFor="chat-text" className="sr-only">
            Your message
          </label>
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              id="chat-text"
              name="text"
              rows={1}
              required
              maxLength={2000}
              placeholder="Tell us what you enjoy"
              className="block min-h-14 flex-1 resize-y border-2 border-mist-ink/60 bg-paper-raised px-4 py-3.5 text-[18px] leading-snug text-mist-ink placeholder:text-mist-muted focus:border-mist-ink"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <KitSubmit pendingLabel="Sending…" className={buttonClass("primary", "shrink-0 px-6 sm:px-8")}>
              <Send className="h-5 w-5" aria-hidden="true" /> Send
            </KitSubmit>
          </div>
        </form>
      </div>
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
    <div>
      <ModuleDot moduleName={component.moduleName} className="text-[16px] text-mist-muted" />
      <p className="pk-h3 mt-1">{component.name}</p>
      <p className="mt-1 text-[16px] text-mist-muted">
        {component.vendorName} · {formatDuration(component.durationMinutes)} · {formatMoney(component.price, component.currency)}{" "}
        {component.priceUnitLabel}
      </p>
      <p className="mt-2 text-[17px] text-mist-ink">{reason}</p>
      {editable &&
        (picking ? (
          <div className="mt-4" role="group" aria-label={`Choose a day for ${component.name}`}>
            <p className="pk-label text-mist-ink">Which day?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {days.map((d) => (
                <Button key={d.key} variant="secondary" onClick={() => onPlace(component.id, d.key)} className="min-h-12 px-5">
                  Day {d.dayNumber}
                </Button>
              ))}
              <Button variant="quiet" onClick={() => setPicking(false)}>
                Cancel
              </Button>
            </div>
            <p className="mt-2 text-[16px] text-mist-muted">We choose a good time; you can change it afterwards.</p>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setPicking(true)} className="mt-4">
            <Plus className="h-5 w-5" aria-hidden="true" /> Add to my trip
          </Button>
        ))}
    </div>
  );
}
