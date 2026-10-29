import { z } from "zod";
import { isMedicalQuestion, MEDICAL_DEFLECTION } from "./safety";

/**
 * The client's AI chat, stored as one AI_CHAT Conversation per trip. The
 * transcript is plain text: entries separated by a blank line, each starting
 * "Client:" or "Assistant:", so staff read it like any other transcript.
 */
export type ChatMessage = { role: "client" | "assistant"; text: string };

const PREFIX = { client: "Client: ", assistant: "Assistant: " } as const;

export function parseTranscript(transcript: string): ChatMessage[] {
  return transcript
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) =>
      entry.startsWith(PREFIX.assistant)
        ? { role: "assistant" as const, text: entry.slice(PREFIX.assistant.length) }
        : { role: "client" as const, text: entry.startsWith(PREFIX.client) ? entry.slice(PREFIX.client.length) : entry },
    );
}

export function appendToTranscript(transcript: string, message: ChatMessage): string {
  // A blank line separates entries, so a message keeps its line breaks but not blank lines.
  const text = message.text.replace(/\r/g, "").replace(/\n{2,}/g, "\n").trim();
  return `${transcript ? `${transcript}\n\n` : ""}${PREFIX[message.role]}${text}`;
}

export const chatReplySchema = z.object({
  reply: z.string().min(1).max(1200),
  readyToBuild: z.boolean(),
  /** Component ids from the offered list; anything else is dropped by the caller. */
  suggestions: z.array(z.string()).max(3).default([]),
});

export type ChatReply = z.infer<typeof chatReplySchema>;

export const CHAT_GREETING =
  "Hello, I'm Aalmaram's trip assistant. Tell me what you'd like from your time in Kerala — “I love art”, “can we see the backwaters?”, the pace you enjoy — and I'll suggest things to add around the appointments your team has arranged. You can ask for a person at any time.";

const SCRIPT = [
  "Thank you. What would you like from the health side of the trip — for example a check-up, a specialist consultation, or a review of reports you already have?",
  "Lovely. Beyond health, what draws you most: Ayurveda and wellness, or Kerala's culture — performances, food, the backwaters?",
  "And how do you like to travel: relaxed with free afternoons, balanced, or as much as possible?",
];

export const SUGGESTION_REPLY =
  "That sounds lovely. Here are some things you might enjoy — press “Add to my trip” on any of them and choose a day. Nothing is booked until you confirm your trip.";

/**
 * Deterministic assistant for the fake provider: offers what the client's
 * last message points at (`matches`, from `interestMatches`), otherwise
 * walks a short discovery script.
 */
export function scriptedReply(messages: ChatMessage[], matches: string[] = []): ChatReply {
  const last = [...messages].reverse().find((m) => m.role === "client");
  if (last && isMedicalQuestion(last.text)) return { reply: MEDICAL_DEFLECTION, readyToBuild: false, suggestions: [] };
  const asked = messages.filter((m) => m.role === "client").length;
  if (matches.length > 0) {
    return { reply: SUGGESTION_REPLY, readyToBuild: asked >= SCRIPT.length, suggestions: matches.slice(0, 3) };
  }
  if (asked <= SCRIPT.length) {
    return { reply: SCRIPT[Math.max(0, asked - 1)], readyToBuild: asked >= SCRIPT.length, suggestions: [] };
  }
  return {
    reply:
      "Thank you, that gives me a good picture. Press “Suggest things for my free days” and I'll add ideas around your health appointments — you can change or remove anything. Or ask your personal contact to get in touch whenever you like.",
    readyToBuild: true,
    suggestions: [],
  };
}
