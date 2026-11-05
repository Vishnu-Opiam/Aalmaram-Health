import "server-only";
import { prisma } from "@/lib/db";
import { generateStructured } from "@/lib/ai";
import * as vendorPrompt from "@/lib/ai/prompts/vendor-profile";
import { notFound, validation } from "@/lib/errors";
import { branchSchema, practitionerSchema, vendorSchema } from "@/lib/validation/schemas";
import { ACTIVITY_ACTIONS, logActivity } from "@/lib/services/activity-log";
import {
  DRAFT_FIELDS,
  buildSuggestions,
  heuristicVendorDraft,
  readPage,
  vendorDraftSchema,
  type DraftFieldKey,
  type VendorSuggestions,
} from "@/domain/vendors/website-draft";
import { fetchPublicPage } from "./web-page";

/**
 * "Draft from website" on the vendor page (P1.5). Drafting reads one page and
 * returns suggestions without writing anything; applying writes only what the
 * admin ticked. The page text is never stored or logged.
 */
export async function draftVendorProfile(
  input: { vendorId: string; url: string | null; pastedText: string | null },
  actor: { userId: string },
): Promise<VendorSuggestions> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: input.vendorId },
    include: { branches: { select: { name: true } }, practitioners: { select: { name: true } } },
  });
  if (!vendor) throw notFound("That vendor");
  if (!input.url && !input.pastedText) throw validation("Enter the page's address or paste its text.");

  const page = input.pastedText
    ? readPage(input.pastedText, input.url)
    : await fetchPublicPage(input.url!).then((p) => readPage(p.html, p.url));
  if (page.text.length < 20) throw validation("That page has almost no text to read. Try pasting its text instead.");

  const { data } = await generateStructured({
    task: "VENDOR_PROFILE_EXTRACTION",
    schema: vendorDraftSchema,
    system: vendorPrompt.SYSTEM,
    prompt: vendorPrompt.buildPrompt({ vendorName: vendor.name, page }),
    promptVersion: vendorPrompt.PROMPT_VERSION,
    model: "fast",
    fake: () => heuristicVendorDraft(page),
    logOutput: (d) => ({
      branches: d.branches.length,
      practitioners: d.practitioners.length,
      services: d.services.length,
      accreditations: d.accreditations.length,
    }),
    entity: { type: "Vendor", id: vendor.id },
    actorUserId: actor.userId,
  });

  return buildSuggestions(vendor, data, page.url);
}

export type DraftSelection = {
  /** Ticked fields only, as form values (lists one entry per line). */
  fields: Partial<Record<DraftFieldKey, string>>;
  /** Ticked rows, form-shaped like the branch / practitioner forms. */
  branches: Record<string, string>[];
  practitioners: Record<string, string>[];
};

export async function applyVendorDraft(
  vendorId: string,
  selection: DraftSelection,
  actor: { userId: string; label: string },
): Promise<{ fields: number; branches: number; practitioners: number }> {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
  if (!vendor) throw notFound("That vendor");

  const keys = DRAFT_FIELDS.map((f) => f.key).filter((k) => k in selection.fields);
  // The profile form's own rules, for just the ticked fields.
  const parsed = vendorSchema.pick(Object.fromEntries(keys.map((k) => [k, true])) as Record<DraftFieldKey, true>).safeParse(selection.fields);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (fieldErrors[issue.path.join(".")] ??= []).push(issue.message);
    throw validation("Some suggestions need fixing before they can be saved.", fieldErrors);
  }
  const branches = selection.branches.map((b) => branchSchema.safeParse({ ...b, vendorId }));
  const practitioners = selection.practitioners.map((p) => practitionerSchema.safeParse({ ...p, vendorId }));
  const bad = [...branches, ...practitioners].find((r) => !r.success);
  if (bad && !bad.success) throw validation(`A suggested branch or practitioner is incomplete: ${bad.error.issues[0]?.message ?? "check it"}`);

  await prisma.$transaction(async (tx) => {
    if (keys.length) await tx.vendor.update({ where: { id: vendorId }, data: parsed.data });
    // Same name as an existing branch = already there; skip rather than fail the whole apply.
    if (branches.length) await tx.branch.createMany({ data: branches.map((b) => b.data!), skipDuplicates: true });
    if (practitioners.length) await tx.practitioner.createMany({ data: practitioners.map((p) => p.data!) });
    await logActivity(
      {
        action: ACTIVITY_ACTIONS.AI_VENDOR_PROFILE_APPLIED,
        entityType: "Vendor",
        entityId: vendorId,
        actorUserId: actor.userId,
        actorLabel: actor.label,
        metadata: { fields: keys, branches: branches.length, practitioners: practitioners.length },
      },
      tx,
    );
  });
  return { fields: keys.length, branches: branches.length, practitioners: practitioners.length };
}
