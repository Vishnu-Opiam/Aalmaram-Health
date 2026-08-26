"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { notFound, validation } from "@/lib/errors";
import { componentSchema } from "@/lib/validation/schemas";
import { parseDateInput } from "@/domain/shared/dates";
import {
  parseForm,
  runAction,
  successState,
  type FormState,
} from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import { refreshUrl } from "@/lib/refresh-url";

/**
 * Referential checks run before the write so the admin gets a field-level
 * message rather than a raw foreign-key error.
 */
async function assertReferences(vendorId: string, catalogueId: string) {
  const [vendor, catalogue] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } }),
    prisma.catalogue.findUnique({
      where: { id: catalogueId },
      select: { id: true },
    }),
  ]);
  const fieldErrors: Record<string, string[]> = {};
  if (!vendor) fieldErrors.vendorId = ["That vendor no longer exists."];
  if (!catalogue)
    fieldErrors.catalogueId = ["That catalogue no longer exists."];
  if (Object.keys(fieldErrors).length > 0) {
    throw validation(
      "Please choose a valid vendor and catalogue.",
      fieldErrors,
    );
  }
}

function toData(input: ReturnType<typeof parseComponentInput>) {
  return {
    vendorId: input.vendorId,
    catalogueId: input.catalogueId,
    name: input.name,
    tags: input.tags,
    price: new Prisma.Decimal(input.price.toFixed(2)),
    currency: input.currency,
    unit: input.unit,
    costStatus: input.costStatus,
    clientFacingDescription: input.clientFacingDescription,
    whatsIncluded: input.whatsIncluded,
    clientDeliverable: input.clientDeliverable,
    source: input.source,
    sourceDate: input.sourceDate ? parseDateInput(input.sourceDate) : null,
    status: input.status,
  };
}

function parseComponentInput(formData: FormData) {
  return parseForm(componentSchema, formData);
}

export async function createComponentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await runAction("component.create", formData, async () => {
    const user = await requireUser();
    const input = parseComponentInput(formData);
    await assertReferences(input.vendorId, input.catalogueId);

    const created = await prisma.$transaction(async (tx) => {
      const component = await tx.component.create({ data: toData(input) });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.COMPONENT_CREATED,
          entityType: "Component",
          entityId: component.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: {
            name: component.name,
            vendorId: component.vendorId,
            catalogueId: component.catalogueId,
          },
        },
        tx,
      );
      return component;
    });

    return successState(
      "Component created.",
      `/admin/components/${created.id}`,
    );
  });

  return result;
}

export async function updateComponentAction(
  componentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("component.update", formData, async () => {
    const user = await requireUser();
    const input = parseComponentInput(formData);
    await assertReferences(input.vendorId, input.catalogueId);

    const existing = await prisma.component.findUnique({
      where: { id: componentId },
      select: { id: true, status: true },
    });
    if (!existing) throw notFound("That component");

    await prisma.$transaction(async (tx) => {
      await tx.component.update({
        where: { id: componentId },
        data: toData(input),
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.COMPONENT_UPDATED,
          entityType: "Component",
          entityId: componentId,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: {
            name: input.name,
            status: input.status,
            statusChanged: existing.status !== input.status,
          },
        },
        tx,
      );
    });
    return successState(
      "Component updated.",
      refreshUrl(`/admin/components/${componentId}`),
    );
  });
}

export async function toggleComponentStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("component.toggle", formData, async () => {
    const user = await requireUser();
    const componentId = String(formData.get("componentId") ?? "");
    const component = await prisma.component.findUnique({
      where: { id: componentId },
      select: { id: true, name: true, status: true },
    });
    if (!component) throw notFound("That component");

    const next = component.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await prisma.$transaction(async (tx) => {
      await tx.component.update({
        where: { id: componentId },
        data: { status: next },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.COMPONENT_UPDATED,
          entityType: "Component",
          entityId: componentId,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { name: component.name, status: next },
        },
        tx,
      );
    });

    return successState(
      next === "ACTIVE" ? "Component activated." : "Component deactivated.",
      refreshUrl(`/admin/components/${componentId}`),
    );
  });
}
