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

// --- auth ------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

// --- vendor ----------------------------------------------------------------

export const vendorSchema = z.object({
  name: requiredText("Vendor name"),
  contactName: optionalText(200),
  email: optionalEmail,
  phone: optionalText(50),
  location: optionalText(200),
  accreditation: optionalText(500),
  status: recordStatus.default("ACTIVE"),
  notes: optionalText(2000),
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
  unit: requiredText("Unit", 60),
  costStatus: z.enum(["ESTIMATED", "CONFIRMED", "ON_REQUEST"]).default("ESTIMATED"),
  clientFacingDescription: requiredText("Client-facing description", 4000),
  whatsIncluded: optionalText(4000),
  clientDeliverable: optionalText(2000),
  source: optionalText(500),
  sourceDate: optionalDate,
  status: recordStatus.default("ACTIVE"),
});

// --- client ----------------------------------------------------------------

export const clientSchema = z
  .object({
    name: requiredText("Client name"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    phone: optionalText(50),
    country: optionalText(100),
    status: z
      .enum(["LEAD", "INTAKE", "PLANNING", "PROPOSAL_SENT", "CONFIRMED", "ARCHIVED"])
      .default("LEAD"),
    tripStartDate: optionalDate,
    tripEndDate: optionalDate,
    healthInterests: optionalText(2000),
    wellnessInterests: optionalText(2000),
    culturalInterests: optionalText(2000),
    intakeNotes: optionalText(4000),
    generalPreferences: optionalText(2000),
  })
  .refine(
    (data) =>
      !data.tripStartDate ||
      !data.tripEndDate ||
      data.tripEndDate >= data.tripStartDate,
    {
      message: "The trip end date must be on or after the start date.",
      path: ["tripEndDate"],
    },
  );

// --- itinerary -------------------------------------------------------------

export const itineraryCreateSchema = z
  .object({
    clientId: requiredText("Client"),
    title: requiredText("Itinerary title", 200),
    startDate: optionalDate,
    endDate: optionalDate,
    adminNotes: optionalText(4000),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    { message: "The end date must be on or after the start date.", path: ["endDate"] },
  );

export const itineraryUpdateSchema = z
  .object({
    itineraryId: requiredText("Itinerary"),
    title: requiredText("Itinerary title", 200),
    startDate: optionalDate,
    endDate: optionalDate,
    adminNotes: optionalText(4000),
    clientNotes: optionalText(4000),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    { message: "The end date must be on or after the start date.", path: ["endDate"] },
  );

export const itineraryItemAddSchema = z.object({
  itineraryId: requiredText("Itinerary"),
  componentId: requiredText("Component"),
  scheduledDate: optionalDate,
});

export const itineraryItemUpdateSchema = z.object({
  itemId: requiredText("Itinerary item"),
  scheduledDate: optionalDate,
  customTitle: optionalText(200),
  clientFacingNotes: optionalText(2000),
  internalNotes: optionalText(2000),
  priceOverride: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v))
    .refine(
      (v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      "Enter a non-negative number, or leave blank to use the component price.",
    ),
  status: z.enum(["PLANNED", "CONFIRMED", "REMOVED"]).default("PLANNED"),
});

export const itineraryItemMoveSchema = z.object({
  itemId: requiredText("Itinerary item"),
  direction: z.enum(["up", "down"]),
});

export const itineraryStatusSchema = z.object({
  itineraryId: requiredText("Itinerary"),
  status: z.enum([
    "DRAFT",
    "READY_FOR_REVIEW",
    "PUBLISHED",
    "CHANGES_REQUESTED",
    "APPROVED",
    "ARCHIVED",
  ]),
});

// --- report ----------------------------------------------------------------

export const reportSaveSchema = z.object({
  itineraryId: requiredText("Itinerary"),
  title: requiredText("Report title", 200),
  content: requiredText("Report content", 100_000),
});

// --- client portal ---------------------------------------------------------

export const changeRequestSchema = z.object({
  itineraryId: requiredText("Itinerary"),
  itineraryItemId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined || v === "GENERAL" ? null : v)),
  message: z
    .string()
    .trim()
    .min(10, "Please tell us a little more - at least 10 characters.")
    .max(4000, "Please keep your message under 4000 characters."),
});

export const approvalSchema = z.object({
  itineraryId: requiredText("Itinerary"),
});

export const changeRequestResolveSchema = z.object({
  changeRequestId: requiredText("Change request"),
});

export const portalSignInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export type VendorInput = z.infer<typeof vendorSchema>;
export type ModuleInput = z.infer<typeof moduleSchema>;
export type CatalogueInput = z.infer<typeof catalogueSchema>;
export type ComponentInput = z.infer<typeof componentSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
