import { z } from "zod";
import { findMedicalClaims } from "@/domain/ai/safety";

/**
 * Vendor profile drafted from a web page (P1.5): the provider's own site or a
 * public listing such as a tourism-board page. The model (or the deterministic
 * fallback below) reads the page and returns this shape; `buildSuggestions`
 * turns it into per-field suggestions the admin accepts or ignores. Nothing
 * is written until the admin applies them, and a filled field is only ever
 * replaced when the admin ticks it.
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const url = z.string().trim().max(500).regex(/^https?:\/\/\S+$/i);

export const vendorDraftSchema = z.object({
  description: text(1500).nullable(),
  phone: text(50).nullable(),
  email: z.string().trim().max(200).email().nullable(),
  hqLine: text(300).nullable(),
  hqCity: text(120).nullable(),
  hqPostcode: text(20).nullable(),
  hqCountry: text(100).nullable(),
  socialLinks: z.array(url).max(10),
  accreditations: z.array(text(300)).max(30),
  languages: z.array(text(60)).max(20),
  yearEstablished: z.number().int().min(1800).max(2100).nullable(),
  staffCount: z.number().int().min(0).max(1_000_000).nullable(),
  equipment: z.array(text(300)).max(30),
  owners: z.array(text(200)).max(10),
  branches: z
    .array(z.object({ name: text(200), addressLine: text(300).nullable(), city: text(120), postcode: text(20).nullable() }))
    .max(50),
  practitioners: z
    .array(
      z.object({
        name: text(200),
        role: text(120),
        qualifications: z.array(text(300)).max(30),
        yearsOfExperience: z.number().int().min(0).max(80).nullable(),
        languages: z.array(text(60)).max(20),
      }),
    )
    .max(50),
  services: z.array(z.object({ name: text(200), description: text(600).nullable() })).max(30),
});

export type VendorDraft = z.infer<typeof vendorDraftSchema>;

export type PageContent = { url: string | null; text: string; links: string[] };

/** Enough for a provider's home or "about" page; keeps the prompt small. */
export const MAX_PAGE_TEXT = 20_000;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", copy: "©" };

