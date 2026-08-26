import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { AppLink as Link, PageHeader } from "@/components/ui/primitives";
import { updateClientAction } from "../../actions";
import { ClientForm } from "../../client-form";
import { toDateInputValue } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/clients");
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) nextNotFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/admin/clients/${client.id}`}
            className="hover:underline"
          >
            {client.name}
          </Link>
        }
        title="Edit client"
      />
      <ClientForm
        values={{
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone ?? "",
          country: client.country ?? "",
          status: client.status,
          tripStartDate: toDateInputValue(client.tripStartDate),
          tripEndDate: toDateInputValue(client.tripEndDate),
          healthInterests: client.healthInterests ?? "",
          wellnessInterests: client.wellnessInterests ?? "",
          culturalInterests: client.culturalInterests ?? "",
          intakeNotes: client.intakeNotes ?? "",
          generalPreferences: client.generalPreferences ?? "",
        }}
        action={updateClientAction.bind(null, client.id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
