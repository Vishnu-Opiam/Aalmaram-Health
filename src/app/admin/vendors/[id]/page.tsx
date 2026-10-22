import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import {
  Alert,
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
import { saveBranchAction, savePractitionerAction } from "../profile-actions";
import { BranchForm, PractitionerForm } from "../profile-forms";
import { RecordStatusBadge } from "@/components/admin/status-badges";
import { ActionButton } from "@/components/admin/action-button";
import { formatMoney } from "@/domain/itineraries/pricing";
import {
  PRICE_UNIT_LABELS,
  formatDuration,
  missingProfileFields,
} from "@/domain/vendors/profile";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Vendor" };

const list = (values: string[]) => (values.length ? values.join(", ") : "—");

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
      branches: { orderBy: [{ status: "asc" }, { city: "asc" }, { name: "asc" }] },
      practitioners: {
        orderBy: [{ status: "asc" }, { name: "asc" }],
        include: { _count: { select: { components: true } } },
      },
      components: {
        orderBy: { name: "asc" },
        include: {
          catalogue: { include: { module: { select: { name: true } } } },
        },
      },
    },
  });

  if (!vendor) nextNotFound();

  const missing = missingProfileFields(vendor);
  const hqAddress = [vendor.hqLine, vendor.hqCity, vendor.hqPostcode, vendor.hqCountry]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/admin/vendors" className="hover:underline">
            Vendors
          </Link>
        }
        title={vendor.name}
        description={vendor.hqCity ?? undefined}
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
              Edit profile
            </ButtonLink>
          </>
        }
      />

      {missing.length > 0 && (
        <Alert tone="warning" title={`${missing.length} profile field${missing.length === 1 ? "" : "s"} still empty`}>
          {missing.join(" · ")}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-900">About this provider</h2>
          {vendor.description ? (
            <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
              {vendor.description}
            </p>
          ) : null}
          <DescriptionList
            items={[
              { term: "Status", detail: <RecordStatusBadge status={vendor.status} /> },
              { term: "Established", detail: vendor.yearEstablished ?? "—" },
              { term: "Staff", detail: vendor.staffCount ?? "—" },
              { term: "Owners", detail: list(vendor.owners) },
              { term: "Languages", detail: list(vendor.languages) },
              { term: "Accreditations", detail: list(vendor.accreditations) },
              { term: "Equipment", detail: list(vendor.equipment) },
              {
                term: "Website",
                detail: vendor.website ? (
                  <a href={vendor.website} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline">
                    {vendor.website}
                  </a>
                ) : (
                  "—"
                ),
              },
              { term: "Socials", detail: list(vendor.socialLinks) },
            ]}
          />
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-ink-900">Contact and HQ</h2>
          <p className="mb-4 text-xs text-ink-500">Internal — never shown to clients.</p>
          <DescriptionList
            items={[
              { term: "Point of contact", detail: vendor.contactName ?? "—" },
              { term: "Email", detail: vendor.email ?? "—" },
              { term: "Phone", detail: vendor.phone ?? "—" },
              { term: "HQ address", detail: hqAddress || "—" },
            ]}
          />
          {vendor.notes && (
            <div className="mt-5 rounded-md bg-sand-50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
                Internal notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{vendor.notes}</p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title={`Branches (${vendor.branches.length})`}
          description="Where the client goes. The client picks the branch nearest to where they stay."
        />
        <ul className="divide-y divide-sand-200">
          {vendor.branches.map((branch) => (
            <li key={branch.id}>
              <details className="group px-5 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span>
                    <span className="text-sm font-medium text-ink-900">{branch.name}</span>
                    <span className="block text-xs text-ink-500">
                      {[branch.addressLine, branch.city, branch.postcode].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <RecordStatusBadge status={branch.status} />
                    <span className="text-xs text-teal-600 group-open:hidden">Edit</span>
                  </span>
                </summary>
                <div className="mt-4">
                  <BranchForm
                    vendorId={vendor.id}
                    branch={branch}
                    action={saveBranchAction.bind(null, branch.id)}
                  />
                </div>
              </details>
            </li>
          ))}
          <li>
            <details className="px-5 py-3" open={vendor.branches.length === 0}>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-teal-600">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a branch
              </summary>
              <div className="mt-4">
                <BranchForm vendorId={vendor.id} action={saveBranchAction.bind(null, null)} />
              </div>
            </details>
          </li>
        </ul>
      </Card>

      <Card>
        <CardHeader
          title={`Practitioners (${vendor.practitioners.length})`}
          description="Doctors, therapists, instructors, guides and performers. Linked to components on the component form."
        />
        <ul className="divide-y divide-sand-200">
          {vendor.practitioners.map((practitioner) => (
            <li key={practitioner.id}>
              <details className="group px-5 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span>
                    <span className="text-sm font-medium text-ink-900">{practitioner.name}</span>
                    <span className="block text-xs text-ink-500">
                      {practitioner.role}
                      {practitioner.yearsOfExperience !== null &&
                        ` · ${practitioner.yearsOfExperience} years`}
                      {` · ${practitioner._count.components} component${practitioner._count.components === 1 ? "" : "s"}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <RecordStatusBadge status={practitioner.status} />
                    <span className="text-xs text-teal-600 group-open:hidden">Edit</span>
                  </span>
                </summary>
                <div className="mt-4">
                  <PractitionerForm
                    vendorId={vendor.id}
                    practitioner={practitioner}
                    action={savePractitionerAction.bind(null, practitioner.id)}
                  />
                </div>
              </details>
            </li>
          ))}
          <li>
            <details className="px-5 py-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-teal-600">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a practitioner
              </summary>
              <div className="mt-4">
                <PractitionerForm vendorId={vendor.id} action={savePractitionerAction.bind(null, null)} />
              </div>
            </details>
          </li>
        </ul>
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
              description="Add the services this vendor provides so they can be placed in itineraries."
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
                <Th>Duration</Th>
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
                  <Td className="text-ink-500">{component.catalogue.module.name}</Td>
                  <Td className="text-ink-500">{component.catalogue.name}</Td>
                  <Td className="text-ink-500">{formatDuration(component.durationMinutes)}</Td>
                  <Td className="text-right tabular-nums">
                    {formatMoney(component.price, component.currency)}
                    <span className="block text-xs text-ink-400">
                      {PRICE_UNIT_LABELS[component.priceUnit]}
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