function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " ";
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** Page HTML (or pasted plain text) → readable lines plus the absolute links on it. */
export function readPage(input: string, pageUrl: string | null): PageContent {
  const isHtml = /<(html|body|div|p|h[1-6]|a|meta|section|ul|li)\b/i.test(input);
  if (!isHtml) {
    const text = input.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
    return { url: pageUrl, text: text.slice(0, MAX_PAGE_TEXT), links: [...new Set(text.match(/https?:\/\/[^\s"'<>)]+/gi) ?? [])] };
  }
  const links = [...input.matchAll(/href\s*=\s*["']([^"']+)["']/gi)]
    .map((m) => decodeEntities(m[1]).trim())
    .filter((h) => /^https?:\/\//i.test(h));
  const meta = input.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1];
  const body = decodeEntities(
    input
      .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/header|\/footer|\/address|\/dd|\/dt)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
  const lines = [meta ? decodeEntities(meta) : "", ...body.split("\n")]
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return { url: pageUrl, text: [...new Set(lines)].join("\n").slice(0, MAX_PAGE_TEXT), links: [...new Set(links)] };
}

// --- deterministic extraction (the fake provider) ------------------------------

const KERALA_CITIES = [
  "Kochi", "Cochin", "Ernakulam", "Thiruvananthapuram", "Trivandrum", "Kozhikode", "Calicut", "Thrissur",
  "Kollam", "Alappuzha", "Alleppey", "Kottayam", "Kannur", "Palakkad", "Malappuram", "Munnar", "Kumarakom",
  "Varkala", "Kovalam", "Wayanad", "Idukki", "Pathanamthitta", "Kasaragod", "Thekkady", "Fort Kochi",
];

/** Accreditations and classifications clients ask about, as they read on a profile. */
const ACCREDITATIONS: { pattern: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { pattern: /\bNABH\b/, label: () => "NABH" },
  { pattern: /\bNABL\b/, label: () => "NABL" },
  { pattern: /\bJCI\b|Joint Commission International/i, label: () => "JCI" },
  { pattern: /\bISO\s?(\d{4,5}(?::\d{4})?)/, label: (m) => `ISO ${m[1]}` },
  { pattern: /\bAYUSH\b/, label: () => "AYUSH" },
  // Kerala Tourism's classification of Ayurveda centres.
  { pattern: /\bGreen Leaf\b/i, label: () => "Kerala Tourism Green Leaf" },
  { pattern: /\bOlive Leaf\b/i, label: () => "Kerala Tourism Olive Leaf" },
];

const LANGUAGES = ["English", "Malayalam", "Hindi", "Tamil", "German", "French", "Arabic", "Russian", "Italian", "Spanish", "Dutch", "Slovenian"];
const QUALIFICATIONS = /\b(MBBS|MD|MS|DNB|BAMS|FRCP|MRCP|FRCS|PhD|DM)\b/g;
const SOCIAL = /\/\/(www\.)?(instagram\.com|facebook\.com|youtube\.com|linkedin\.com|x\.com|twitter\.com)\//i;
const PIN = /\b6\d{5}\b/; // Kerala PIN codes start with 6.

const cityIn = (line: string) => KERALA_CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(line)) ?? null;

/** The street part of an address: city and PIN have their own fields, so they come off the end. */
function streetPart(line: string, city: string | null): string | null {
  let street = line.replace(/^[a-z ]{2,20}:\s*/i, "").replace(PIN, "").replace(/[,\s]+$/, "");
  if (city) street = street.replace(new RegExp(`[,\\s]*\\b${city}$`, "i"), "");
  return street.trim().slice(0, 300) || null;
}

/** Lines under the first heading matching `heading`, until a blank-ish break or another heading. */
function section(lines: string[], heading: RegExp, take: (line: string) => boolean): string[] {
  const start = lines.findIndex((l) => l.length < 60 && heading.test(l));
  if (start === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!take(line)) break;
    out.push(line);
  }
  return out;
}

export function heuristicVendorDraft(page: PageContent): VendorDraft {
  const lines = page.text.split("\n");
  const all = page.text;

  const branchLines = section(lines, /^(our )?(branches|locations|centres|centers|clinics)\b/i, (l) => cityIn(l) !== null).slice(0, 50);
  const branches = branchLines.map((line) => {
    const [head, ...rest] = line.split(/\s+[—–-]\s+/);
    return {
      name: head.trim().slice(0, 200),
      addressLine: rest.length ? streetPart(rest.join(" - "), cityIn(line)) : null,
      city: cityIn(line)!,
      postcode: line.match(PIN)?.[0] ?? null,
    };
  });

  const hq = lines.find((l) => PIN.test(l) && cityIn(l) && !branchLines.includes(l)) ?? null;

  const practitioners = [...new Map(
    lines
      .flatMap((line) =>
        [...line.matchAll(/\bDr\.?\s+([A-Z][a-zA-Z.'-]*(?:\s+[A-Z][a-zA-Z.'-]*){0,3})/g)].map((m) => ({ line, name: `Dr. ${m[1].replace(/\.$/, "")}` })),
      )
      .map(({ line, name }) => {
        const role = line.match(/\b(chief medical officer|senior physician|physician|cardiologist|radiologist|ayurveda physician|ayurvedic physician|consultant|dermatologist|orthopaedic surgeon|dentist|gynaecologist)\b/i)?.[1];
        const years = line.match(/(\d{1,2})\+?\s+years/i)?.[1];
        return [
          name,
          {
            name,
            role: role ? role[0].toUpperCase() + role.slice(1).toLowerCase() : "Doctor",
            qualifications: [...new Set(line.match(QUALIFICATIONS) ?? [])],
            yearsOfExperience: years ? Number(years) : null,
            languages: LANGUAGES.filter((lang) => new RegExp(`\\b${lang}\\b`).test(line)),
          },
        ] as [string, VendorDraft["practitioners"][number]];
      }),
  ).values()].slice(0, 50);

  const services = section(
    lines,
    /^(our )?(services|treatments|programmes|programs|packages|what we offer|experiences)\b/i,
    (l) => l.length <= 120 && !/\bDr\.?\s/.test(l) && !/^(our )?(branches|locations|team|doctors|contact|about)\b/i.test(l),
  )
    .slice(0, 12)
    .map((line) => {
      const [name, ...rest] = line.split(/\s+[—–-]\s+|:\s+/);
      return { name: name.trim().slice(0, 200), description: rest.length ? rest.join(" - ").trim().slice(0, 600) : null };
    });

  const description = lines.find((l) => l.length >= 60 && l.length <= 600 && !PIN.test(l) && !/@|\+?\d[\d\s().-]{8,}\d/.test(l)) ?? null;
  const established = all.match(/\b(?:established|founded|since|est\.?)\s*(?:in\s*)?((?:18|19|20)\d{2})\b/i)?.[1];
  const staff = all.match(/\b(\d{1,5})\+?\s+(?:staff|employees|team members|people on our team)\b/i)?.[1];

  return {
    description,
    phone: all.match(/\+?\d[\d\s().-]{8,16}\d/)?.[0].trim() ?? null,
    email: all.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)?.[0] ?? null,
    hqLine: hq ? streetPart(hq, cityIn(hq)) : null,
    hqCity: hq ? cityIn(hq) : null,
    hqPostcode: hq?.match(PIN)?.[0] ?? null,
    hqCountry: hq ? "India" : null,
    socialLinks: page.links.filter((l) => SOCIAL.test(l)).slice(0, 10),
    accreditations: [...new Set(ACCREDITATIONS.map((a) => all.match(a.pattern)).flatMap((m, i) => (m ? [ACCREDITATIONS[i].label(m)] : [])))],
    languages: LANGUAGES.filter((lang) => new RegExp(`\\b${lang}\\b`).test(all)),
    yearEstablished: established ? Number(established) : null,
    staffCount: staff ? Number(staff) : null,
    equipment: [],
    owners: [],
    branches,
    practitioners,
    services,
  };
}

// --- draft → suggestions -------------------------------------------------------

export type CurrentVendor = {
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hqLine: string | null;
  hqCity: string | null;
  hqPostcode: string | null;
  hqCountry: string | null;
  socialLinks: string[];
  accreditations: string[];
  languages: string[];
  yearEstablished: number | null;
  staffCount: number | null;
  equipment: string[];
  owners: string[];
  branches: { name: string }[];
  practitioners: { name: string }[];
};

/** Vendor fields a draft can fill, in the order the profile form shows them. */
export const DRAFT_FIELDS = [
  { key: "description", label: "Description", list: false },
  { key: "phone", label: "Phone", list: false },
  { key: "email", label: "Email", list: false },
  { key: "website", label: "Website", list: false },
  { key: "hqLine", label: "HQ address", list: false },
  { key: "hqCity", label: "HQ city", list: false },
  { key: "hqPostcode", label: "HQ postcode", list: false },
  { key: "hqCountry", label: "HQ country", list: false },
  { key: "socialLinks", label: "Social links", list: true },
  { key: "accreditations", label: "Accreditations", list: true },
  { key: "languages", label: "Languages", list: true },
  { key: "yearEstablished", label: "Year established", list: false },
  { key: "staffCount", label: "Staff count", list: false },
  { key: "equipment", label: "Equipment", list: true },
  { key: "owners", label: "Owners", list: true },
] as const;

export type DraftFieldKey = (typeof DRAFT_FIELDS)[number]["key"];

export type FieldSuggestion = {
  field: DraftFieldKey;
  label: string;
  list: boolean;
  /** Form values: lists are one entry per line, as on the profile form. */
  current: string;
  suggested: string;
  /** True when accepting it would replace something a person entered; such rows start unticked. */
  replaces: boolean;
};

/** Form-shaped (strings) so the apply step parses them with the existing branch / practitioner schemas. */
export type BranchSuggestion = { name: string; addressLine: string; city: string; postcode: string; country: string };
export type PractitionerSuggestion = { name: string; role: string; qualifications: string; yearsOfExperience: string; languages: string };

export type VendorSuggestions = {
  fields: FieldSuggestion[];
  branches: BranchSuggestion[];
  practitioners: PractitionerSuggestion[];
  /** Not created from here: a component needs a catalogue, duration and price a page rarely states. */
  services: { name: string; description: string | null }[];
  /** Passages left out because they read like a health claim. */
  withheld: number;
};

const norm = (s: string) => s.trim().toLowerCase();

function mergeList(current: string[], extra: string[]): string[] {
  const seen = new Set(current.map(norm));
  const out = [...current];
  for (const item of extra) {
    if (!seen.has(norm(item))) {
      seen.add(norm(item));
      out.push(item.trim());
    }
  }
  return out;
}

export function buildSuggestions(current: CurrentVendor, draft: VendorDraft, sourceUrl: string | null): VendorSuggestions {
  let withheld = 0;
  const clean = (s: string | null) => {
    if (s && findMedicalClaims(s).length > 0) {
      withheld += 1;
      return null;
    }
    return s;
  };

  const proposed: Record<DraftFieldKey, string | number | string[] | null> = {
    ...draft,
    description: clean(draft.description),
    accreditations: draft.accreditations.filter((a) => clean(a) !== null),
    equipment: draft.equipment.filter((e) => clean(e) !== null),
    website: sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null,
  };

  const fields: FieldSuggestion[] = [];
  for (const { key, label, list } of DRAFT_FIELDS) {
    const now = current[key];
    const next = proposed[key];
    if (list) {
      const merged = mergeList(now as string[], (next as string[]) ?? []);
      if (merged.length === (now as string[]).length) continue;
      fields.push({ field: key, label, list, current: (now as string[]).join("\n"), suggested: merged.join("\n"), replaces: false });
    } else {
      if (next === null || next === undefined || String(next).trim() === "") continue;
      const nowText = now === null ? "" : String(now);
      if (norm(nowText) === norm(String(next))) continue;
      fields.push({ field: key, label, list, current: nowText, suggested: String(next), replaces: nowText.trim() !== "" });
    }
  }

  const branchNames = new Set(current.branches.map((b) => norm(b.name)));
  const branches = draft.branches
    .filter((b) => !branchNames.has(norm(b.name)) && (branchNames.add(norm(b.name)), true))
    .map((b) => ({ name: b.name, addressLine: b.addressLine ?? "", city: b.city, postcode: b.postcode ?? "", country: "India" }));

  const practitionerNames = new Set(current.practitioners.map((p) => norm(p.name)));
  const practitioners = draft.practitioners
    .filter((p) => !practitionerNames.has(norm(p.name)) && (practitionerNames.add(norm(p.name)), true))
    .map((p) => ({
      name: p.name,
      role: p.role,
      qualifications: p.qualifications.join("\n"),
      yearsOfExperience: p.yearsOfExperience === null ? "" : String(p.yearsOfExperience),
      languages: p.languages.join("\n"),
    }));

  // A service sold with a claim is left out whole: its name alone would still advertise the promise.
  const services = draft.services.filter((s) => clean(`${s.name} ${s.description ?? ""}`) !== null);

  return { fields, branches, practitioners, services, withheld };
}
