import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Pencil, Plus } from "lucide-react";
import {
  AppLink as Link,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
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

export const metadata: Metadata = { title: "Catalogues" };

/**
 * Filtering is server-side via searchParams so catalogue views stay linkable
 * (the Modules screen links straight to /admin/catalogues?moduleId=...).
 *
 * Because of that this page hosts no Server Action forms: a page that awaits
 * searchParams blocks when Next re-renders it in place for a non-redirecting
 * action. Activating and deactivating is done on the Edit form, which already
 * carries the Status field.
 */
export default async function CataloguesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUserPage("/admin/catalogues");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Catalogues"
        description="Sub-groupings within a module, for example Diagnostics under Health &amp; Medical."
        actions={
          <ButtonLink href="/admin/catalogues/new" size="sm">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New catalogue
          </ButtonLink>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <CatalogueList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CatalogueList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = param(params, "q").trim();
  const moduleId = param(params, "moduleId");
  const status = param(params, "status");

  const where: Prisma.CatalogueWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(moduleId ? { moduleId } : {}),
    ...(status === "ACTIVE" || status === "INACTIVE" ? { status } : {}),
  };

  const [modules, catalogues] = await Promise.all([
    prisma.module.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.catalogue.findMany({
      where,
      orderBy: [
        { module: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
      include: {
        module: { select: { id: true, name: true } },
        _count: { select: { components: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-5">
      <FilterBar
        action="/admin/catalogues"
        searchValue={q}
        searchPlaceholder="Catalogue name…"
        resetHref="/admin/catalogues"
        selects={[
          {
            name: "moduleId",
            label: "Module",
            value: moduleId,
            options: [
              { value: "", label: "All modules" },
              ...modules.map((m) => ({ value: m.id, label: m.name })),
            ],
          },
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

      {catalogues.length === 0 ? (
        <EmptyState
          title={
            q || moduleId || status
              ? "No catalogues match those filters"
              : "No catalogues yet"
          }
          description="A catalogue groups related components inside a module."
          action={
            <ButtonLink href="/admin/catalogues/new" size="sm">
              New catalogue
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Catalogue</Th>
                <Th>Module</Th>
                <Th className="text-right">Components</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {catalogues.map((catalogue) => (
                <Tr key={catalogue.id}>
                  <Td>
                    <p className="font-medium text-ink-900">{catalogue.name}</p>
                    {catalogue.description && (
                      <p className="max-w-md text-xs text-ink-400">
                        {catalogue.description}
                      </p>
                    )}
                  </Td>
                  <Td className="text-ink-500">{catalogue.module.name}</Td>
                  <Td className="text-right tabular-nums">
                    <Link
                      href={`/admin/components?catalogueId=${catalogue.id}`}
                      className="hover:text-teal-600 hover:underline"
                    >
                      {catalogue._count.components}
                    </Link>
                  </Td>
                  <Td>
                    <RecordStatusBadge status={catalogue.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end">
                      <Link
                        href={`/admin/catalogues/${catalogue.id}/edit`}
                        className="flex items-center gap-1 text-[13px] font-medium text-teal-600 hover:underline"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        {catalogue.status === "ACTIVE"
                          ? "Edit or deactivate"
                          : "Edit or activate"}
                      </Link>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <p className="px-4 py-2.5 text-xs text-ink-400">
            {pluralise(catalogues.length, "catalogue")}
          </p>
        </Card>
      )}
    </div>
  );
}
