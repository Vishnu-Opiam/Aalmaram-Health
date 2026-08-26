import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/primitives";
import { CatalogueForm } from "../../catalogue-form";
import { updateCatalogueAction } from "../../actions";

export const metadata: Metadata = { title: "Edit catalogue" };

export default async function EditCataloguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/catalogues");
  const { id } = await params;
  const [catalogue, modules] = await Promise.all([
    prisma.catalogue.findUnique({ where: { id } }),
    prisma.module.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, status: true },
    }),
  ]);
  if (!catalogue) nextNotFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Catalogues" title={`Edit ${catalogue.name}`} />
      <CatalogueForm
        catalogue={catalogue}
        modules={modules}
        action={updateCatalogueAction.bind(null, catalogue.id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
