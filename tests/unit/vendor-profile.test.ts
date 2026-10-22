import { describe, expect, it } from "vitest";
import {
  formatDuration,
  missingProfileFields,
  practitionersBelongToVendor,
  type VendorProfileFields,
} from "@/domain/vendors/profile";
import { componentSchema, practitionerSchema, vendorSchema } from "@/lib/validation/schemas";

const empty: VendorProfileFields = {
  description: null,
  phone: null,
  hqCity: null,
  website: null,
  socialLinks: [],
  accreditations: [],
  languages: [],
  yearEstablished: null,
  staffCount: null,
  equipment: [],
  owners: [],
};

describe("missingProfileFields", () => {
  it("lists every field of an empty profile, in checklist order", () => {
    expect(missingProfileFields(empty)).toEqual([
      "Description",
      "Phone",
      "HQ address",
      "Website",
      "Social links",
      "Accreditations",
      "Languages",
      "Year established",
      "Staff count",
      "Equipment",
      "Owners",
    ]);
  });

  it("treats whitespace as empty and zero staff as filled", () => {
    const missing = missingProfileFields({
      ...empty,
      description: "   ",
      phone: "+91 1",
      staffCount: 0,
      languages: ["English"],
    });
    expect(missing).toContain("Description");
    expect(missing).not.toContain("Phone");
    expect(missing).not.toContain("Staff count");
    expect(missing).not.toContain("Languages");
  });
});

describe("formatDuration", () => {
  it.each([
    [30, "30 min"],
    [60, "1 h"],
    [90, "1 h 30 min"],
    [24 * 60, "1 day"],
    [7 * 24 * 60, "7 days"],
  ])("%i minutes → %s", (minutes, label) => {
    expect(formatDuration(minutes)).toBe(label);
  });
});

describe("practitionersBelongToVendor", () => {
  it("accepts only the vendor's own practitioners", () => {
    expect(practitionersBelongToVendor("v1", [])).toBe(true);
    expect(practitionersBelongToVendor("v1", [{ id: "p1", vendorId: "v1" }])).toBe(true);
    expect(
      practitionersBelongToVendor("v1", [
        { id: "p1", vendorId: "v1" },
        { id: "p2", vendorId: "v2" },
      ]),
    ).toBe(false);
  });
});

describe("vendor profile validation", () => {
  it("splits one-per-line fields and drops blank lines", () => {
    const parsed = vendorSchema.parse({
      name: "Clinic (demo)",
      phone: "+91 1",
      languages: "English\r\n\r\n  Malayalam  \n",
      yearEstablished: "1998",
      staffCount: "",
    });
    expect(parsed.languages).toEqual(["English", "Malayalam"]);
    expect(parsed.yearEstablished).toBe(1998);
    expect(parsed.staffCount).toBeNull();
  });

  it("requires a phone and full web addresses", () => {
    const result = vendorSchema.safeParse({
      name: "Clinic (demo)",
      phone: "",
      website: "clinic.demo",
      socialLinks: "instagram.com/clinic",
    });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["phone", "website", "socialLinks"]));
  });

  it("rejects a fractional year of experience", () => {
    const result = practitionerSchema.safeParse({
      vendorId: "v1",
      name: "Dr A (demo)",
      role: "Physician",
      yearsOfExperience: "2.5",
    });
    expect(result.success).toBe(false);
  });
});

describe("component validation", () => {
  const base = {
    vendorId: "v1",
    catalogueId: "c1",
    name: "Blood test",
    price: "185",
    clientFacingDescription: "A blood test.",
  };

  it("requires a duration and defaults the price unit", () => {
    expect(componentSchema.safeParse(base).success).toBe(false);
    const parsed = componentSchema.parse({ ...base, durationMinutes: "30" });
    expect(parsed.durationMinutes).toBe(30);
    expect(parsed.priceUnit).toBe("PER_PERSON");
    expect(parsed.recoveryTimeMinutes).toBeNull();
  });

  it("accepts restaurants priced for two", () => {
    const parsed = componentSchema.parse({ ...base, durationMinutes: "90", priceUnit: "FOR_TWO" });
    expect(parsed.priceUnit).toBe("FOR_TWO");
  });
});
