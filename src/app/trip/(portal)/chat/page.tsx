import type { Metadata } from "next";
import { requireClientPage } from "@/lib/auth/guards";
import { ChatPanel } from "@/components/portal/chat-panel";
import { ContactCard } from "@/components/portal/contact-card";
import { TripSwitcher } from "@/components/portal/trip-switcher";
import { firstName } from "@/components/portal/ui";
import { CHAT_GREETING } from "@/domain/ai/chat";
import { loadBuilderTrip, loadLibrary } from "@/domain/trips/queries";
import { loadPortalTrips, pickTrip } from "@/domain/trips/portal";
import { prisma } from "@/lib/db";
import { loadChat } from "@/lib/services/ai-planning";
import { param } from "@/lib/utils";
import {
  buildMyItineraryAction,
  placeClientIdeaAction,
  sendChatMessageAction,
  talkToPersonAction,
} from "../../actions";

export const metadata: Metadata = { title: "Ask us" };

/** A person first (the relationship manager), then the assistant. */
export default async function AskUsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClientPage();
  const params = await searchParams;
  const trips = await loadPortalTrips(client.id);
  const current = pickTrip(trips, param(params, "trip") || undefined);
  const [trip, library, chat, record] = await Promise.all([
    current ? loadBuilderTrip(current.id, { kind: "client", clientId: client.id }) : null,
    loadLibrary(),
    current ? loadChat(current.id, client.id) : [],
    prisma.client.findUnique({
      where: { id: client.id },
      select: { relationshipManager: { select: { name: true, email: true } } },
    }),
  ]);
  const manager = record?.relationshipManager ?? null;
  const contact = manager ? firstName(manager.name) : "your team";

  return (
    <>
      <h1 className="sr-only">Ask us</h1>
      <ContactCard
        bleed
        tripId={trip?.id ?? null}
        name={manager?.name ?? null}
        email={manager?.email ?? null}
        asked={param(params, "asked") === "1"}
        action={talkToPersonAction}
      />
      <div className="pk-paper pb-16 pt-10 md:pb-24 md:pt-16">
        <div className="pk-frame">
          {trip && <TripSwitcher trips={trips} currentId={trip.id} path="/trip/chat" />}
          {trip ? (
            <ChatPanel
              tripId={trip.id}
              greeting={CHAT_GREETING}
              initial={chat}
              send={sendChatMessageAction}
              build={buildMyItineraryAction}
              place={placeClientIdeaAction}
              editable={trip.editable}
              days={trip.days}
              library={library}
              contact={contact}
              about={param(params, "about") || null}
            />
          ) : (
            <p className="pk-body pk-read text-mist-muted">
              Our assistant opens once your trip is set up. Until then, {contact} is happy to help.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
