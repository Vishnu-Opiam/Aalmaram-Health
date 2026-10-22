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
  TripStatusBadge,
} from "@/components/admin/status-badges";
import { createTripAction } from "../../trips/actions";
import { TripForm } from "../../trips/forms";
import {
  addDays,
  formatDateRange,
  formatRelative,
  formatShortDate,
  toDateInputValue,
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
      relationshipManager: { select: { name: true } },
      trips: {
        orderBy: { startDate: "asc" },
        include: { itinerary: { select: { _count: { select: { items: true } } } } },
      },
    },
  });

  if (!client) nextNotFound();

  const tripIds = client.trips.map((trip) => trip.id);

  // Activity for the client record itself plus all of its trips.
  const activity = await prisma.activityLog.findMany({
    where: {
      OR: [
        { entityType: "Client", entityId: client.id },
        { entityType: "Trip", entityId: { in: tripIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const suggestedStart = addDays(new Date(), 30);
  const address = [client.addressLine, client.city, client.postcode, client.country].filter(Boolean).join(", ");

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
            <ButtonLink href="#new-trip" size="sm">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New trip
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
                  {
                    term: "Date of birth",
                    detail: client.dateOfBirth ? formatShortDate(client.dateOfBirth) : "—",
                  },
                  { term: "Address", detail: address || "—" },
                  {
                    term: "Relationship manager",
                    detail: client.relationshipManager?.name ?? "Not assigned",
                  },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Lasting preferences"
              description="True across trips. Not a medical record."
            />
            <p className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-ink-700">
              {client.generalPreferences ?? "—"}
            </p>
          </Card>

          <Card>
            <CardHeader
              title="Trips"
              description="Each trip has its own requirements, conversations and itinerary."
            />
            {client.trips.length > 0 && (
              <ul className="divide-y divide-sand-200">
                {client.trips.map((trip) => (
                  <li key={trip.id}>
                    <Link
                      href={`/admin/trips/${trip.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-sand-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink-900">{trip.name}</p>
                        <p className="truncate text-xs text-ink-500">
                          {formatDateRange(trip.startDate, trip.endDate)} ·{" "}
                          {pluralise(trip.itinerary?._count.items ?? 0, "activity", "activities")}
                        </p>
                      </div>
                      <TripStatusBadge status={trip.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <details id="new-trip" className="border-t border-sand-200 px-5 py-4" open={client.trips.length === 0}>
              <summary className="cursor-pointer text-[13px] font-medium text-teal-600">
                {client.trips.length === 0 ? "Create the first trip" : "New trip"}
              </summary>
              <div className="mt-4">
                <TripForm
                  action={createTripAction}
                  clientId={client.id}
                  initial={{
                    name: "Kerala trip",
                    startDate: toDateInputValue(suggestedStart),
                    endDate: toDateInputValue(addDays(suggestedStart, 9)),
                    travellers: 1,
                  }}
                  submitLabel="Create trip"
                />
              </div>
            </details>
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
