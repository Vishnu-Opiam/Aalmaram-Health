"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { notFound } from "@/lib/errors";
import { moduleSchema } from "@/lib/validation/schemas";
import {
  parseForm,
  runAction,
  successState,
  type FormState,
} from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import { refreshUrl } from "@/lib/refresh-url";

export async function createModuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await runAction("module.create", formData, async () => {
    const user = await requireUser();
    const input = parseForm(moduleSchema, formData);

    await prisma.$transaction(async (tx) => {
      const created = await tx.module.create({ data: input });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.MODULE_CREATED,
          entityType: "Module",
          entityId: created.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { name: created.name },
        },
        tx,
      );
    });

    return successState("Module created.", "/admin/modules");
  });

  return result;
}

export async function updateModuleAction(
  moduleId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await runAction("module.update", formData, async () => {
    const user = await requireUser();
    const input = parseForm(moduleSchema, formData);

    const existing = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { id: true },
    });
    if (!existing) throw notFound("That module");

    await prisma.$transaction(async (tx) => {
      await tx.module.update({ where: { id: moduleId }, data: input });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.MODULE_UPDATED,
          entityType: "Module",
          entityId: moduleId,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { name: input.name, status: input.status },
        },
        tx,
      );
    });

    return successState("Module updated.", "/admin/modules");
  });

  return result;
}

export async function toggleModuleStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("module.toggle", formData, async () => {
    const user = await requireUser();
    const moduleId = String(formData.get("moduleId") ?? "");
    const record = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { id: true, name: true, status: true },
    });
    if (!record) throw notFound("That module");

    const next = record.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await prisma.$transaction(async (tx) => {
      await tx.module.update({
        where: { id: moduleId },
        data: { status: next },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.MODULE_UPDATED,
          entityType: "Module",
          entityId: moduleId,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { name: record.name, status: next },
        },
        tx,
      );
    });

    return successState(
      next === "ACTIVE" ? "Module activated." : "Module deactivated.",
      refreshUrl("/admin/modules"),
    );
  });
}

/**
 * Reordering swaps sortOrder with the neighbour in the requested direction,
 * inside a transaction so the list can never end up with a duplicate order.
 */
export async function reorderModuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("module.reorder", formData, async () => {
    const user = await requireUser();
    const moduleId = String(formData.get("moduleId") ?? "");
    const direction = String(formData.get("direction") ?? "");
    if (direction !== "up" && direction !== "down") {
      return successState("Nothing to reorder.", refreshUrl("/admin/modules"));
    }

    await prisma.$transaction(async (tx) => {
      const modules = await tx.module.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, sortOrder: true },
      });
      const index = modules.findIndex((m) => m.id === moduleId);
      if (index === -1) return;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= modules.length) return;

      // Normalise to a dense 0..n-1 ordering after the swap, which keeps the
      // sequence stable even if earlier data had gaps or ties.
      const reordered = [...modules];
      [reordered[index], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[index],
      ];

      for (const [position, record] of reordered.entries()) {
        if (record.sortOrder !== position) {
          await tx.module.update({
            where: { id: record.id },
            data: { sortOrder: position },
          });
        }
      }

      await logActivity(
        {
          action: ACTIVITY_ACTIONS.MODULE_UPDATED,
          entityType: "Module",
          entityId: moduleId,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { reordered: direction },
        },
        tx,
      );
    });

    return successState("Order updated.", refreshUrl("/admin/modules"));
  });
}
