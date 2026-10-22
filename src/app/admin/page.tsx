import type { Metadata } from "next";
import type { TripStatus } from "@prisma/client";
import { ArrowRight, Plus } from "lucide-react";
import {
  AppLink as Link,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui/primitives";
import { ClientStatusBadge, TripStatusBadge } from "@/components/admin/status-badges";
import { formatDateRange, formatRelative } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard" };

const tripCard = {
  include: { client: { select: { id: true, name: true } }, itinerary: { select: { _count: { select: { items: true } } } } },
} as const;

/**
 * Operational dashboard: what needs a human today, not vanity analytics.
 */
export default async function AdminDashboardPage() {
  await requireUserPage("/admin");

  const planning = { status: "PLANNING" as TripStatus };
  const [needsHealthCore, inPlanning, confirmed, recentClients] = await Promise.all([
    prisma.trip.findMany({
      where: { ...planning, itinerary: { items: { none: { addedBy: "TEAM" } } } },
      ...tripCard,
      orderBy: { startDate: "asc" },
      take: 6,
    }),
    prisma.trip.findMany({
      where: { ...planning, itinerary: { items: { some: { addedBy: "TEAM" } } } },
      ...tripCard,
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.trip.findMany({
      where: { status: "AWAITING_PAYMENT" },
      ...tripCard,
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, country: true, status: true, _count: { select: { trips: true } } },
    }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
        description="Everything currently waiting on the Aalmaram team."
        actions={
          <>
            <ButtonLink href="/admin/vendors/new" variant="secondary" size="sm">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New vendor
            </ButtonLink>
            <ButtonLink href="/admin/clients/new" size="sm">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New client
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <TripQueue
          title="Needs a health core"
          description="Planning, but the team hasn't placed the health appointments yet."
          trips={needsHealthCore}
          empty="Every trip in planning has its health core."
        />
        <TripQueue
          title="Client is building"
          description="Health core placed; the client is adding the rest."
          trips={inPlanning}
          empty="No trips being built right now."
        />
        <TripQueue
          title="Confirmed — awaiting payment"
          description="Locked by the client. Collect payment before booking."
          trips={confirmed}
          empty="No confirmed trips waiting."
        />
      </div>

      <Card>
        <CardHeader
          title="Recent clients"
          description="The newest people on the books."
          action={
            <Link href="/admin/clients" className="flex items-center gap-1 text-[13px] font-medium text-teal-600 hover:underline">
              All clients
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />
        {recentClients.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No clients yet"
              description="Create the first client, then their first trip."
              action={
                <ButtonLink href="/admin/clients/new" size="sm">
                  Create client
                </ButtonLink>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-sand-200">
            {recentClients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-sand-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink-900">{client.name}</p>
                    <p className="truncate text-xs text-ink-500">
                      {client.country ?? "Country not recorded"} · {client._count.trips} trip{client._count.trips === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ClientStatusBadge status={client.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

type QueueTrip = {
  id: string;
  name: string;
  status: TripStatus;
  startDate: Date;
  endDate: Date;
  updatedAt: Date;
  client: { id: string; name: string };
  itinerary: { _count: { items: number } } | null;
};

function TripQueue({
  title,
  description,
  trips,
  empty,
}: {
  title: string;
  description: string;
  trips: QueueTrip[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {title}
            <span className="rounded-full bg-sand-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-500">{trips.length}</span>
          </span>
        }
        description={description}
      />
      {trips.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-ink-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-sand-200">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/admin/trips/${trip.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-sand-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink-900">{trip.client.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {trip.name} · {formatDateRange(trip.startDate, trip.endDate)} · {trip.itinerary?._count.items ?? 0}{" "}
                    activities · updated {formatRelative(trip.updatedAt)}
                  </p>
                </div>
                <TripStatusBadge status={trip.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
