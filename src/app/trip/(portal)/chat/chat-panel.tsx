"use client";

import { useActionState, useEffect, useRef } from "react";
import { Sparkles, UserRound } from "lucide-react";
import { FormFeedback, SubmitButton, useActionRedirect } from "@/components/ui/form-status";
import { Alert, Textarea } from "@/components/ui/primitives";
import type { ChatMessage } from "@/domain/ai/chat";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import type { ChatState } from "../../actions";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ChatPanel({
  tripId,
  greeting,
  initial,
  send,
  build,
  person,
}: {
  tripId: string;
  greeting: string;
  initial: ChatMessage[];
  send: (prev: ChatState, formData: FormData) => Promise<ChatState>;
  build: Action;
  person: Action;
}) {
  const [chat, dispatch, pending] = useActionState(send, {
    messages: initial,
    readyToBuild: initial.filter((m) => m.role === "client").length >= 3,
    error: null,
  });
  const [buildState, buildDispatch] = useActionState(build, idleState);
  const [personState, personDispatch] = useActionState(person, idleState);
  useActionRedirect(buildState);
  useActionRedirect(personState);

  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
    if (!pending) formRef.current?.reset();
  }, [chat.messages.length, pending]);

  const messages: ChatMessage[] = [{ role: "assistant", text: greeting }, ...chat.messages];

  return (
    <div className="space-y-5">
      <ol className="space-y-4" aria-live="polite" aria-label="Conversation">
        {messages.map((message, index) => (
          <li key={index} className={cn("flex", message.role === "client" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-5 py-3 text-[17px] leading-relaxed",
                message.role === "client" ? "bg-teal-600 text-white" : "border border-sand-200 bg-white text-ink-800",
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
      <div ref={endRef} />

      {chat.error && <Alert tone="danger">{chat.error}</Alert>}

      <form ref={formRef} action={dispatch} className="space-y-3">
        <input type="hidden" name="tripId" value={tripId} />
        <label htmlFor="chat-text" className="sr-only">
          Your message
        </label>
        <Textarea
          id="chat-text"
          name="text"
          rows={3}
          required
          placeholder="Write your message…"
          className="text-[17px]"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <SubmitButton size="lg" pendingLabel="Sending…">
          Send
        </SubmitButton>
      </form>

      <div className="grid gap-4 rounded-lg border border-sand-200 bg-white p-5 sm:grid-cols-2">
        <form action={buildDispatch} className="space-y-2">
          <input type="hidden" name="tripId" value={tripId} />
          <FormFeedback state={buildState} />
          <SubmitButton size="lg" pendingLabel="Building…" variant={chat.readyToBuild ? "primary" : "secondary"}>
            <Sparkles className="h-5 w-5" aria-hidden="true" /> Build my itinerary
          </SubmitButton>
          <p className="text-[14px] text-ink-500">
            Suggestions are added around your health appointments. You can change or remove any of them, and nothing is
            booked until you confirm.
          </p>
        </form>
        <form action={personDispatch} className="space-y-2">
          <input type="hidden" name="tripId" value={tripId} />
          <FormFeedback state={personState} />
          <SubmitButton size="lg" pendingLabel="Asking…" variant="secondary">
            <UserRound className="h-5 w-5" aria-hidden="true" /> Talk to a person
          </SubmitButton>
          <p className="text-[14px] text-ink-500">Your relationship manager will get in touch.</p>
        </form>
      </div>
    </div>
  );
}
