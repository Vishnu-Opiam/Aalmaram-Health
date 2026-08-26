import type { Metadata } from "next";
import { ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import {
  AppLink as Link,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { reorderModuleAction, toggleModuleStatusAction } from "./actions";
import { RecordStatusBadge } from "@/components/admin/status-badges";
import { ActionButton } from "@/components/admin/action-button";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Modules" };

export default async function ModulesPage() {
  await requireUserPage("/admin/modules");

  const modules = await prisma.module.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { catalogues: true } },
      catalogues: { select: { _count: { select: { components: true } } } },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Modules"
        description="Top-level categories. Stored as records so the team can maintain them without a deploy."
        actions={
          <ButtonLink href="/admin/modules/new" size="sm">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New module
          </ButtonLink>
        }
      />

      {modules.length === 0 ? (
        <EmptyState
          title="No modules yet"
          description="Modules are the top of the inventory hierarchy: Module → Catalogue → Component."
          action={
            <ButtonLink href="/admin/modules/new" size="sm">
              Create the first module
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th className="w-24">Order</Th>
                <Th>Module</Th>
                <Th className="text-right">Catalogues</Th>
                <Th className="text-right">Components</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module, index) => {
                const componentCount = module.catalogues.reduce(
                  (total, catalogue) => total + catalogue._count.components,
                  0,
                );
                return (
                  <Tr key={module.id}>
                    <Td>
                      <div className="flex items-center gap-1">
                        <ReorderButton
                          moduleId={module.id}
                          direction="up"
                          disabled={index === 0}
                        />
                        <ReorderButton
                          moduleId={module.id}
                          direction="down"
                          disabled={index === modules.length - 1}
                        />
                      </div>
                    </Td>
                    <Td>
                      <p className="font-medium text-ink-900">{module.name}</p>
                      {module.description && (
                        <p className="max-w-md text-xs text-ink-400">
                          {module.description}
                        </p>
                      )}
                    </Td>
                    <Td className="text-right tabular-nums">
                      <Link
                        href={`/admin/catalogues?moduleId=${module.id}`}
                        className="hover:text-teal-600 hover:underline"
                      >
                        {module._count.catalogues}
                      </Link>
                    </Td>
                    <Td className="text-right tabular-nums">
                      <Link
                        href={`/admin/components?moduleId=${module.id}`}
                        className="hover:text-teal-600 hover:underline"
                      >
                        {componentCount}
                      </Link>
                    </Td>
                    <Td>
                      <RecordStatusBadge status={module.status} />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        <ActionButton
                          action={toggleModuleStatusAction}
                          fields={{ moduleId: module.id }}
                          variant="ghost"
                          pendingLabel="Updating…"
                        >
                          {module.status === "ACTIVE"
                            ? "Deactivate"
                            : "Activate"}
                        </ActionButton>
                        <Link
                          href={`/admin/modules/${module.id}/edit`}
                          className="flex items-center gap-1 text-[13px] font-medium text-teal-600 hover:underline"
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          Edit
                        </Link>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function ReorderButton({
  moduleId,
  direction,
  disabled,
}: {
  moduleId: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  const Icon = direction === "up" ? ChevronUp : ChevronDown;
  if (disabled) {
    return (
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded border border-sand-200 text-ink-300"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <ActionButton
      action={reorderModuleAction}
      fields={{ moduleId, direction }}
      variant="ghost"
      pendingLabel="…"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{`Move ${direction}`}</span>
    </ActionButton>
  );
}
