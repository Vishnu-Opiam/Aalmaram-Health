import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  AppLink as Link,
  ButtonLink,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { toggleVendorStatusAction } from "../actions";
import { RecordStatusBadge } from "@/components/admin/status-badges";
import { ActionButton } from "@/components/admin/action-button";
import { formatMoney } from "@/domain/itineraries/pricing";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Vendor" };

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/vendors");
  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      components: {
        orderBy: { name: "asc" },
        include: {
          catalogue: { include: { module: { select: { name: true } } } },
        },
      },
    },
  });

  if (!vendor) nextNotFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/admin/vendors" className="hover:underline">
            Vendors
          </Link>
        }
        title={vendor.name}
        description={vendor.location ?? undefined}
        actions={
          <>
            <ActionButton
              action={toggleVendorStatusAction}
              fields={{ vendorId: vendor.id }}
              pendingLabel="Updating…"
            >
              {vendor.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </ActionButton>
            <ButtonLink href={`/admin/vendors/${vendor.id}/edit`} size="sm">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </ButtonLink>
          </>
        }
      />

      <Card className="p-5">
        <DescriptionList
          items={[
            {
              term: "Status",
              detail: <RecordStatusBadge status={vendor.status} />,
            },
            { term: "Contact", detail: vendor.contactName ?? "—" },
            { term: "Email", detail: vendor.email ?? "—" },
            { term: "Phone", detail: vendor.phone ?? "—" },
            { term: "Location", detail: vendor.location ?? "—" },
            { term: "Accreditation", detail: vendor.accreditation ?? "—" },
          ]}
        />
        {vendor.notes && (
          <div className="mt-5 rounded-md bg-sand-50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
              Internal notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
              {vendor.notes}
            </p>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Components from this vendor"
          description="Everything this provider can deliver."
          action={
            <ButtonLink
              href={`/admin/components/new?vendorId=${vendor.id}`}
              variant="secondary"
              size="sm"
            >
              Add component
            </ButtonLink>
          }
        />
        {vendor.components.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No components yet"
              description="Add the services this vendor provides so they can be curated into itineraries."
              action={
                <ButtonLink
                  href={`/admin/components/new?vendorId=${vendor.id}`}
                  size="sm"
                >
                  Add component
                </ButtonLink>
              }
            />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Component</Th>
                <Th>Module</Th>
                <Th>Catalogue</Th>
                <Th className="text-right">Price</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {vendor.components.map((component) => (
                <Tr key={component.id}>
                  <Td>
                    <Link
                      href={`/admin/components/${component.id}`}
                      className="font-medium text-ink-900 hover:text-teal-600 hover:underline"
                    >
                      {component.name}
                    </Link>
                  </Td>
                  <Td className="text-ink-500">
                    {component.catalogue.module.name}
                  </Td>
                  <Td className="text-ink-500">{component.catalogue.name}</Td>
                  <Td className="text-right tabular-nums">
                    {formatMoney(component.price, component.currency)}
                    <span className="block text-xs text-ink-400">
                      {component.unit}
                    </span>
                  </Td>
                  <Td>
                    <RecordStatusBadge status={component.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
