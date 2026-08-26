import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/primitives";
import { CatalogueForm } from "../catalogue-form";
import { createCatalogueAction } from "../actions";

export const metadata: Metadata = { title: "New catalogue" };

/**
 * No `searchParams` here - see NewItineraryPage. The `?moduleId=` prefill is
 * read inside CatalogueForm with `useSearchParams()`.
 */
export default async function NewCataloguePage() {
  await requireUserPage("/admin/catalogues/new");

  const modules = await prisma.module.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, status: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Catalogues" title="New catalogue" />
      <CatalogueForm
        modules={modules}
        action={createCatalogueAction}
        submitLabel="Create catalogue"
      />
    </div>
  );
}
