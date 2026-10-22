import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { FileText } from "lucide-react";
import {
  Alert,
  AppLink as Link,
  ButtonLink,
  Card,
  CardHeader,
  PageHeader,
} from "@/components/ui/primitives";
import { ActionButton } from "@/components/admin/action-button";
import { TripStatusBadge } from "@/components/admin/status-badges";
import { ItineraryBuilder } from "@/components/builder/itinerary-builder";
import { loadBuilderTrip, loadLibrary } from "@/domain/trips/queries";
import { formatDateRange, formatRelative, formatShortDate } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  addBlockAction,
  addConversationAction,
  moveBlockAction,
  removeBlockAction,
  reopenItineraryAction,
  saveItineraryNotesAction,
  saveRequirementsAction,
  updateTripAction,
} from "../actions";
import { ConversationForm, NotesForm, RequirementsForm, TripForm } from "../forms";

export const metadata: Metadata = { title: "Trip" };

const CHANNEL_LABELS = {
  AI_CHAT: "AI chat",
  STAFF_CHAT: "Staff chat",
  CALL: "Call",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  IN_PERSON: "In person",
} as const;

const PACE_LABELS = { RELAXED: "Relaxed", BALANCED: "Balanced", PACKED: "Packed" } as const;

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserPage("/admin/trips");
  const { id } = await params;

  const [trip, builder, library, modules] = await Promise.all([
    prisma.trip.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, relationshipManager: { select: { name: true } } } },
        requirements: { include: { moduleMix: true } },
        conversations: { orderBy: { occurredAt: "desc" }, include: { createdBy: { select: { name: true } } } },
        itinerary: { select: { adminNotes: true, clientNotes: true, report: { select: { status: true } } } },
      },
    }),
    loadBuilderTrip(id, { kind: "staff" }),
    loadLibrary(),
    prisma.module.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  if (!trip || !builder) nextNotFound();

  const requirements = trip.requirements;
  const now = new Date();
  const nowLocal = now.toISOString().slice(0, 16);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/admin/clients/${trip.client.id}`} className="hover:underline">
            {trip.client.name}
          </Link>
        }
        title={trip.name}
        description={`${formatDateRange(trip.startDate, trip.endDate)} · ${trip.travellers} traveller${trip.travellers === 1 ? "" : "s"}${trip.client.relationshipManager ? ` · RM ${trip.client.relationshipManager.name}` : ""}`}
        actions={
          <>
            <TripStatusBadge status={trip.status} />
            <ButtonLink href={`/admin/trips/${trip.id}/report`} variant="secondary" size="sm">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              What-to-Expect report
            </ButtonLink>
          </>
        }
      />

      {trip.status === "AWAITING_PAYMENT" && (
        <Alert tone="warning" title="The client confirmed this itinerary">
          <p>
            Blocks and prices are locked{builder.confirmedAt ? ` since ${formatShortDate(new Date(builder.confirmedAt))}` : ""}.
            Payment is collected before any booking (not yet in the app). If the client asks for a change, reopen it.
          </p>
          <ActionButton
            action={reopenItineraryAction}
            fields={{ tripId: trip.id }}
            pendingLabel="Reopening…"
            className="mt-3"
            confirm="Reopen the itinerary for changes? The client will be able to edit it again."
          >
            Reopen for changes
          </ActionButton>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section id="itinerary" aria-labelledby="itinerary-heading" className="min-w-0 space-y-3">
          <h2 id="itinerary-heading" className="text-sm font-semibold text-ink-900">
            Itinerary
          </h2>
          <p className="text-xs text-ink-500">
            What you add here is the client&rsquo;s <strong>health core</strong>: the client sees it fixed and builds
            the rest of the trip around it.
          </p>
          <ItineraryBuilder
            trip={builder}
            library={library}
            variant="staff"
            actions={{ add: addBlockAction, move: moveBlockAction, remove: removeBlockAction }}
          />
        </section>

        <aside className="space-y-6">
          <Card id="requirements">
            <CardHeader title="Requirements" description="What the client wants from this trip." />
            <div className="p-5">
              {requirements && (
                <dl className="mb-4 grid grid-cols-2 gap-2 text-xs text-ink-600">
                  <div>
                    <dt className="text-ink-400">Pace</dt>
                    <dd>{requirements.pace ? PACE_LABELS[requirements.pace] : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-400">Budget</dt>
                    <dd>
                      {requirements.budgetAmount ? `${requirements.budgetAmount.toString()} ${requirements.budgetCurrency ?? ""}` : "—"}
                    </dd>
                  </div>
                </dl>
              )}
              <RequirementsForm
                action={saveRequirementsAction.bind(null, trip.id)}
                modules={modules}
                initial={{
                  summary: requirements?.summary ?? "",
                  budgetAmount: requirements?.budgetAmount?.toString() ?? "",
                  budgetCurrency: requirements?.budgetCurrency ?? "",
                  pace: requirements?.pace ?? "",
                  mustHaves: requirements?.mustHaves.join("\n") ?? "",
                  avoid: requirements?.avoid.join("\n") ?? "",
                  mix: Object.fromEntries((requirements?.moduleMix ?? []).map((s) => [s.moduleId, String(s.percent)])),
                }}
              />
            </div>
          </Card>

          <Card id="conversations">
            <CardHeader
              title={`Conversations (${trip.conversations.length})`}
              description="Staff-only. The AI drafts requirements from these."
            />
            <ul className="divide-y divide-sand-200">
              {trip.conversations.map((conversation) => (
                <li key={conversation.id}>
                  <details className="px-5 py-3">
                    <summary className="cursor-pointer text-[13px] text-ink-800">
                      {CHANNEL_LABELS[conversation.channel]} · {formatShortDate(conversation.occurredAt)}
                      <span className="text-ink-400">
                        {" "}
                        · {conversation.createdBy?.name ?? "client"} · {formatRelative(conversation.createdAt)}
                      </span>
                    </summary>
                    {conversation.summary && (
                      <p className="mt-2 rounded bg-brass-100 p-2 text-xs text-ink-700">
                        <strong>Brief:</strong> {conversation.summary}
                      </p>
                    )}
                    <p className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-ink-600">
                      {conversation.transcript}
                    </p>
                  </details>
                </li>
              ))}
              <li>
                <details className="px-5 py-3" open={trip.conversations.length === 0}>
                  <summary className="cursor-pointer text-[13px] font-medium text-teal-600">Record a conversation</summary>
                  <div className="mt-3">
                    <ConversationForm action={addConversationAction.bind(null, trip.id)} defaultOccurredAt={nowLocal} />
                  </div>
                </details>
              </li>
            </ul>
          </Card>

          <Card>
            <CardHeader title="Trip details" />
            <div className="p-5">
              <TripForm
                action={updateTripAction.bind(null, trip.id)}
                initial={{
                  name: trip.name,
                  startDate: builder.startDate,
                  endDate: builder.endDate,
                  travellers: trip.travellers,
                }}
                submitLabel="Save trip"
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Notes" />
            <div className="p-5">
              <NotesForm
                action={saveItineraryNotesAction.bind(null, trip.id)}
                initial={{
                  adminNotes: trip.itinerary?.adminNotes ?? "",
                  clientNotes: trip.itinerary?.clientNotes ?? "",
                }}
              />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
