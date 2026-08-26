import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/primitives";
import { ModuleForm } from "../module-form";
import { createModuleAction } from "../actions";

export const metadata: Metadata = { title: "New module" };

export default async function NewModulePage() {
  await requireUserPage("/admin/modules/new");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Modules" title="New module" />
      <ModuleForm action={createModuleAction} submitLabel="Create module" />
    </div>
  );
}
