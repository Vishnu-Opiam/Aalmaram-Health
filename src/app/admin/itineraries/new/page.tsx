import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { Alert, ButtonLink, PageHeader } from "@/components/ui/primitives";
import { toDateInputValue } from "@/domain/shared/dates";
import { NewItineraryForm } from "./new-itinerary-form";

export const metadata: Metadata = { title: "New itinerary" };

/**
 * This page hosts a Server Action form and therefore reads no `searchParams`:
 * a server page whose tree awaits them stalls when Next re-renders it as part
 * of a Server Action response. The `?clientId=` prefill is read inside
 * NewItineraryForm with `useSearchParams()` instead.
 */
export default async function NewItineraryPage() {
  await requireUserPage("/admin/itineraries/new");

  const clients = await prisma.client.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      tripStartDate: true,
      tripEndDate: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Itineraries"
        title="New itinerary"
        description="Start with the client and the trip window. You will add components next."
      />

      {clients.length === 0 ? (
        <div className="space-y-6">
          <Alert tone="warning" title="No clients yet">
            An itinerary always belongs to a client. Create the client and
            record their intake first.
          </Alert>
          <ButtonLink href="/admin/clients/new" size="sm">
            Create a client
          </ButtonLink>
        </div>
      ) : (
        <NewItineraryForm
          clients={clients.map((client) => ({
            id: client.id,
            name: client.name,
            email: client.email,
            tripStartDate: toDateInputValue(client.tripStartDate),
            tripEndDate: toDateInputValue(client.tripEndDate),
          }))}
        />
      )}
    </div>
  );
}
