import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import {
  AppLink as Link,
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { FilterBar } from "@/components/admin/filter-bar";
import { ItineraryStatusBadge } from "@/components/admin/status-badges";
import { humanStatus } from "@/domain/itineraries/status";
import { formatDateRange, formatRelative } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { param, pluralise } from "@/lib/utils";

export const metadata: Metadata = { title: "Itineraries" };

const STATUSES = [
  "DRAFT",
  "READY_FOR_REVIEW",
  "PUBLISHED",
  "CHANGES_REQUESTED",
  "APPROVED",
  "ARCHIVED",
] as const;

export default async function ItinerariesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUserPage("/admin/itineraries");
  const params = await searchParams;
  const q = param(params, "q").trim();
  const status = param(params, "status");

  const where: Prisma.ItineraryWhereInput = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { client: { name: { contains: q, mode: "insensitive" } } },
            { client: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(STATUSES.includes(status as (typeof STATUSES)[number])
      ? { status: status as (typeof STATUSES)[number] }
      : {}),
  };

  const itineraries = await prisma.itinerary.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { items: true } },
      changeRequests: { where: { status: "OPEN" }, select: { id: true } },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Pre-journey"
        title="Itineraries"
        description="Every proposal, from first draft to client approval."
        actions={
          <ButtonLink href="/admin/itineraries/new" size="sm">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New itinerary
          </ButtonLink>
        }
      />

      <FilterBar
        action="/admin/itineraries"
        searchValue={q}
        searchPlaceholder="Itinerary title or client…"
        resetHref="/admin/itineraries"
        selects={[
          {
            name: "status",
            label: "Status",
            value: status,
            options: [
              { value: "", label: "All statuses" },
              ...STATUSES.map((value) => ({
                value,
                label: humanStatus(value),
              })),
            ],
          },
        ]}
      />

      {itineraries.length === 0 ? (
        <EmptyState
          title={
            q || status
              ? "No itineraries match those filters"
              : "No itineraries yet"
          }
          description="An itinerary is a curated set of components proposed to one client."
          action={
            <ButtonLink href="/admin/itineraries/new" size="sm">
              Start an itinerary
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Itinerary</Th>
                <Th>Client</Th>
                <Th>Dates</Th>
                <Th className="text-right">Items</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {itineraries.map((itinerary) => (
                <Tr key={itinerary.id}>
                  <Td>
                    <Link
                      href={`/admin/itineraries/${itinerary.id}`}
                      className="font-medium text-ink-900 hover:text-teal-600 hover:underline"
                    >
                      {itinerary.title}
                    </Link>
                    {itinerary.changeRequests.length > 0 && (
                      <Badge tone="warning" className="ml-2">
                        {itinerary.changeRequests.length} open request
                        {itinerary.changeRequests.length === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-ink-500">
                    <Link
                      href={`/admin/clients/${itinerary.client.id}`}
                      className="hover:text-teal-600 hover:underline"
                    >
                      {itinerary.client.name}
                    </Link>
                  </Td>
                  <Td className="text-ink-500">
                    {formatDateRange(itinerary.startDate, itinerary.endDate)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {itinerary._count.items}
                  </Td>
                  <Td>
                    <ItineraryStatusBadge status={itinerary.status} />
                  </Td>
                  <Td className="text-xs text-ink-400">
                    {formatRelative(itinerary.updatedAt)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <p className="px-4 py-2.5 text-xs text-ink-400">
            {pluralise(itineraries.length, "itinerary", "itineraries")}
          </p>
        </Card>
      )}
    </div>
  );
}
