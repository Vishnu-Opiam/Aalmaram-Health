import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/primitives";
import { VendorForm } from "../vendor-form";
import { createVendorAction } from "../actions";

export const metadata: Metadata = { title: "New vendor" };

export default async function NewVendorPage() {
  await requireUserPage("/admin/vendors/new");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Vendors"
        title="New vendor"
        description="Record a provider before adding the components they deliver."
      />
      <VendorForm action={createVendorAction} submitLabel="Create vendor" />
    </div>
  );
}
