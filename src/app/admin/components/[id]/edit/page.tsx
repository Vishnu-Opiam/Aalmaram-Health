import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { AppLink as Link, PageHeader } from "@/components/ui/primitives";
import { updateComponentAction } from "../../actions";
import { ComponentForm } from "../../component-form";
import { loadComponentFilterOptions } from "@/domain/components/queries";
import { toDateInputValue } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Edit component" };

export default async function EditComponentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/components");
  const { id } = await params;
  const [component, options] = await Promise.all([
    prisma.component.findUnique({
      where: { id },
      include: { practitioners: { select: { practitionerId: true } } },
    }),
    loadComponentFilterOptions(),
  ]);
  if (!component) nextNotFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/admin/components/${component.id}`}
            className="hover:underline"
          >
            {component.name}
          </Link>
        }
        title="Edit component"
      />
      <ComponentForm
        vendors={options.vendors}
        catalogues={options.catalogues}
        practitioners={options.practitioners}
        values={{
          id: component.id,
          vendorId: component.vendorId,
          catalogueId: component.catalogueId,
          name: component.name,
          tags: component.tags,
          price: component.price.toString(),
          currency: component.currency,
          priceUnit: component.priceUnit,
          durationMinutes: String(component.durationMinutes),
          recoveryTimeMinutes: component.recoveryTimeMinutes?.toString() ?? "",
          practitionerIds: component.practitioners.map((p) => p.practitionerId),
          costStatus: component.costStatus,
          clientFacingDescription: component.clientFacingDescription,
          whatsIncluded: component.whatsIncluded ?? "",
          clientDeliverable: component.clientDeliverable ?? "",
          source: component.source ?? "",
          sourceDate: toDateInputValue(component.sourceDate),
          status: component.status,
        }}
        action={updateComponentAction.bind(null, component.id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
