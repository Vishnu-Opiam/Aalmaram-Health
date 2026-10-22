import type { Metadata } from "next";
import type { Prisma, TripStatus } from "@prisma/client";
import {
  AppLink as Link,
  Card,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { FilterBar } from "@/components/admin/filter-bar";
import { TripStatusBadge } from "@/components/admin/status-badges";
import { formatMoney } from "@/domain/itineraries/pricing";
import { formatDateRange } from "@/domain/shared/dates";
import { itineraryTotal } from "@/domain/trips/blocks";
import { TRIP_STATUS_OPTIONS } from "@/domain/trips/status";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { param, pluralise } from "@/lib/utils";

export const metadata: Metadata = { title: "Trips" };

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUserPage("/admin/trips");
  const params = await searchParams;
  const q = param(params, "q").trim();
  const status = param(params, "status");

  const where: Prisma.TripWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { client: { name: { contains: q, mode: "insensitive" } } },
            { client: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(TRIP_STATUS_OPTIONS.some((o) => o.value === status) ? { status: status as TripStatus } : {}),
  };

  const trips = await prisma.trip.findMany({
    where,
    orderBy: { startDate: "asc" },
    include: {
      client: { select: { id: true, name: true } },
      itinerary: { select: { items: { select: { price: true, currency: true, addedBy: true } } } },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Clients"
        title="Trips"
        description="Every trip, its itinerary and where it stands. Start a trip from the client's page."
      />

      <FilterBar
        action="/admin/trips"
        searchValue={q}
        searchPlaceholder="Trip or client…"
        resetHref="/admin/trips"
        selects={[
          {
            name: "status",
            label: "Status",
            value: status,
            options: [{ value: "", label: "All statuses" }, ...TRIP_STATUS_OPTIONS],
          },
        ]}
      />

      {trips.length === 0 ? (
        <EmptyState
          title={q || status ? "No trips match those filters" : "No trips yet"}
          description="Open a client and create their first trip."
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Trip</Th>
                <Th>Client</Th>
                <Th>Dates</Th>
                <Th className="text-right">Activities</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => {
                const items = trip.itinerary?.items ?? [];
                const { total, currency } = itineraryTotal(items);
                const core = items.filter((i) => i.addedBy === "TEAM").length;
                return (
                  <Tr key={trip.id}>
                    <Td>
                      <Link href={`/admin/trips/${trip.id}`} className="font-medium text-ink-900 hover:text-teal-600 hover:underline">
                        {trip.name}
                      </Link>
                    </Td>
                    <Td>
                      <Link href={`/admin/clients/${trip.client.id}`} className="text-ink-600 hover:underline">
                        {trip.client.name}
                      </Link>
                    </Td>
                    <Td className="text-ink-500">{formatDateRange(trip.startDate, trip.endDate)}</Td>
                    <Td className="text-right tabular-nums">
                      {items.length}
                      <span className="block text-xs text-ink-400">{core} health core</span>
                    </Td>
                    <Td className="text-right tabular-nums">{formatMoney(total, currency)}</Td>
                    <Td>
                      <TripStatusBadge status={trip.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          <p className="px-4 py-2.5 text-xs text-ink-400">{pluralise(trips.length, "trip")}</p>
        </Card>
      )}
    </div>
  );
}
