import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/primitives";
import { ClientForm } from "../client-form";
import { createClientAction } from "../actions";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireUserPage("/admin/clients/new");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="New client"
        description="Record contact details, the trip window and the intake that drives curation."
      />
      <ClientForm action={createClientAction} submitLabel="Create client" />
    </div>
  );
}
