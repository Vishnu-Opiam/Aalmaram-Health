import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createAdmin, createInventory, prisma, resetDatabase } from "./helpers";
import { applyVendorDraft, draftVendorProfile } from "@/lib/services/vendor-draft";

const page = readFileSync("evals/vendor-profile/diagnostics-clinic.html", "utf8");

/** "Draft from website" with the fake model: suggestions first, writes only on apply. */
describe("vendor profile draft from website (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("drafts suggestions without writing, then applies only the ticked ones", async () => {
    const admin = await createAdmin();
    const { vendor } = await createInventory(); // has hqCity Kochi and a phone already
    await prisma.branch.create({ data: { vendorId: vendor.id, name: "Edappally", city: "Kochi" } });

    const suggestions = await draftVendorProfile(
      { vendorId: vendor.id, url: null, pastedText: page },
      { userId: admin.id },
    );
    expect(await prisma.vendor.findUniqueOrThrow({ where: { id: vendor.id } })).toMatchObject({
      description: null,
      accreditations: [],
    });
    expect(suggestions.fields.find((f) => f.field === "phone")).toMatchObject({ replaces: true });
    expect(suggestions.branches.map((b) => b.name)).toEqual(["Kakkanad", "Thrissur Round"]);

    const run = await prisma.aiRun.findFirstOrThrow({ where: { task: "VENDOR_PROFILE_EXTRACTION" } });
    expect(run).toMatchObject({ status: "SUCCEEDED", provider: "fake", entityId: vendor.id, actorUserId: admin.id });
    // Counts only: no page text, names or contact details.
    expect(JSON.stringify(run.output)).not.toMatch(/Lakeside|Kurup|Kakkanad|484|@/);

    const pick = (key: string) => suggestions.fields.find((f) => f.field === key)!.suggested;
    const result = await applyVendorDraft(
      vendor.id,
      {
        fields: { description: pick("description"), accreditations: pick("accreditations"), yearEstablished: pick("yearEstablished") },
        branches: [suggestions.branches[0]],
        practitioners: suggestions.practitioners,
      },
      { userId: admin.id, label: admin.name },
    );
    expect(result).toEqual({ fields: 3, branches: 1, practitioners: 2 });

    const after = await prisma.vendor.findUniqueOrThrow({
      where: { id: vendor.id },
      include: { branches: { orderBy: { name: "asc" } }, practitioners: { orderBy: { name: "asc" } } },
    });
    expect(after).toMatchObject({ phone: "+91 000", hqCity: "Kochi", accreditations: ["NABH", "NABL"], yearEstablished: 2004 });
    expect(after.description).toMatch(/preventive diagnostics clinic/);
    expect(after.branches.map((b) => [b.name, b.city, b.postcode])).toEqual([
      ["Edappally", "Kochi", null],
      ["Kakkanad", "Kochi", "682030"],
    ]);
    expect(after.practitioners[0]).toMatchObject({ name: "Dr. Anjali Kurup", qualifications: ["MBBS", "MD"], yearsOfExperience: 18 });

    const log = await prisma.activityLog.findFirstOrThrow({ where: { action: "ai.vendor_profile_applied" } });
    expect(log.metadata).toEqual({ fields: ["description", "accreditations", "yearEstablished"], branches: 1, practitioners: 2 });
  });

  it("validates applied values with the profile form's rules and writes nothing on error", async () => {
    const admin = await createAdmin();
    const { vendor } = await createInventory();
    await expect(
      applyVendorDraft(
        vendor.id,
        { fields: { description: "Fine.", website: "not a url" }, branches: [], practitioners: [] },
        { userId: admin.id, label: admin.name },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION", fieldErrors: { website: [expect.any(String)] } });
    expect((await prisma.vendor.findUniqueOrThrow({ where: { id: vendor.id } })).description).toBeNull();

    await expect(
      applyVendorDraft(vendor.id, { fields: {}, branches: [{ name: "No city" }], practitioners: [] }, { userId: admin.id, label: admin.name }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await prisma.branch.count()).toBe(0);
  });

  it("refuses to fetch addresses on our own network", async () => {
    const admin = await createAdmin();
    const { vendor } = await createInventory();
    for (const url of ["http://127.0.0.1:5433/", "http://localhost:3000/admin", "http://169.254.169.254/latest/meta-data", "file:///etc/passwd"]) {
      await expect(
        draftVendorProfile({ vendorId: vendor.id, url, pastedText: null }, { userId: admin.id }),
      ).rejects.toMatchObject({ code: "VALIDATION" });
    }
    expect(await prisma.aiRun.count()).toBe(0);
  });

  it("rejects an unknown vendor", async () => {
    const admin = await createAdmin();
    await expect(
      draftVendorProfile({ vendorId: "nope", url: null, pastedText: page }, { userId: admin.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      applyVendorDraft("nope", { fields: {}, branches: [], practitioners: [] }, { userId: admin.id, label: admin.name }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
