import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import {
  AppLink as Link,
  ButtonLink,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  PageHeader,
} from "@/components/ui/primitives";
import { InvitePanel } from "./invite-panel";
import {
  ClientStatusBadge,
  ItineraryStatusBadge,
} from "@/components/admin/status-badges";
import {
  formatDateRange,
  formatRelative,
  formatShortDate,
} from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { activityLabel } from "@/lib/services/activity-log";
import { pluralise } from "@/lib/utils";

export const metadata: Metadata = { title: "Client" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/clients");
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      itineraries: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { items: true } } },
      },
    },
  });

  if (!client) nextNotFound();

  const itineraryIds = client.itineraries.map((itinerary) => itinerary.id);

  // Activity for the client record itself plus all of its itineraries.
  const activity = await prisma.activityLog.findMany({
    where: {
      OR: [
        { entityType: "Client", entityId: client.id },
        { entityType: "Itinerary", entityId: { in: itineraryIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const intake: { term: string; detail: string }[] = [
    { term: "Health interests", detail: client.healthInterests ?? "—" },
    { term: "Wellness interests", detail: client.wellnessInterests ?? "—" },
    { term: "Cultural interests", detail: client.culturalInterests ?? "—" },
    { term: "General preferences", detail: client.generalPreferences ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/admin/clients" className="hover:underline">
            Clients
          </Link>
        }
        title={client.name}
        description={`${client.email}${client.country ? ` · ${client.country}` : ""}`}
        actions={
          <>
            <ButtonLink
              href={`/admin/clients/${client.id}/edit`}
              variant="secondary"
              size="sm"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </ButtonLink>
            <ButtonLink
              href={`/admin/itineraries/new?clientId=${client.id}`}
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New itinerary
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Overview" />
            <div className="p-5">
              <DescriptionList
                items={[
                  {
                    term: "Status",
                    detail: <ClientStatusBadge status={client.status} />,
                  },
                  { term: "Email", detail: client.email },
                  { term: "Phone", detail: client.phone ?? "—" },
                  { term: "Country", detail: client.country ?? "—" },
                  {
                    term: "Trip window",
                    detail: formatDateRange(
                      client.tripStartDate,
                      client.tripEndDate,
                    ),
                  },
                  {
                    term: "Duration",
                    detail: client.tripDuration
                      ? pluralise(client.tripDuration, "day")
                      : "—",
                  },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Intake"
              description="Enough to curate a journey. Not a medical record."
            />
            <div className="space-y-5 p-5">
              {intake.map((entry) => (
                <section key={entry.term}>
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    {entry.term}
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                    {entry.detail}
                  </p>
                </section>
              ))}

              {client.intakeNotes && (
                <div className="rounded-md bg-sand-50 p-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    Intake notes (internal)
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                    {client.intakeNotes}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Itineraries"
              description="Every proposal prepared for this client."
              action={
                <ButtonLink
                  href={`/admin/itineraries/new?clientId=${client.id}`}
                  variant="secondary"
                  size="sm"
                >
                  New itinerary
                </ButtonLink>
              }
            />
            {client.itineraries.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No itineraries yet"
                  description="Build the first proposal from the component library."
                  action={
                    <ButtonLink
                      href={`/admin/itineraries/new?clientId=${client.id}`}
                      size="sm"
                    >
                      Start an itinerary
                    </ButtonLink>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-sand-200">
                {client.itineraries.map((itinerary) => (
                  <li key={itinerary.id}>
                    <Link
                      href={`/admin/itineraries/${itinerary.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-sand-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink-900">
                          {itinerary.title}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {formatDateRange(
                            itinerary.startDate,
                            itinerary.endDate,
                          )}{" "}
                          · {pluralise(itinerary._count.items, "item")}
                          {itinerary.publishedAt &&
                            ` · published ${formatShortDate(itinerary.publishedAt)}`}
                        </p>
                      </div>
                      <ItineraryStatusBadge status={itinerary.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Portal access"
              description="Secure, non-guessable invitation link."
            />
            <div className="p-5">
              <InvitePanel
                clientId={client.id}
                clientEmail={client.email}
                issuedAt={
                  client.accessTokenIssuedAt
                    ? formatShortDate(client.accessTokenIssuedAt)
                    : null
                }
                expiresAt={
                  client.accessTokenExpiresAt
                    ? formatShortDate(client.accessTokenExpiresAt)
                    : null
                }
                lastLoginAt={
                  client.lastPortalLoginAt
                    ? formatRelative(client.lastPortalLoginAt)
                    : null
                }
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Activity"
              description="Audit trail for this client."
            />
            {activity.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-ink-400">
                Nothing recorded yet.
              </p>
            ) : (
              <ol className="divide-y divide-sand-200">
                {activity.map((entry) => (
                  <li key={entry.id} className="px-5 py-3">
                    <p className="text-[13px] text-ink-800">
                      {activityLabel(entry.action)}
                    </p>
                    <p className="text-xs text-ink-400">
                      {entry.actorLabel} · {formatRelative(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
