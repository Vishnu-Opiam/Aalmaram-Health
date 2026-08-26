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
import { GenerateReportButton } from "./generate-report-button";
import { ReportEditor } from "./report-editor";
import { ReportStatusBadge } from "@/components/admin/status-badges";
import { isEditable } from "@/domain/itineraries/status";
import { formatShortDate } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";

export const metadata: Metadata = { title: "What-to-Expect report" };

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserPage("/admin/itineraries");
  const { id } = await params;

  const itinerary = await prisma.itinerary.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      report: true,
      _count: { select: { items: true } },
    },
  });
  if (!itinerary) nextNotFound();

  const editable = isEditable(itinerary.status);
  const basePath = `/admin/itineraries/${itinerary.id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={basePath} className="hover:underline">
            {itinerary.title}
          </Link>
        }
        title="What-to-Expect report"
        description={`Prepared for ${itinerary.client.name}. Generated from the itinerary, then edited by you.`}
        actions={
          <>
            {itinerary.report && (
              <ReportStatusBadge status={itinerary.report.status} />
            )}
            {editable && (
              <GenerateReportButton
                itineraryId={itinerary.id}
                hasReport={Boolean(itinerary.report)}
              />
            )}
          </>
        }
      />

      <Alert tone="info">
        The generated report uses only what is stored in the system - component
        descriptions, what is included, deliverables, vendor names and dates. It
        contains no medical claims or advice, and you should not add any.
      </Alert>

      {!itinerary.report ? (
        <Card className="p-5">
          {itinerary._count.items === 0 ? (
            <EmptyState
              title="Add components first"
              description="The report is generated from the itinerary. Add at least one component, then generate."
            />
          ) : (
            <EmptyState
              title="No report yet"
              description={`Generate a first draft from the ${itinerary._count.items} item${itinerary._count.items === 1 ? "" : "s"} on this itinerary, then edit it before publishing.`}
              action={
                editable ? (
                  <GenerateReportButton
                    itineraryId={itinerary.id}
                    hasReport={false}
                  />
                ) : undefined
              }
            />
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader
            title={itinerary.report.title}
            description={
              <>
                {itinerary.report.generatedAt &&
                  `Generated ${formatShortDate(itinerary.report.generatedAt)}. `}
                {itinerary.report.publishedAt
                  ? `Published ${formatShortDate(itinerary.report.publishedAt)}.`
                  : "Not yet published - it goes live when you publish the proposal."}
              </>
            }
          />
          <ReportEditor
            itineraryId={itinerary.id}
            title={itinerary.report.title}
            content={itinerary.report.content}
            previewHtml={renderMarkdown(itinerary.report.content, 2)}
            disabled={!editable}
          />
        </Card>
      )}
    </div>
  );
}
