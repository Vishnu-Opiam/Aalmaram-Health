import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import {
  Alert,
  AppLink as Link,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui/primitives";
import { ResolveButton } from "./resolve-button";
import {
  ChangeRequestStatusBadge,
  ItineraryStatusBadge,
} from "@/components/admin/status-badges";
import { formatLongDate, formatRelative } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Change requests" };

export default async function ChangeRequestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/itineraries");
  const { id } = await params;

  const itinerary = await prisma.itinerary.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, email: true } },
      changeRequests: {
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
          itineraryItem: {
            select: {
              id: true,
              customTitle: true,
              scheduledDate: true,
              component: {
                select: { name: true, vendor: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!itinerary) nextNotFound();

  const basePath = `/admin/itineraries/${itinerary.id}`;
  const open = itinerary.changeRequests.filter((r) => r.status === "OPEN");
  const resolved = itinerary.changeRequests.filter(
    (r) => r.status === "RESOLVED",
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href={basePath} className="hover:underline">
            {itinerary.title}
          </Link>
        }
        title="Change requests"
        description={`What ${itinerary.client.name} has asked to change.`}
        actions={
          <>
            <ItineraryStatusBadge status={itinerary.status} />
            <ButtonLink href={basePath} size="sm">
              Edit itinerary
            </ButtonLink>
          </>
        }
      />

      {open.length > 0 && itinerary.status === "CHANGES_REQUESTED" && (
        <Alert tone="warning" title="How to respond">
          Open the itinerary, move it back to Draft, make the changes the client
          asked for, then publish again. Resolve each request once you have
          acted on it.
        </Alert>
      )}

      <Card>
        <CardHeader
          title={`Open (${open.length})`}
          description="Waiting on the Aalmaram team."
        />
        {open.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No open change requests"
              description="Everything the client has raised has been dealt with."
            />
          </div>
        ) : (
          <ul className="divide-y divide-sand-200">
            {open.map((request) => (
              <li key={request.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-ink-900">
                      {request.itineraryItem
                        ? `About: ${request.itineraryItem.customTitle?.trim() || request.itineraryItem.component.name}`
                        : "General request about the whole trip"}
                    </p>
                    <p className="text-xs text-ink-500">
                      {request.itineraryItem?.component.vendor.name &&
                        `${request.itineraryItem.component.vendor.name} · `}
                      {request.itineraryItem?.scheduledDate &&
                        `${formatLongDate(request.itineraryItem.scheduledDate)} · `}
                      Received {formatRelative(request.createdAt)}
                    </p>
                  </div>
                  <ChangeRequestStatusBadge status={request.status} />
                </div>

                <blockquote className="rounded-md border-l-2 border-brass-300 bg-sand-50 px-4 py-3 text-sm leading-relaxed text-ink-700">
                  {request.message}
                </blockquote>

                <ResolveButton changeRequestId={request.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {resolved.length > 0 && (
        <Card>
          <CardHeader
            title={`Resolved (${resolved.length})`}
            description="Kept for the record."
          />
          <ul className="divide-y divide-sand-200">
            {resolved.map((request) => (
              <li key={request.id} className="space-y-2 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-[13px] font-medium text-ink-700">
                    {request.itineraryItem
                      ? `About: ${request.itineraryItem.customTitle?.trim() || request.itineraryItem.component.name}`
                      : "General request about the whole trip"}
                  </p>
                  <ChangeRequestStatusBadge status={request.status} />
                </div>
                <p className="text-sm leading-relaxed text-ink-500">
                  {request.message}
                </p>
                <p className="text-xs text-ink-400">
                  Raised {formatRelative(request.createdAt)}
                  {request.resolvedAt &&
                    ` · resolved ${formatRelative(request.resolvedAt)}`}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
