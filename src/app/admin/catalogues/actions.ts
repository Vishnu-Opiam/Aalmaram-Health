"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { notFound, validation } from "@/lib/errors";
import { catalogueSchema } from "@/lib/validation/schemas";
import {
  parseForm,
  runAction,
  successState,
  type FormState,
} from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";

/** The Module → Catalogue relationship is enforced here as well as by the FK. */
async function assertModuleExists(moduleId: string) {
  const parent = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { id: true },
  });
  if (!parent) {
    throw validation("Choose an existing parent module.", {
      moduleId: ["That module no longer exists."],
    });
  }
}

export async function createCatalogueAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await runAction("catalogue.create", formData, async () => {
    const user = await requireUser();
    const input = parseForm(catalogueSchema, formData);
    await assertModuleExists(input.moduleId);

    await prisma.$transaction(async (tx) => {
      const created = await tx.catalogue.create({ data: input });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.CATALOGUE_CREATED,
          entityType: "Catalogue",
          entityId: created.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { name: created.name, moduleId: created.moduleId },
        },
        tx,
      );
    });

    return successState("Catalogue created.", "/admin/catalogues");
  });

  return result;
}

export async function updateCatalogueAction(
  catalogueId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await runAction("catalogue.update", formData, async () => {
    const user = await requireUser();
    const input = parseForm(catalogueSchema, formData);
    await assertModuleExists(input.moduleId);

    const existing = await prisma.catalogue.findUnique({
      where: { id: catalogueId },
      select: { id: true },
    });
    if (!existing) throw notFound("That catalogue");

    await prisma.$transaction(async (tx) => {
      await tx.catalogue.update({ where: { id: catalogueId }, data: input });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.CATALOGUE_UPDATED,
          entityType: "Catalogue",
          entityId: catalogueId,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { name: input.name, status: input.status },
        },
        tx,
      );
    });

    return successState("Catalogue updated.", "/admin/catalogues");
  });

  return result;
}
