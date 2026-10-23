"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Send, Sparkles, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/primitives";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import type { Suggestion } from "@/components/builder/add-panel";
import type { ChatMessage } from "@/domain/ai/chat";
import type { ChatState } from "@/app/trip/actions";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export type ChatDockProps = {
  tripId: string;
  greeting: string;
  initial: ChatMessage[];
  send: (prev: ChatState, formData: FormData) => Promise<ChatState>;
  build: Action;
  person: Action;
  editable: boolean;
  /** Text to put in the box, e.g. from "Ask the assistant about this"; the nonce re-applies the same text. */
  draft: { text: string; nonce: number } | null;
  renderIdea: (idea: Suggestion) => React.ReactNode;
};

/**
 * The assistant, docked under the board on the same page: type what you'd
 * like ("I love art", "can we see the backwaters?") and it answers with ideas
 * you can add or drag onto a day. Everything said is kept on the trip's
 * AI_CHAT conversation for the team.
 */
export function ChatDock({ tripId, greeting, initial, send, build, person, editable, draft, renderIdea }: ChatDockProps) {
  const [chat, dispatch, pending] = useActionState(send, {
    messages: initial,
    readyToBuild: initial.filter((m) => m.role === "client").length >= 3,
    suggestions: [],
    error: null,
  });
  const [buildState, buildDispatch] = useActionState(build, idleState);
  const [personState, personDispatch] = useActionState(person, idleState);
  useActionRedirect(buildState);
  useActionRedirect(personState);

  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!draft || !inputRef.current) return;
    inputRef.current.value = draft.text;
    inputRef.current.focus();
    setOpen(true);
  }, [draft]);

  // Collapsed on page load so the board is seen at once; a new reply opens it.
  const seen = useRef(initial.length);
  useEffect(() => {
    if (chat.messages.length > seen.current) setOpen(true);
    seen.current = chat.messages.length;
    if (!pending) formRef.current?.reset();
  }, [chat.messages.length, pending]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, chat.messages.length, pending]);

  const messages: ChatMessage[] = [{ role: "assistant", text: greeting }, ...chat.messages];

  return (
    <section
      aria-label="Ask our assistant"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-white/95 shadow-[0_-8px_24px_rgb(0_0_0/0.06)] backdrop-blur"
    >
      <div className="mx-auto max-w-[1400px] px-3 sm:px-5">
        {open && (
          <div className="max-h-[40vh] overflow-y-auto pt-4" id="chat-history">
            <ol className="space-y-3" aria-live="polite" aria-label="Conversation">
              {messages.map((message, index) => (
                <li key={index} className={cn("flex", message.role === "client" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[16px] leading-relaxed sm:max-w-[70%]",
                      message.role === "client" ? "bg-teal-600 text-white" : "bg-sand-100 text-ink-800",
                    )}
                  >
                    <span className="sr-only">{message.role === "client" ? "You:" : "Assistant:"} </span>
                    {message.text}
                  </div>
                </li>
              ))}
              {pending && (
                <li className="text-[15px] text-ink-400" role="status">
                  The assistant is writing…
                </li>
              )}
            </ol>
            {chat.suggestions.length > 0 && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-3" aria-label="Ideas from the assistant">
                {chat.suggestions.map((s) => (
                  <li key={s.componentId}>{renderIdea(s)}</li>
                ))}
              </ul>
            )}
            {chat.error && (
              <Alert tone="danger" className="mt-3">
                {chat.error}
              </Alert>
            )}
            <div className="mt-3 flex flex-wrap items-start gap-2">
              {editable && (
                <form action={buildDispatch}>
                  <input type="hidden" name="tripId" value={tripId} />
                  <SubmitButton size="md" pendingLabel="Building…" variant={chat.readyToBuild ? "primary" : "secondary"}>
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> Build my itinerary
                  </SubmitButton>
                  <FormFeedback state={buildState} className="mt-2" />
                </form>
              )}
              <form action={personDispatch}>
                <input type="hidden" name="tripId" value={tripId} />
                <SubmitButton size="md" pendingLabel="Asking…" variant="secondary">
                  <UserRound className="h-4 w-4" aria-hidden="true" /> Talk to a person
                </SubmitButton>
                <FormFeedback state={personState} className="mt-2" />
              </form>
            </div>
            <div ref={endRef} />
          </div>
        )}

        <form ref={formRef} action={dispatch} className="flex items-end gap-2 py-3">
          <input type="hidden" name="tripId" value={tripId} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="chat-history"
            className="flex h-12 shrink-0 items-center gap-1 rounded-lg px-2 text-[15px] font-medium text-ink-600 hover:bg-sand-100"
          >
            {open ? <ChevronDown className="h-5 w-5" aria-hidden="true" /> : <ChevronUp className="h-5 w-5" aria-hidden="true" />}
            <span className="hidden sm:inline">{open ? "Hide chat" : "Chat"}</span>
            <span className="sr-only sm:hidden">{open ? "Hide chat" : "Show chat"}</span>
          </button>
          <label htmlFor="chat-text" className="sr-only">
            Your message
          </label>
          <textarea
            ref={inputRef}
            id="chat-text"
            name="text"
            rows={1}
            required
            maxLength={2000}
            placeholder="Ask our assistant…"
            className="block min-h-12 flex-1 resize-none rounded-lg border border-sand-300 bg-white px-4 py-3 text-[16px] leading-snug text-ink-900 placeholder:text-ink-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <SubmitButton size="lg" pendingLabel="Sending…" className="h-12 shrink-0">
            <Send className="h-4 w-4" aria-hidden="true" /> Send
          </SubmitButton>
        </form>
      </div>
    </section>
  );
}
