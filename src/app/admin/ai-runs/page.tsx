import type { Metadata } from "next";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th, Tr, AppLink as Link } from "@/components/ui/primitives";
import { formatRelative } from "@/domain/shared/dates";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "AI runs" };

const TASK_LABELS = {
  TRIP_REQUIREMENTS_EXTRACTION: "Requirements from conversation",
  ITINERARY_DRAFT: "Itinerary draft",
  CLIENT_CHAT: "Client chat reply",
} as const;

/** Every model call, for debugging and cost. Holds ids and counts only — no prompts or client text. */
export default async function AiRunsPage() {
  await requireUserPage("/admin/ai-runs");
  const runs = await prisma.aiRun.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="System"
        title="AI runs"
        description={`Provider: ${env().AI_PROVIDER === "fake" ? "fake (deterministic, offline)" : "Vercel AI Gateway"}. Latest 100 calls.`}
      />
      {runs.length === 0 ? (
        <EmptyState title="No AI calls yet" description="They appear here when staff or clients use an AI feature." />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Task</Th>
                <Th>Model</Th>
                <Th>Status</Th>
                <Th className="text-right">Tokens in / out</Th>
                <Th className="text-right">Latency</Th>
                <Th>Output (ids and counts)</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <Tr key={run.id}>
                  <Td className="whitespace-nowrap text-ink-500">{formatRelative(run.createdAt)}</Td>
                  <Td>
                    {TASK_LABELS[run.task]}
                    {run.entityType === "Trip" && run.entityId && (
                      <Link href={`/admin/trips/${run.entityId}`} className="block text-xs text-teal-600 hover:underline">
                        Open trip
                      </Link>
                    )}
                  </Td>
                  <Td className="text-xs text-ink-500">
                    {run.model}
                    <span className="block">{run.promptVersion}</span>
                  </Td>
                  <Td>
                    <Badge tone={run.status === "SUCCEEDED" ? "success" : "danger"}>{run.status.toLowerCase()}</Badge>
                    {run.attempts > 1 && <span className="block text-xs text-ink-400">{run.attempts} attempts</span>}
                  </Td>
                  <Td className="text-right tabular-nums text-ink-500">
                    {run.inputTokens ?? "—"} / {run.outputTokens ?? "—"}
                  </Td>
                  <Td className="text-right tabular-nums text-ink-500">{run.latencyMs} ms</Td>
                  <Td className="max-w-[280px] truncate font-mono text-xs text-ink-500">
                    {run.output ? JSON.stringify(run.output) : run.errorCode ?? "—"}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
