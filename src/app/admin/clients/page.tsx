import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import {
  AppLink as Link,
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
import {
  CLIENT_STATUS_OPTIONS,
  ClientStatusBadge,
} from "@/components/admin/status-badges";
import { formatDateRange } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { param, pluralise } from "@/lib/utils";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUserPage("/admin/clients");
  const params = await searchParams;
  const q = param(params, "q").trim();
  const status = param(params, "status");

  const where: Prisma.ClientWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(CLIENT_STATUS_OPTIONS.some((option) => option.value === status)
      ? { status: status as Prisma.ClientWhereInput["status"] }
      : {}),
  };

  const clients = await prisma.client.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      relationshipManager: { select: { name: true } },
      trips: { orderBy: { startDate: "asc" }, select: { startDate: true, endDate: true }, take: 1 },
      _count: { select: { trips: true } },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Clients"
        title="Clients"
        description="People travelling to Kerala with Aalmaram."
        actions={
          <ButtonLink href="/admin/clients/new" size="sm">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New client
          </ButtonLink>
        }
      />

      <FilterBar
        action="/admin/clients"
        searchValue={q}
        searchPlaceholder="Name, email or country…"
        resetHref="/admin/clients"
        selects={[
          {
            name: "status",
            label: "Status",
            value: status,
            options: [
              { value: "", label: "All statuses" },
              ...CLIENT_STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ],
          },
        ]}
      />

      {clients.length === 0 ? (
        <EmptyState
          title={
            q || status ? "No clients match those filters" : "No clients yet"
          }
          description="Everything starts with a client record, then their trips."
          action={
            <ButtonLink href="/admin/clients/new" size="sm">
              Create the first client
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Country</Th>
                <Th>Relationship manager</Th>
                <Th>Next trip</Th>
                <Th className="text-right">Trips</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <Tr key={client.id}>
                  <Td>
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="font-medium text-ink-900 hover:text-teal-600 hover:underline"
                    >
                      {client.name}
                    </Link>
                    <p className="text-xs text-ink-400">{client.email}</p>
                  </Td>
                  <Td className="text-ink-500">{client.country ?? "—"}</Td>
                  <Td className="text-ink-500">{client.relationshipManager?.name ?? "—"}</Td>
                  <Td className="text-ink-500">
                    {client.trips[0]
                      ? formatDateRange(client.trips[0].startDate, client.trips[0].endDate)
                      : "—"}
                  </Td>
                  <Td className="text-right tabular-nums">{client._count.trips}</Td>
                  <Td>
                    <ClientStatusBadge status={client.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <p className="px-4 py-2.5 text-xs text-ink-400">
            {pluralise(clients.length, "client")}
          </p>
        </Card>
      )}
    </div>
  );
}
