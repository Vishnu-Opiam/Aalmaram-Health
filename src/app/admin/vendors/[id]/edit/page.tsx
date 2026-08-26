import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { AppLink as Link, PageHeader } from "@/components/ui/primitives";
import { updateVendorAction } from "../../actions";
import { VendorForm } from "../../vendor-form";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Edit vendor" };

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/vendors");
  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) nextNotFound();

  const action = updateVendorAction.bind(null, vendor.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/admin/vendors/${vendor.id}`}
            className="hover:underline"
          >
            {vendor.name}
          </Link>
        }
        title="Edit vendor"
      />
      <VendorForm vendor={vendor} action={action} submitLabel="Save changes" />
    </div>
  );
}
