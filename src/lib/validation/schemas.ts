import { z } from "zod";

/**
 * Server-boundary validation.
 *
 * Every Server Action parses its raw FormData through one of these schemas
 * before touching the database. Client-side attributes (required, min, type)
 * exist only to make the form pleasant - they are never trusted.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const requiredText = (label: string, max = 200) =>
  trimmed(max).min(1, `${label} is required.`);

const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v))
  .refine(
    (v) => v === null || z.string().email().safeParse(v).success,
    "Enter a valid email address.",
  );

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v))
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Use the date picker to choose a valid date.",
  );

const recordStatus = z.enum(["ACTIVE", "INACTIVE"]);

/** A textarea with one entry per line, stored as a string array. */
const lineList = (maxItems = 30, maxLength = 300) =>
  z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .refine((list) => list.length <= maxItems, `Please keep this to ${maxItems} lines or fewer.`)
    .refine(
      (list) => list.every((line) => line.length <= maxLength),
      `Please keep each line under ${maxLength} characters.`,
    );

const optionalInt = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v)))
    .refine(
      (v) => v === null || (Number.isInteger(v) && v >= min && v <= max),
      `${label} must be a whole number between ${min} and ${max}.`,
    );

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v))
  .refine(
    (v) => v === null || /^https?:\/\/\S+$/i.test(v),
    "Enter a full web address starting with https://",
  );

// --- auth ------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

// --- vendor ----------------------------------------------------------------

export const vendorSchema = z.object({
  name: requiredText("Vendor name"),
  description: optionalText(4000),
  contactName: optionalText(200),
  email: optionalEmail,
  // The diagram makes phone mandatory; the column stays nullable for older rows.
  phone: requiredText("Phone", 50),
  hqLine: optionalText(300),
  hqCity: optionalText(120),
  hqPostcode: optionalText(20),
  hqCountry: optionalText(100),
  website: optionalUrl,
  socialLinks: lineList(10, 500).refine(
    (list) => list.every((url) => /^https?:\/\/\S+$/i.test(url)),
    "Each social link must be a full web address starting with https://",
  ),
  accreditations: lineList(),
  languages: lineList(20, 60),
  yearEstablished: optionalInt("Year established", 1800, 2100),
  staffCount: optionalInt("Staff count", 0, 1_000_000),
  equipment: lineList(),
  owners: lineList(10, 200),
  status: recordStatus.default("ACTIVE"),
  notes: optionalText(2000),
});

// --- branch / practitioner ---------------------------------------------------

export const branchSchema = z.object({
  vendorId: requiredText("Vendor"),
  name: requiredText("Branch name", 200),
  addressLine: optionalText(300),
  city: requiredText("City", 120),
  postcode: optionalText(20),
  country: requiredText("Country", 100),
  status: recordStatus.default("ACTIVE"),
});

export const practitionerSchema = z.object({
  vendorId: requiredText("Vendor"),
  name: requiredText("Name", 200),
  role: requiredText("Role", 120),
  qualifications: lineList(),
  achievements: lineList(),
  yearsOfExperience: optionalInt("Years of experience", 0, 80),
  languages: lineList(20, 60),
  status: recordStatus.default("ACTIVE"),
});

// --- module ----------------------------------------------------------------

export const moduleSchema = z.object({
  name: requiredText("Module name", 120),
  description: optionalText(1000),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: recordStatus.default("ACTIVE"),
});

// --- catalogue -------------------------------------------------------------

export const catalogueSchema = z.object({
  moduleId: requiredText("Parent module"),
  name: requiredText("Catalogue name", 120),
  description: optionalText(1000),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: recordStatus.default("ACTIVE"),
});

// --- component -------------------------------------------------------------

export const componentSchema = z.object({
  vendorId: requiredText("Vendor"),
  catalogueId: requiredText("Catalogue"),
  name: requiredText("Component name", 200),
  tags: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 20),
    ),
  price: z.coerce
    .number({ message: "Enter a price." })
    .min(0, "Price cannot be negative.")
    .max(1_000_000, "Price looks unrealistically high."),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Use a 3-letter currency code, for example EUR.")
    .default("EUR"),
  priceUnit: z.enum(["PER_PERSON", "FOR_TWO", "PER_GROUP"]).default("PER_PERSON"),
  durationMinutes: z.coerce
    .number({ message: "Enter the duration in minutes." })
    .int("Enter whole minutes.")
    .min(5, "A component takes at least 5 minutes.")
    .max(24 * 60 * 14, "Durations over two weeks are not supported."),
  recoveryTimeMinutes: optionalInt("Recovery time", 0, 24 * 60 * 30),
  costStatus: z.enum(["ESTIMATED", "CONFIRMED", "ON_REQUEST"]).default("ESTIMATED"),
  clientFacingDescription: requiredText("Client-facing description", 4000),
  whatsIncluded: optionalText(4000),
  clientDeliverable: optionalText(2000),
  source: optionalText(500),
  sourceDate: optionalDate,
  status: recordStatus.default("ACTIVE"),
});

