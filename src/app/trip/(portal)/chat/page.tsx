import type { Metadata } from "next";
import { requireClientPage } from "@/lib/auth/guards";
import { CHAT_GREETING } from "@/domain/ai/chat";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { loadChat } from "@/lib/services/ai-planning";
import { param } from "@/lib/utils";
import { buildMyItineraryAction, sendChatMessageAction, talkToPersonAction } from "../../actions";
import { ChatPanel } from "./chat-panel";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const trip = pickTrip(await loadPortalTrips(client.id), param(await searchParams, "trip") || undefined);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <h1 className="font-serif text-4xl tracking-tight text-ink-900">Chat</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-600">
        Tell our assistant what you would like from your trip, or ask for a person at any time. The assistant cannot give
        medical advice.
      </p>
      <div className="mt-8">
        {trip ? (
          <ChatPanel
            tripId={trip.id}
            greeting={CHAT_GREETING}
            initial={await loadChat(trip.id, client.id)}
            send={sendChatMessageAction}
            build={buildMyItineraryAction}
            person={talkToPersonAction}
          />
        ) : (
          <p className="text-[17px] text-ink-500">Your relationship manager is setting up your trip; the chat opens then.</p>
        )}
      </div>
    </div>
  );
}
