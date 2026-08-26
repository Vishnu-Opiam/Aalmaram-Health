import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/guards";
import { Alert, ButtonLink, PageHeader } from "@/components/ui/primitives";
import { loadComponentFilterOptions } from "@/domain/components/queries";
import { ComponentForm } from "../component-form";
import { createComponentAction } from "../actions";

export const metadata: Metadata = { title: "New component" };

/**
 * No `searchParams` here - see NewItineraryPage. The `?vendorId=` prefill is
 * read inside ComponentForm with `useSearchParams()`.
 */
export default async function NewComponentPage() {
  await requireUserPage("/admin/components/new");
  const { vendors, catalogues } = await loadComponentFilterOptions();

  if (vendors.length === 0 || catalogues.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader eyebrow="Components" title="New component" />
        <Alert tone="warning" title="Set up the inventory hierarchy first">
          A component needs a vendor and a catalogue.{" "}
          {vendors.length === 0 && "There are no vendors yet. "}
          {catalogues.length === 0 && "There are no catalogues yet."}
        </Alert>
        <div className="flex gap-3">
          {vendors.length === 0 && (
            <ButtonLink href="/admin/vendors/new" size="sm">
              Create a vendor
            </ButtonLink>
          )}
          {catalogues.length === 0 && (
            <ButtonLink
              href="/admin/catalogues/new"
              size="sm"
              variant="secondary"
            >
              Create a catalogue
            </ButtonLink>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Components"
        title="New component"
        description="One diagnostic test, consultation, treatment or experience."
      />
      <ComponentForm
        vendors={vendors}
        catalogues={catalogues}
        action={createComponentAction}
        submitLabel="Create component"
      />
    </div>
  );
}