// --- client ----------------------------------------------------------------

export const clientSchema = z.object({
  name: requiredText("Client name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: optionalText(50),
  dateOfBirth: optionalDate,
  addressLine: optionalText(300),
  city: optionalText(120),
  postcode: optionalText(20),
  country: optionalText(100),
  status: z
    .enum(["LEAD", "INTAKE", "PLANNING", "PROPOSAL_SENT", "CONFIRMED", "ARCHIVED"])
    .default("LEAD"),
  relationshipManagerId: optionalText(60),
  generalPreferences: optionalText(2000),
});

// --- trip ------------------------------------------------------------------

const requiredDate = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Choose the ${label}.`);

export const tripSchema = z
  .object({
    name: requiredText("Trip name", 200),
    startDate: requiredDate("start date"),
    endDate: requiredDate("end date"),
    travellers: z.coerce
      .number({ message: "Enter the number of travellers." })
      .int("Enter a whole number.")
      .min(1, "At least one traveller.")
      .max(20, "Groups over 20 are arranged by hand."),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "The end date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine(
    (data) =>
      (Date.parse(data.endDate) - Date.parse(data.startDate)) / 86_400_000 < 60,
    { message: "Trips are planned up to 60 days.", path: ["endDate"] },
  );

export const tripCreateSchema = z.object({ clientId: requiredText("Client") }).and(tripSchema);

export const requirementsSchema = z.object({
  summary: requiredText("Summary", 4000),
  budgetAmount: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v))
    .refine(
      (v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      "Enter a non-negative amount, or leave blank.",
    ),
  budgetCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v))
    .refine((v) => v === null || /^[A-Z]{3}$/.test(v), "Use a 3-letter currency code."),
  pace: z
    .enum(["", "RELAXED", "BALANCED", "PACKED"])
    .optional()
    .transform((v) => (v ? v : null)),
  mustHaves: lineList(20, 200),
  avoid: lineList(20, 200),
});

export const conversationSchema = z.object({
  channel: z.enum(["AI_CHAT", "STAFF_CHAT", "CALL", "EMAIL", "WHATSAPP", "IN_PERSON"]),
  occurredAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose when the conversation happened."),
  transcript: requiredText("Transcript", 100_000),
  summary: optionalText(4000),
});

// --- itinerary blocks ------------------------------------------------------

const blockTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a start time.");

export const blockAddSchema = z.object({
  tripId: requiredText("Trip"),
  componentId: requiredText("Component"),
  branchId: optionalText(60),
  day: requiredDate("day"),
  time: blockTime,
});

export const blockMoveSchema = z.object({
  blockId: requiredText("Block"),
  day: requiredDate("day"),
  time: blockTime,
  branchId: optionalText(60),
});

export const blockRemoveSchema = z.object({
  blockId: requiredText("Block"),
});

export const itineraryNotesSchema = z.object({
  adminNotes: optionalText(4000),
  clientNotes: optionalText(4000),
});

// --- feed ------------------------------------------------------------------

const feedSource = z.enum(["VENDOR_INSTAGRAM", "KERALA_TOURISM", "NEWS"]);
const requiredUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(500)
    .refine((v) => /^https?:\/\/\S+$/i.test(v), `${label} must be a full web address starting with https://`);

export const feedPostSchema = z.object({
  source: feedSource,
  vendorId: optionalText(60),
  caption: requiredText("Caption", 2000),
  mediaUrl: optionalUrl,
  link: requiredUrl("Link"),
  publishedAt: requiredDate("date"),
});

/** One element of a pasted JSON import. Vendors are matched by exact name. */
export const feedImportItemSchema = z.object({
  source: feedSource,
  caption: z.string().trim().min(1).max(2000),
  link: requiredUrl("link"),
  mediaUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => /^https?:\/\/\S+$/i.test(v), "mediaUrl must be a full web address")
    .optional(),
  publishedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "publishedAt must be a date"),
  externalId: z.string().trim().min(1).max(200).optional(),
  vendorName: z.string().trim().max(200).optional(),
});

// --- report ----------------------------------------------------------------

export const reportSaveSchema = z.object({
  tripId: requiredText("Trip"),
  title: requiredText("Report title", 200),
  content: requiredText("Report content", 100_000),
});

// --- client portal ---------------------------------------------------------

export const chatMessageSchema = z.object({
  tripId: requiredText("Trip"),
  text: z
    .string()
    .trim()
    .min(1, "Please write a message.")
    .max(2000, "Please keep messages under 2000 characters."),
});

export const portalSignInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export type BranchInput = z.infer<typeof branchSchema>;
export type PractitionerInput = z.infer<typeof practitionerSchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
export type ModuleInput = z.infer<typeof moduleSchema>;
export type CatalogueInput = z.infer<typeof catalogueSchema>;
export type ComponentInput = z.infer<typeof componentSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
