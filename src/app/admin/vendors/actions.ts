"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { notFound } from "@/lib/errors";
import { vendorSchema } from "@/lib/validation/schemas";
import {
  parseForm,
  runAction,
  successState,
  type FormState,
} from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import { refreshUrl } from "@/lib/refresh-url";

export async function createVendorAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await runAction("vendor.create", formData, async () => {
    const user = await requireUser();
    const input = parseForm(vendorSchema, formData);

    const vendor = await prisma.$transaction(async (tx) => {
      const created = await tx.vendor.create({ data: input });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.VENDOR_CREATED,
          entityType: "Vendor",
          entityId: created.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { name: created.name },
        },
        tx,
      );
      return created;
    });

    return successState("Vendor created.", `/admin/vendors/${vendor.id}`);
  });

  return result;
}

export async function updateVendorAction(
  vendorId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("vendor.update", formData, async () => {
    const user = await requireUser();
    const input = parseForm(vendorSchema, formData);

    const existing = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, status: true },
    });
    if (!existing) throw notFound("That vendor");

    await prisma.$transaction(async (tx) => {
      await tx.vendor.update({ where: { id: vendorId }, data: input });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.VENDOR_UPDATED,
          entityType: "Vendor",
          entityId: vendorId,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: {
            name: input.name,
            statusChanged: existing.status !== input.status,
            status: input.status,
          },
        },
        tx,
      );
    });
    return successState(
      "Vendor updated.",
      refreshUrl(`/admin/vendors/${vendorId}`),
    );
  });
}

/** Quick activate/deactivate from the detail view. */
export async function toggleVendorStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("vendor.toggle", formData, async () => {
    const user = await requireUser();
    const vendorId = String(formData.get("vendorId") ?? "");
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, name: true, status: true },
    });
    if (!vendor) throw notFound("That vendor");

    const next = vendor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await prisma.$transaction(async (tx) => {
      await tx.vendor.update({
        where: { id: vendorId },
        data: { status: next },
      });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.VENDOR_UPDATED,
          entityType: "Vendor",
          entityId: vendorId,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { name: vendor.name, status: next },
        },
        tx,
      );
    });

    return successState(
      next === "ACTIVE" ? "Vendor activated." : "Vendor deactivated.",
      refreshUrl(`/admin/vendors/${vendorId}`),
    );
  });
}
