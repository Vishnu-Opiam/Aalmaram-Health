import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/primitives";
import { ModuleForm } from "../../module-form";
import { updateModuleAction } from "../../actions";

export const metadata: Metadata = { title: "Edit module" };

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/modules");
  const { id } = await params;
  const record = await prisma.module.findUnique({ where: { id } });
  if (!record) nextNotFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Modules" title={`Edit ${record.name}`} />
      <ModuleForm
        module={record}
        action={updateModuleAction.bind(null, record.id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
