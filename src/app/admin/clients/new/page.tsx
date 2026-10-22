import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/primitives";
import { ClientForm } from "../client-form";
import { createClientAction } from "../actions";
import { loadStaffOptions } from "@/lib/services/staff";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireUserPage("/admin/clients/new");
  const staff = await loadStaffOptions();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="New client"
        description="Record who they are. Trips, requirements and conversations are added on the client's page."
      />
      <ClientForm staff={staff} action={createClientAction} submitLabel="Create client" />
    </div>
  );
}
