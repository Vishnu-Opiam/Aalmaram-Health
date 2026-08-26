import type { Metadata } from "next";
import { ArrowRight, MessageSquareWarning, Plus } from "lucide-react";
import {
  AppLink as Link,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui/primitives";
import {
  ChangeRequestStatusBadge,
  ClientStatusBadge,
  ItineraryStatusBadge,
} from "@/components/admin/status-badges";
import { formatDateRange, formatRelative } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Operational dashboard: what needs a human today, not vanity analytics.
 */
export default async function AdminDashboardPage() {
  await requireUserPage("/admin");

  const [
    drafts,
    awaitingReview,
    changesRequested,
    recentlyApproved,
    recentClients,
    openChangeRequests,
  ] = await Promise.all([
    prisma.itinerary.findMany({
      where: { status: { in: ["DRAFT", "READY_FOR_REVIEW"] } },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.itinerary.findMany({
      where: { status: "PUBLISHED" },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    prisma.itinerary.findMany({
      where: { status: "CHANGES_REQUESTED" },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.itinerary.findMany({
      where: { status: "APPROVED" },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { approvedAt: "desc" },
      take: 6,
    }),
    prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        country: true,
        status: true,
        tripStartDate: true,
        tripEndDate: true,
        createdAt: true,
      },
    }),
    prisma.changeRequest.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        itinerary: {
          select: {
            id: true,
            title: true,
            client: { select: { name: true } },
          },
        },
        itineraryItem: {
          select: { customTitle: true, component: { select: { name: true } } },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Pre-journey operations"
        title="Dashboard"
        description="Everything currently waiting on the Aalmaram team."
        actions={
          <>
            <ButtonLink href="/admin/clients/new" variant="secondary" size="sm">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New client
            </ButtonLink>
            <ButtonLink
              href="/admin/components/new"
              variant="secondary"
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add component
            </ButtonLink>
            <ButtonLink href="/admin/itineraries/new" size="sm">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New itinerary
            </ButtonLink>
          </>
        }
      />

      {openChangeRequests.length > 0 && (
        <Card className="border-warning-200 bg-warning-50">
          <CardHeader
            title={
              <span className="flex items-center gap-2 text-warning-600">
                <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
                {openChangeRequests.length} open change request
                {openChangeRequests.length === 1 ? "" : "s"}
              </span>
            }
            description="Clients are waiting on a revised proposal."
            className="border-warning-200"
          />
          <ul className="divide-y divide-warning-200">
            {openChangeRequests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/admin/itineraries/${request.itinerary.id}/changes`}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-white/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink-900">
                      {request.itinerary.client.name} ·{" "}
                      {request.itinerary.title}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {request.itineraryItem
                        ? `About: ${request.itineraryItem.customTitle ?? request.itineraryItem.component.name}`
                        : "General request about the whole trip"}
                      {" · "}
                      {formatRelative(request.createdAt)}
                    </p>
                  </div>
                  <ChangeRequestStatusBadge status={request.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <ItineraryQueue
          title="Draft itineraries"
          description="Being built. Not visible to the client."
          items={drafts}
          emptyTitle="No drafts in progress"
          emptyDescription="Start an itinerary from a client record."
        />
        <ItineraryQueue
          title="Awaiting client review"
          description="Published and with the client now."
          items={awaitingReview}
          emptyTitle="Nothing awaiting review"
          emptyDescription="Published proposals will appear here."
        />
        <ItineraryQueue
          title="Changes requested"
          description="The client has asked for revisions."
          items={changesRequested}
          emptyTitle="No change requests"
          emptyDescription="You are all caught up."
        />
        <ItineraryQueue
          title="Recently approved"
          description="Ready to confirm with providers."
          items={recentlyApproved}
          emptyTitle="No approvals yet"
          emptyDescription="Approved journeys will collect here."
        />
      </div>

      <Card>
        <CardHeader
          title="Recent clients"
          description="The newest people on the books."
          action={
            <Link
              href="/admin/clients"
              className="flex items-center gap-1 text-[13px] font-medium text-teal-600 hover:underline"
            >
              All clients
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />
        {recentClients.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No clients yet"
              description="Create the first client to begin the pre-journey process."
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
                    <p className="truncate text-[13px] font-medium text-ink-900">
                      {client.name}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {client.country ?? "Country not recorded"} ·{" "}
                      {formatDateRange(
                        client.tripStartDate,
                        client.tripEndDate,
                      )}
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

type QueueItem = {
  id: string;
  title: string;
  status: Parameters<typeof ItineraryStatusBadge>[0]["status"];
  startDate: Date | null;
  endDate: Date | null;
  updatedAt: Date;
  client: { id: string; name: string };
};

function ItineraryQueue({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  items: QueueItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {title}
            <span className="rounded-full bg-sand-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-500">
              {items.length}
            </span>
          </span>
        }
        description={description}
      />
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-ink-400">
          <span className="block font-medium text-ink-500">{emptyTitle}</span>
          {emptyDescription}
        </p>
      ) : (
        <ul className="divide-y divide-sand-200">
          {items.map((itinerary) => (
            <li key={itinerary.id}>
              <Link
                href={`/admin/itineraries/${itinerary.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-sand-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink-900">
                    {itinerary.title}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {itinerary.client.name} ·{" "}
                    {formatDateRange(itinerary.startDate, itinerary.endDate)} ·
                    updated {formatRelative(itinerary.updatedAt)}
                  </p>
                </div>
                <ItineraryStatusBadge status={itinerary.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
