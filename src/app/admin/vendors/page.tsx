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
import { RecordStatusBadge } from "@/components/admin/status-badges";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { param, pluralise } from "@/lib/utils";

export const metadata: Metadata = { title: "Vendors" };

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUserPage("/admin/vendors");
  const params = await searchParams;
  const q = param(params, "q").trim();
  const status = param(params, "status");

  const where: Prisma.VendorWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status === "ACTIVE" || status === "INACTIVE" ? { status } : {}),
  };

  const vendors = await prisma.vendor.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { components: true } } },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Vendors"
        description="Providers delivering components across one or more modules."
        actions={
          <ButtonLink href="/admin/vendors/new" size="sm">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New vendor
          </ButtonLink>
        }
      />

      <FilterBar
        action="/admin/vendors"
        searchValue={q}
        searchPlaceholder="Vendor name, contact, location…"
        resetHref="/admin/vendors"
        selects={[
          {
            name: "status",
            label: "Status",
            value: status,
            options: [
              { value: "", label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ],
          },
        ]}
      />

      {vendors.length === 0 ? (
        <EmptyState
          title={
            q || status ? "No vendors match those filters" : "No vendors yet"
          }
          description={
            q || status
              ? "Try a broader search, or clear the filters."
              : "Add the first provider so components have somewhere to live."
          }
          action={
            <ButtonLink href="/admin/vendors/new" size="sm">
              New vendor
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Vendor</Th>
                <Th>Location</Th>
                <Th>Contact</Th>
                <Th className="text-right">Components</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <Tr key={vendor.id}>
                  <Td>
                    <Link
                      href={`/admin/vendors/${vendor.id}`}
                      className="font-medium text-ink-900 hover:text-teal-600 hover:underline"
                    >
                      {vendor.name}
                    </Link>
                    {vendor.accreditation && (
                      <p className="text-xs text-ink-400">
                        {vendor.accreditation}
                      </p>
                    )}
                  </Td>
                  <Td className="text-ink-500">{vendor.location ?? "—"}</Td>
                  <Td className="text-ink-500">
                    {vendor.contactName ?? "—"}
                    {vendor.email && (
                      <p className="text-xs text-ink-400">{vendor.email}</p>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {vendor._count.components}
                  </Td>
                  <Td>
                    <RecordStatusBadge status={vendor.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <p className="px-4 py-2.5 text-xs text-ink-400">
            {pluralise(vendors.length, "vendor")}
          </p>
        </Card>
      )}
    </div>
  );
}
