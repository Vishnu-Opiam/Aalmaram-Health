"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { notFound } from "@/lib/errors";
import { branchSchema, practitionerSchema, vendorDraftRequestSchema } from "@/lib/validation/schemas";
import { applyVendorDraft, draftVendorProfile, type DraftSelection } from "@/lib/services/vendor-draft";
import { DRAFT_FIELDS, type VendorSuggestions } from "@/domain/vendors/website-draft";
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

// --- draft from website (P1.5) -------------------------------------------------

export type DraftState = FormState & { suggestions?: VendorSuggestions; draftId?: string };

/** Reads the page and returns suggestions; writes nothing but the AiRun. */
export async function draftVendorProfileAction(
  vendorId: string,
  _prev: DraftState,
  formData: FormData,
): Promise<DraftState> {
  let suggestions: VendorSuggestions | undefined;
  const state = await runAction("vendor.draft", formData, async () => {
    const user = await requireUser();
    const input = parseForm(vendorDraftRequestSchema, formData);
    suggestions = await draftVendorProfile({ vendorId, ...input }, { userId: user.id });
    const found = suggestions.fields.length + suggestions.branches.length + suggestions.practitioners.length;
    return successState(found ? "Suggestions ready. Tick what to keep, then save." : "Nothing new found on that page.");
  });
  return { ...state, suggestions, draftId: suggestions && crypto.randomUUID() };
}

export async function applyVendorDraftAction(
  vendorId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction("vendor.draft_apply", formData, async () => {
    const user = await requireUser();
    const fields: DraftSelection["fields"] = {};
    for (const { key } of DRAFT_FIELDS) {
      const value = formData.get(`field:${key}`);
      if (formData.get(`use:${key}`) === "on" && typeof value === "string") fields[key] = value;
    }
    const rows = (name: string) =>
      formData.getAll(name).flatMap((v) => {
        try {
          const row = JSON.parse(String(v));
          return row && typeof row === "object" ? [row as Record<string, string>] : [];
        } catch {
          return [];
        }
      });
    const result = await applyVendorDraft(
      vendorId,
      { fields, branches: rows("branch"), practitioners: rows("practitioner") },
      { userId: user.id, label: user.name },
    );
    const total = result.fields + result.branches + result.practitioners;
    return successState(
      total ? `Saved ${total} suggestion${total === 1 ? "" : "s"}.` : "Nothing was ticked, so nothing changed.",
      refreshUrl(`/admin/vendors/${vendorId}`),
    );
  });
}
