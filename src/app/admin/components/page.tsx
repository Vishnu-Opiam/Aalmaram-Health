import type { Metadata } from "next";
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
import { RecordStatusBadge } from "@/components/admin/status-badges";
import {
  COMPONENT_SORTS,
  loadComponentFilterOptions,
  searchComponents,
} from "@/domain/components/queries";
import { formatMoney } from "@/domain/itineraries/pricing";
import { requireUserPage } from "@/lib/auth/guards";
import { param, pluralise } from "@/lib/utils";

export const metadata: Metadata = { title: "Components" };

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUserPage("/admin/components");
  const params = await searchParams;

  const filters = {
    q: param(params, "q"),
    moduleId: param(params, "moduleId"),
    catalogueId: param(params, "catalogueId"),
    vendorId: param(params, "vendorId"),
    status: param(params, "status"),
    sort: param(params, "sort") || "name_asc",
  };

  const [{ modules, catalogues, vendors }, components] = await Promise.all([
    loadComponentFilterOptions(),
    searchComponents(filters),
  ]);

  const visibleCatalogues = filters.moduleId
    ? catalogues.filter((c) => c.moduleId === filters.moduleId)
    : catalogues;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Components"
        description="The granular sellable units curated into client itineraries."
        actions={
          <ButtonLink href="/admin/components/new" size="sm">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New component
          </ButtonLink>
        }
      />

      <FilterBar
        action="/admin/components"
        searchValue={filters.q}
        searchPlaceholder="Name, description or tag…"
        resetHref="/admin/components"
        selects={[
          {
            name: "moduleId",
            label: "Module",
            value: filters.moduleId,
            options: [
              { value: "", label: "All modules" },
              ...modules.map((m) => ({ value: m.id, label: m.name })),
            ],
          },
          {
            name: "catalogueId",
            label: "Catalogue",
            value: filters.catalogueId,
            options: [
              { value: "", label: "All catalogues" },
              ...visibleCatalogues.map((c) => ({
                value: c.id,
                label: `${c.moduleName} → ${c.name}`,
              })),
            ],
          },
          {
            name: "vendorId",
            label: "Vendor",
            value: filters.vendorId,
            options: [
              { value: "", label: "All vendors" },
              ...vendors.map((v) => ({ value: v.id, label: v.name })),
            ],
          },
          {
            name: "status",
            label: "Status",
            value: filters.status,
            options: [
              { value: "", label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ],
          },
          {
            name: "sort",
            label: "Sort",
            value: filters.sort,
            options: Object.entries(COMPONENT_SORTS).map(([value, config]) => ({
              value,
              label: config.label,
            })),
          },
        ]}
      />

      {components.length === 0 ? (
        <EmptyState
          title="No components match those filters"
          description="Components are what an admin curates into an itinerary. Add one, or widen the filters."
          action={
            <ButtonLink href="/admin/components/new" size="sm">
              New component
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Component</Th>
                <Th>Module / Catalogue</Th>
                <Th>Vendor</Th>
                <Th className="text-right">Price</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {components.map((component) => (
                <Tr key={component.id}>
                  <Td className="max-w-sm">
                    <Link
                      href={`/admin/components/${component.id}`}
                      className="font-medium text-ink-900 hover:text-teal-600 hover:underline"
                    >
                      {component.name}
                    </Link>
                    {component.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {component.tags.slice(0, 4).map((tag) => (
                          <Link key={tag} href={`/admin/components?q=${tag}`}>
                            <Badge>{tag}</Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td className="text-ink-500">
                    <p>{component.catalogue.module.name}</p>
                    <p className="text-xs text-ink-400">
                      {component.catalogue.name}
                    </p>
                  </Td>
                  <Td className="text-ink-500">
                    <Link
                      href={`/admin/vendors/${component.vendor.id}`}
                      className="hover:text-teal-600 hover:underline"
                    >
                      {component.vendor.name}
                    </Link>
                  </Td>
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
          <p className="px-4 py-2.5 text-xs text-ink-400">
            {pluralise(components.length, "component")}
          </p>
        </Card>
      )}
    </div>
  );
}
