import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildSuggestions,
  heuristicVendorDraft,
  readPage,
  vendorDraftSchema,
  type CurrentVendor,
} from "@/domain/vendors/website-draft";
import { findMedicalClaims } from "@/domain/ai/safety";
import { isPublicAddress } from "@/lib/services/web-page";

const fixture = (name: string) => readFileSync(`evals/vendor-profile/${name}`, "utf8");
const draftOf = (name: string, url: string | null = "https://example.test/") =>
  heuristicVendorDraft(readPage(fixture(name), url));

const EMPTY: CurrentVendor = {
  description: null, phone: null, email: null, website: null, hqLine: null, hqCity: null, hqPostcode: null,
  hqCountry: null, socialLinks: [], accreditations: [], languages: [], yearEstablished: null, staffCount: null,
  equipment: [], owners: [], branches: [], practitioners: [],
};

describe("readPage", () => {
  it("keeps readable text and absolute links, drops scripts, styles and tags", () => {
    const page = readPage(fixture("diagnostics-clinic.html"), "https://example.test/");
    expect(page.text).not.toMatch(/dataLayer|font-family|<\w/);
    expect(page.text).toContain("© Lakeside Diagnostics (demo) & partners");
    expect(page.text.split("\n")[0]).toMatch(/^Lakeside Diagnostics \(demo\) is a preventive/); // meta description first
    expect(page.links).toEqual(["https://www.instagram.com/lakeside_demo/", "https://www.facebook.com/lakesidedemo/"]);
  });

  it("reads pasted plain text as lines and finds its links", () => {
    const page = readPage("  Hello   there \n\n see https://www.youtube.com/@x ", null);
    expect(page.text).toBe("Hello there\nsee https://www.youtube.com/@x");
    expect(page.links).toEqual(["https://www.youtube.com/@x"]);
  });
});

describe("heuristicVendorDraft (fake provider)", () => {
  it("matches the draft schema for every fixture", () => {
    for (const f of ["diagnostics-clinic.html", "ayurveda-listing.html", "culture-centre.txt"]) {
      expect(() => vendorDraftSchema.parse(draftOf(f))).not.toThrow();
    }
  });

  it("reads a provider's own site: accreditations, branches, doctors, HQ", () => {
    const d = draftOf("diagnostics-clinic.html");
    expect(d).toMatchObject({
      phone: "+91 484 200 0000",
      email: "hello@lakeside-demo.test",
      hqLine: "4 Marine Drive",
      hqCity: "Ernakulam",
      hqPostcode: "682031",
      yearEstablished: 2004,
      staffCount: 85,
      accreditations: ["NABH", "NABL"],
    });
    expect(d.branches.map((b) => [b.name, b.city])).toEqual([
      ["Edappally", "Kochi"],
      ["Kakkanad", "Kochi"],
      ["Thrissur Round", "Thrissur"],
    ]);
    // City and PIN have their own fields, so the street line doesn't repeat them.
    expect(d.branches[0]).toMatchObject({ addressLine: "12 Lakeview Road, Edappally", postcode: "682024" });
    expect(d.practitioners[0]).toEqual({
      name: "Dr. Anjali Kurup",
      role: "Senior physician",
      qualifications: ["MBBS", "MD"],
      yearsOfExperience: 18,
      languages: ["English", "Malayalam"],
    });
  });

  it("reads a tourism-board listing's classification and keeps doctors out of services", () => {
    const d = draftOf("ayurveda-listing.html");
    expect(d.accreditations).toEqual(["Kerala Tourism Green Leaf"]);
    expect(d.services.map((s) => s.name)).toEqual(["Abhyanga", "Shirodhara", "Morning yoga class"]);
    expect(d.practitioners.map((p) => p.name)).toEqual(["Dr. Lekha Sreedhar"]);
  });
});

describe("buildSuggestions", () => {
  it("never lets a health claim through, and says how many passages it left out", () => {
    const s = buildSuggestions(EMPTY, draftOf("diagnostics-clinic.html"), "https://example.test/");
    expect(s.services.map((x) => x.name)).not.toContain("Diabetes reversal programme");
    expect(s.withheld).toBeGreaterThan(0);
    const shown = [...s.fields.map((f) => f.suggested), ...s.services.flatMap((x) => [x.name, x.description ?? ""])];
    expect(shown.filter((t) => findMedicalClaims(t).length > 0)).toEqual([]);

    const claim = { ...draftOf("culture-centre.txt"), description: "Our massage cures back pain." };
    const t = buildSuggestions(EMPTY, claim, null);
    expect(t.fields.find((f) => f.field === "description")).toBeUndefined();
    expect(t.withheld).toBe(1);
  });

  it("fills empty fields ticked, and only offers to replace a filled one unticked", () => {
    const current = { ...EMPTY, phone: "+91 484 999 9999", description: "Written by us." };
    const s = buildSuggestions(current, draftOf("diagnostics-clinic.html"), "https://example.test/");
    expect(s.fields.find((f) => f.field === "phone")).toMatchObject({ replaces: true, current: "+91 484 999 9999" });
    expect(s.fields.find((f) => f.field === "email")).toMatchObject({ replaces: false, current: "" });
    expect(s.fields.find((f) => f.field === "website")).toMatchObject({ suggested: "https://example.test/" });
  });

  it("merges lists without dropping entries and skips what the profile already holds", () => {
    const current = {
      ...EMPTY,
      accreditations: ["nabh", "ISO 9001"],
      email: "hello@lakeside-demo.test",
      branches: [{ name: "edappally" }],
      practitioners: [{ name: "Dr. Thomas Ittiyavira" }],
    };
    const s = buildSuggestions(current, draftOf("diagnostics-clinic.html"), null);
    expect(s.fields.find((f) => f.field === "accreditations")).toMatchObject({
      suggested: "nabh\nISO 9001\nNABL",
      replaces: false,
    });
    expect(s.fields.find((f) => f.field === "email")).toBeUndefined();
    expect(s.fields.find((f) => f.field === "website")).toBeUndefined(); // pasted text has no address
    expect(s.branches.map((b) => b.name)).toEqual(["Kakkanad", "Thrissur Round"]);
    expect(s.practitioners.map((p) => p.name)).toEqual(["Dr. Anjali Kurup"]);
    expect(s.practitioners[0]).toMatchObject({ qualifications: "MBBS\nMD", yearsOfExperience: "18" });
  });
});

describe("isPublicAddress (page fetch guard)", () => {
  it("refuses loopback, private, link-local and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "localhost"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "93.184.216.34", "2606:4700:4700::1111"]) expect(isPublicAddress(ip), ip).toBe(true);
  });
});
