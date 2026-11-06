"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { notFound, validation } from "@/lib/errors";
import { parseBranchLines } from "@/domain/vendors/branches";
import { branchListSchema, branchSchema, practitionerSchema } from "@/lib/validation/schemas";
import {
  parseForm,
  runAction,
  successState,
  type FormState,
} from "@/lib/validation/form";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import { refreshUrl } from "@/lib/refresh-url";

/**
 * Branches and practitioners belong to exactly one vendor. Like the rest of the
 * inventory they are deactivated, never deleted, so past itineraries keep
 * pointing at the branch the client actually visited.
 */

async function assertVendor(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true },
  });
  if (!vendor) throw notFound("That vendor");
}

// --- branches ----------------------------------------------------------------

export async function saveBranchAction(
  branchId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("branch.save", formData, async () => {
    const user = await requireUser();
    const input = parseForm(branchSchema, formData);
    await assertVendor(input.vendorId);

    if (branchId) {
      const existing = await prisma.branch.findFirst({
        where: { id: branchId, vendorId: input.vendorId },
        select: { id: true },
      });
      if (!existing) throw notFound("That branch");
    }

    await prisma.$transaction(async (tx) => {
      const branch = branchId
        ? await tx.branch.update({ where: { id: branchId }, data: input })
        : await tx.branch.create({ data: input });
      await logActivity(
        {
          action: branchId ? ACTIVITY_ACTIONS.BRANCH_UPDATED : ACTIVITY_ACTIONS.BRANCH_CREATED,
          entityType: "Branch",
          entityId: branch.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { vendorId: input.vendorId, status: input.status },
        },
        tx,
      );
    });

    return successState(
      branchId ? "Branch updated." : "Branch added.",
      refreshUrl(`/admin/vendors/${input.vendorId}`),
    );
  });
}

/**
 * A chain (every Taj hotel, every Fab India shop in Kerala) is one vendor with
 * many branches; this adds them from a pasted list in one go. Names the vendor
 * already has are skipped, so pasting the same list twice changes nothing.
 */
export async function addBranchesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction("branch.bulk_add", formData, async () => {
    const user = await requireUser();
    const input = parseForm(branchListSchema, formData);
    await assertVendor(input.vendorId);

    const existing = await prisma.branch.findMany({ where: { vendorId: input.vendorId }, select: { name: true } });
    const { branches, skipped, errors } = parseBranchLines(input.lines, existing.map((b) => b.name));
    if (errors.length > 0) throw validation("Please correct the highlighted fields.", { lines: errors });
    if (branches.length === 0) throw validation("Every branch in the list is already on this vendor.", { lines: ["Nothing new to add."] });

    await prisma.$transaction(async (tx) => {
      await tx.branch.createMany({ data: branches.map((b) => ({ ...b, vendorId: input.vendorId })) });
      await logActivity(
        {
          action: ACTIVITY_ACTIONS.BRANCHES_ADDED,
          entityType: "Vendor",
          entityId: input.vendorId,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { added: branches.length, skipped: skipped.length },
        },
        tx,
      );
    });

    const note = skipped.length ? ` ${skipped.length} already on this vendor, skipped.` : "";
    return successState(
      `${branches.length} ${branches.length === 1 ? "branch" : "branches"} added.${note}`,
      refreshUrl(`/admin/vendors/${input.vendorId}`),
    );
  });
}

// --- practitioners -----------------------------------------------------------

export async function savePractitionerAction(
  practitionerId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("practitioner.save", formData, async () => {
    const user = await requireUser();
    const input = parseForm(practitionerSchema, formData);
    await assertVendor(input.vendorId);

    if (practitionerId) {
      // Moving a practitioner to another vendor would orphan their component links.
      const existing = await prisma.practitioner.findFirst({
        where: { id: practitionerId, vendorId: input.vendorId },
        select: { id: true },
      });
      if (!existing) throw notFound("That practitioner");
    }

    await prisma.$transaction(async (tx) => {
      const practitioner = practitionerId
        ? await tx.practitioner.update({ where: { id: practitionerId }, data: input })
        : await tx.practitioner.create({ data: input });
      await logActivity(
        {
          action: practitionerId
            ? ACTIVITY_ACTIONS.PRACTITIONER_UPDATED
            : ACTIVITY_ACTIONS.PRACTITIONER_CREATED,
          entityType: "Practitioner",
          entityId: practitioner.id,
          actorUserId: user.id,
          actorLabel: user.name,
          metadata: { vendorId: input.vendorId, status: input.status },
        },
        tx,
      );
    });

    return successState(
      practitionerId ? "Practitioner updated." : "Practitioner added.",
      refreshUrl(`/admin/vendors/${input.vendorId}`),
    );
  });
}
