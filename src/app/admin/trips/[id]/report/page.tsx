import type { Metadata } from "next";
import { notFound as nextNotFound } from "next/navigation";
import {
  Alert,
  AppLink as Link,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui/primitives";
import { ActionButton } from "@/components/admin/action-button";
import { ReportStatusBadge } from "@/components/admin/status-badges";
import { formatShortDate } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { generateReportAction, saveReportAction } from "../../actions";
import { ReportEditor } from "../../forms";

export const metadata: Metadata = { title: "What-to-Expect report" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserPage("/admin/trips");
  const { id } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      client: { select: { name: true } },
      itinerary: { include: { report: true, _count: { select: { items: true } } } },
    },
  });
  if (!trip?.itinerary) nextNotFound();
  const { report, _count } = trip.itinerary;

  const generate = (
    <ActionButton
      action={generateReportAction}
      fields={{ tripId: trip.id }}
      pendingLabel="Generating…"
      variant={report ? "secondary" : "primary"}
      confirm={report ? "Regenerating rebuilds the report from the itinerary and discards your edits. Continue?" : undefined}
    >
      {report ? "Regenerate from itinerary" : "Generate report"}
    </ActionButton>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/admin/trips/${trip.id}`} className="hover:underline">
            {trip.name}
          </Link>
        }
        title="What-to-Expect report"
        description={`Prepared for ${trip.client.name}. Generated from the itinerary, then edited by you.`}
        actions={
          <>
            {report && <ReportStatusBadge status={report.status} />}
            {_count.items > 0 && generate}
          </>
        }
      />

      <Alert tone="info">
        The generated report uses only what is stored in the system — component descriptions, what is included,
        deliverables, provider names, locations and times. It contains no medical claims or advice, and you should not
        add any.
      </Alert>

      {!report ? (
        <Card className="p-5">
          <EmptyState
            title={_count.items === 0 ? "Add activities first" : "No report yet"}
            description={
              _count.items === 0
                ? "The report is generated from the itinerary."
                : `Generate a first draft from the ${_count.items} activities on this itinerary, then edit it before sharing.`
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Edit"
              description={
                report.publishedAt
                  ? `Shared with the client ${formatShortDate(report.publishedAt)}.`
                  : "Draft — the client cannot see it yet."
              }
            />
            <div className="p-5">
              <ReportEditor
                action={saveReportAction}
                tripId={trip.id}
                initial={{ title: report.title, content: report.content }}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Preview" description="As the client will read it." />
            <article
              className="prose-report px-6 py-6"
              // Server-side renderer escapes all HTML before applying a fixed tag whitelist.
              dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content, 2) }}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
