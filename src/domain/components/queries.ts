import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Shared component search.
 *
 * Used by the Components admin screen AND by the itinerary builder's component
 * library, so the two never drift apart in behaviour.
 */
export type ComponentFilters = {
  q?: string;
  moduleId?: string;
  catalogueId?: string;
  vendorId?: string;
  tag?: string;
  status?: string;
  sort?: string;
};

export const COMPONENT_SORTS = {
  name_asc: { label: "Name (A–Z)", orderBy: { name: "asc" } },
  name_desc: { label: "Name (Z–A)", orderBy: { name: "desc" } },
  price_asc: { label: "Price (low to high)", orderBy: { price: "asc" } },
  price_desc: { label: "Price (high to low)", orderBy: { price: "desc" } },
  newest: { label: "Recently added", orderBy: { createdAt: "desc" } },
} as const satisfies Record<
  string,
  { label: string; orderBy: Prisma.ComponentOrderByWithRelationInput }
>;

export type ComponentSortKey = keyof typeof COMPONENT_SORTS;

export function componentWhere(
  filters: ComponentFilters,
): Prisma.ComponentWhereInput {
  const q = filters.q?.trim();
  const tag = filters.tag?.trim().toLowerCase();

  return {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { clientFacingDescription: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
          ],
        }
      : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
    ...(filters.catalogueId ? { catalogueId: filters.catalogueId } : {}),
    ...(filters.moduleId ? { catalogue: { moduleId: filters.moduleId } } : {}),
    ...(filters.status === "ACTIVE" || filters.status === "INACTIVE"
      ? { status: filters.status }
      : {}),
  };
}

export function componentOrderBy(
  sort: string | undefined,
): Prisma.ComponentOrderByWithRelationInput {
  const key = (sort ?? "name_asc") as ComponentSortKey;
  return (COMPONENT_SORTS[key] ?? COMPONENT_SORTS.name_asc).orderBy;
}

export const componentListInclude = {
  vendor: { select: { id: true, name: true, location: true, status: true } },
  catalogue: {
    select: {
      id: true,
      name: true,
      module: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ComponentInclude;

export type ComponentListRow = Prisma.ComponentGetPayload<{
  include: typeof componentListInclude;
}>;

export async function searchComponents(
  filters: ComponentFilters,
  take?: number,
): Promise<ComponentListRow[]> {
  return prisma.component.findMany({
    where: componentWhere(filters),
    orderBy: componentOrderBy(filters.sort),
    include: componentListInclude,
    ...(take ? { take } : {}),
  });
}

/** Filter dropdown data, fetched in one round trip. */
export async function loadComponentFilterOptions() {
  const [modules, catalogues, vendors] = await Promise.all([
    prisma.module.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, status: true },
    }),
    prisma.catalogue.findMany({
      orderBy: [{ module: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        status: true,
        moduleId: true,
        module: { select: { name: true } },
      },
    }),
    prisma.vendor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
  ]);

  return {
    modules,
    vendors,
    catalogues: catalogues.map((catalogue) => ({
      id: catalogue.id,
      name: catalogue.name,
      status: catalogue.status,
      moduleId: catalogue.moduleId,
      moduleName: catalogue.module.name,
    })),
  };
}
