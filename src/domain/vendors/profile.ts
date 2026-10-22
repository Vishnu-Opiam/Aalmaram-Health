/**
 * Vendor profile rules.
 *
 * The profile answers the questions a client asks about a provider (product
 * notebook §6.1): who they are, how long they have been doing it, what they use,
 * which languages they speak, where they are. Profiles are filled gradually
 * (scraped, then completed by hand), so the admin needs a plain list of what is
 * still missing rather than a score.
 */

export type VendorProfileFields = {
  description: string | null;
  phone: string | null;
  hqCity: string | null;
  website: string | null;
  socialLinks: string[];
  accreditations: string[];
  languages: string[];
  yearEstablished: number | null;
  staffCount: number | null;
  equipment: string[];
  owners: string[];
};

const CHECKLIST: { label: string; filled: (v: VendorProfileFields) => boolean }[] = [
  { label: "Description", filled: (v) => Boolean(v.description?.trim()) },
  { label: "Phone", filled: (v) => Boolean(v.phone?.trim()) },
  { label: "HQ address", filled: (v) => Boolean(v.hqCity?.trim()) },
  { label: "Website", filled: (v) => Boolean(v.website?.trim()) },
  { label: "Social links", filled: (v) => v.socialLinks.length > 0 },
  { label: "Accreditations", filled: (v) => v.accreditations.length > 0 },
  { label: "Languages", filled: (v) => v.languages.length > 0 },
  { label: "Year established", filled: (v) => v.yearEstablished !== null },
  { label: "Staff count", filled: (v) => v.staffCount !== null },
  { label: "Equipment", filled: (v) => v.equipment.length > 0 },
  { label: "Owners", filled: (v) => v.owners.length > 0 },
];

/** Labels of the profile fields still empty, in checklist order. */
export function missingProfileFields(vendor: VendorProfileFields): string[] {
  return CHECKLIST.filter((item) => !item.filled(vendor)).map((item) => item.label);
}

export const PRICE_UNIT_LABELS = {
  PER_PERSON: "per person",
  FOR_TWO: "for two",
  PER_GROUP: "per group",
} as const;

export type PriceUnit = keyof typeof PRICE_UNIT_LABELS;

/** "45 min", "2 h", "1 h 30 min", "3 days". */
export function formatDuration(minutes: number): string {
  if (minutes >= 24 * 60 && minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Practitioners of a component must work for that component's vendor. */
export function practitionersBelongToVendor(
  vendorId: string,
  practitioners: { id: string; vendorId: string }[],
): boolean {
  return practitioners.every((p) => p.vendorId === vendorId);
}
