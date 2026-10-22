import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import {
  Alert,
  AppLink as Link,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  DescriptionList,
  PageHeader,
} from "@/components/ui/primitives";
import { toggleComponentStatusAction } from "../actions";
import { RecordStatusBadge } from "@/components/admin/status-badges";
import { ActionButton } from "@/components/admin/action-button";
import { formatMoney } from "@/domain/itineraries/pricing";
import { formatShortDate } from "@/domain/shared/dates";
import { PRICE_UNIT_LABELS, formatDuration } from "@/domain/vendors/profile";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Component" };

const COST_STATUS_LABEL = {
  ESTIMATED: "Estimated",
  CONFIRMED: "Confirmed with vendor",
  ON_REQUEST: "On request",
} as const;

export default async function ComponentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/components");
  const { id } = await params;

  const component = await prisma.component.findUnique({
    where: { id },
    include: {
      vendor: true,
      catalogue: { include: { module: true } },
      practitioners: { include: { practitioner: true } },
      _count: { select: { itineraryItems: true } },
    },
  });

  if (!component) nextNotFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/admin/components" className="hover:underline">
            Components
          </Link>
        }
        title={component.name}
        description={`${component.catalogue.module.name} → ${component.catalogue.name}`}
        actions={
          <>
            <ActionButton
              action={toggleComponentStatusAction}
              fields={{ componentId: component.id }}
              pendingLabel="Updating…"
            >
              {component.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </ActionButton>
            <ButtonLink
              href={`/admin/components/${component.id}/edit`}
              size="sm"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </ButtonLink>
          </>
        }
      />

      {component.status === "INACTIVE" && (
        <Alert tone="warning" title="This component is deactivated">
          It cannot be published in a new proposal. Any itinerary already
          referencing it will fail validation until it is reactivated or
          removed.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-teal-600" aria-hidden="true" />
                  What the client sees
                </span>
              }
              description="Exactly this text appears in the proposal and the What-to-Expect report."
            />
            <div className="space-y-5 p-5">
              <section>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
                  Description
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                  {component.clientFacingDescription}
                </p>
              </section>

              <section>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
                  What is included
                </h3>
                {component.whatsIncluded ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                    {component.whatsIncluded}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-ink-400">
                    Not recorded. The report will omit this section.
                  </p>
                )}
              </section>

              <section>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
                  Client deliverable
                </h3>
                {component.clientDeliverable ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                    {component.clientDeliverable}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-ink-400">
                    Not recorded. The report will omit this section.
                  </p>
                )}
              </section>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <DescriptionList
              className="sm:grid-cols-1"
              items={[
                {
                  term: "Status",
                  detail: <RecordStatusBadge status={component.status} />,
                },
                {
                  term: "Vendor",
                  detail: (
                    <Link
                      href={`/admin/vendors/${component.vendor.id}`}
                      className="text-teal-600 hover:underline"
                    >
                      {component.vendor.name}
                    </Link>
                  ),
                },
                {
                  term: "Delivered by",
                  detail: component.practitioners.length
                    ? component.practitioners
                        .map(({ practitioner }) => `${practitioner.name}, ${practitioner.role}`)
                        .join("; ")
                    : "—",
                },
                { term: "Duration", detail: formatDuration(component.durationMinutes) },
                {
                  term: "Recovery time",
                  detail:
                    component.recoveryTimeMinutes !== null
                      ? formatDuration(component.recoveryTimeMinutes)
                      : "—",
                },
                { term: "Module", detail: component.catalogue.module.name },
                { term: "Catalogue", detail: component.catalogue.name },
                {
                  term: "Price",
                  detail: (
                    <span className="tabular-nums">
                      {formatMoney(component.price, component.currency)}{" "}
                      <span className="text-ink-400">{PRICE_UNIT_LABELS[component.priceUnit]}</span>
                    </span>
                  ),
                },
                {
                  term: "Cost status",
                  detail: COST_STATUS_LABEL[component.costStatus],
                },
                { term: "Source", detail: component.source ?? "—" },
                {
                  term: "Source date",
                  detail: component.sourceDate
                    ? formatShortDate(component.sourceDate)
                    : "—",
                },
                {
                  term: "Used in itineraries",
                  detail: String(component._count.itineraryItems),
                },
              ]}
            />
          </Card>

          <Card className="p-5">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
              Tags
            </h3>
            {component.tags.length === 0 ? (
              <p className="mt-2 text-sm text-ink-400">No tags.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {component.tags.map((tag) => (
                  <Link key={tag} href={`/admin/components?q=${tag}`}>
                    <Badge tone="accent">{tag}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
